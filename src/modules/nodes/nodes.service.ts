import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Node, NodeStatus } from './entities/node.entity';
import { RegisterNodeDto } from './dto/register-node.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    private configService: ConfigService,
    private websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Register a new node
   */
  async register(registerNodeDto: RegisterNodeDto): Promise<Node> {
    const {
      node_id,
      hostname,
      ip_address,
      version,
      capabilities,
      resource_info,
      time_restrictions,
    } = registerNodeDto;

    // Check if node already exists
    let node: Node | null = null;
    
    if (node_id) {
      node = await this.nodeRepository.findOneBy({ id: node_id });
    }

    if (!node) {
      // Create new node
      node = this.nodeRepository.create({
        id: node_id || uuidv4(),
        hostname,
        ipAddress: ip_address,
        version,
        capabilities,
        resourceInfo: {
          cpuCores: resource_info.cpuCores,
          cpuModel: resource_info.cpuModel || 'Unknown',
          totalMemoryMb: resource_info.totalMemoryMb,
          availableDiskSpaceMb: resource_info.availableDiskSpaceMb,
          operatingSystem: resource_info.operatingSystem,
        },
        timeRestrictions: time_restrictions || {
          availableHours: [
            {
              dayOfWeek: 'All',
              startTime: '00:00',
              endTime: '23:59',
            },
          ],
        },
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: new Date(),
      });
    } else {
      // Update existing node
      node.hostname = hostname;
      node.ipAddress = ip_address;
      node.version = version;
      node.capabilities = capabilities;
      node.resourceInfo = {
        cpuCores: resource_info.cpuCores,
        cpuModel: resource_info.cpuModel || 'Unknown',
        totalMemoryMb: resource_info.totalMemoryMb,
        availableDiskSpaceMb: resource_info.availableDiskSpaceMb,
        operatingSystem: resource_info.operatingSystem,
      };
      
      if (time_restrictions) {
        node.timeRestrictions = time_restrictions;
      }
      
      node.status = NodeStatus.ONLINE;
      node.lastHeartbeatAt = new Date();
    }

    // Save the node
    const savedNode = await this.nodeRepository.save(node);

    // Notify websocket clients
    this.websocketGateway.notifyNodeUpdate(savedNode);

    return savedNode;
  }

  /**
   * Process heartbeat from a node
   */
  async heartbeat(heartbeatDto: HeartbeatDto): Promise<Node> {
    const { node_id, status, current_load } = heartbeatDto;

    // Find the node
    const node = await this.findOne(node_id);

    // Update node status and load
    node.status = status;
    node.currentLoad = {
      cpuPercent: current_load.cpu_percent,
      memoryPercent: current_load.memory_percent,
      availableMemoryMb: current_load.available_memory_mb,
      activeJobs: current_load.active_jobs,
    };
    node.lastHeartbeatAt = new Date();

    // Save updated node
    const updatedNode = await this.nodeRepository.save(node);

    // Notify websocket clients
    this.websocketGateway.notifyNodeUpdate(updatedNode);

    return updatedNode;
  }

  /**
   * Find all nodes
   */
  async findAll(options: {
    status?: NodeStatus | NodeStatus[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ nodes: Node[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    // Build query
    const query = this.nodeRepository.createQueryBuilder('node');

    if (status) {
      if (Array.isArray(status)) {
        query.where('node.status IN (:...statuses)', { statuses: status });
      } else {
        query.where('node.status = :status', { status });
      }
    }

    // Execute query with pagination
    const [nodes, total] = await query
      .orderBy('node.lastHeartbeatAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { nodes, total };
  }

  /**
   * Find a node by ID
   */
  async findOne(id: string): Promise<Node> {
    const node = await this.nodeRepository.findOneBy({ id });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    return node;
  }

  /**
   * Update node job statistics
   */
  async updateNodeJobStats(
    nodeId: string,
    isSuccessful: boolean,
    processingTimeSeconds: number,
  ): Promise<Node> {
    const node = await this.findOne(nodeId);

    // Update job statistics
    node.totalJobsProcessed += 1;
    
    if (!isSuccessful) {
      node.failedJobs += 1;
    }

    // Update last job completion time
    node.lastJobCompletedAt = new Date();

    // Update average processing time
    if (node.averageProcessingTimeSeconds === 0) {
      node.averageProcessingTimeSeconds = processingTimeSeconds;
    } else {
      node.averageProcessingTimeSeconds =
        (node.averageProcessingTimeSeconds * (node.totalJobsProcessed - 1) +
          processingTimeSeconds) /
        node.totalJobsProcessed;
    }

    // Save updated node
    return this.nodeRepository.save(node);
  }

  /**
   * Find nodes available for job assignment
   */
  async findAvailableNodes(capabilities: string[]): Promise<Node[]> {
    // Build query for available nodes
    const query = this.nodeRepository
      .createQueryBuilder('node')
      .where('node.status IN (:...statuses)', {
        statuses: [NodeStatus.ONLINE, NodeStatus.IDLE],
      })
      .andWhere('capabilities @> :capabilities', {
        capabilities: JSON.stringify(capabilities),
      });

    return query.getMany();
  }

  /**
   * Handle offline nodes
   */
  async handleOfflineNodes(): Promise<number> {
    const heartbeatTimeoutSeconds = this.configService.get<number>(
      'HEARTBEAT_TIMEOUT_SECONDS',
      180,
    );

    const cutoffTime = new Date();
    cutoffTime.setSeconds(cutoffTime.getSeconds() - heartbeatTimeoutSeconds);

    // Find nodes with old heartbeats
    const nodes = await this.nodeRepository.find({
      where: {
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: LessThan(cutoffTime),
      },
    });

    if (!nodes.length) {
      return 0;
    }

    // Mark nodes as offline
    for (const node of nodes) {
      node.status = NodeStatus.OFFLINE;
      await this.nodeRepository.save(node);
      this.websocketGateway.notifyNodeUpdate(node);
    }

    this.logger.warn(`Marked ${nodes.length} nodes as offline due to missed heartbeats`);
    return nodes.length;
  }
}