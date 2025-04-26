import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from '../jobs/entities/job.entity';
import { Node } from '../nodes/entities/node.entity';

interface ClientInfo {
  userId?: string;
  nodeId?: string;
  isAdmin?: boolean;
}

@WebSocketGateway({
  namespace: 'events',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebsocketGateway.name);
  private readonly clients = new Map<string, ClientInfo>();

  @WebSocketServer()
  server: Server;

  constructor(private configService: ConfigService) {}

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
    this.clients.set(client.id, {});
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }

  /**
   * Handle authentication
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, payload: any): void {
    const clientInfo: ClientInfo = {};

    if (payload.userId) {
      clientInfo.userId = payload.userId;
    }

    if (payload.nodeId) {
      clientInfo.nodeId = payload.nodeId;
      client.join(`node:${payload.nodeId}`);
    }

    if (payload.isAdmin) {
      clientInfo.isAdmin = true;
      client.join('admin');
    }

    this.clients.set(client.id, clientInfo);
    this.logger.debug(`Client authenticated: ${client.id} - ${JSON.stringify(clientInfo)}`);
  }

  /**
   * Handle subscription to job updates
   */
  @SubscribeMessage('subscribeToJob')
  handleSubscribeToJob(client: Socket, jobId: string): void {
    client.join(`job:${jobId}`);
    this.logger.debug(`Client ${client.id} subscribed to job ${jobId}`);
  }

  /**
   * Handle unsubscription from job updates
   */
  @SubscribeMessage('unsubscribeFromJob')
  handleUnsubscribeFromJob(client: Socket, jobId: string): void {
    client.leave(`job:${jobId}`);
    this.logger.debug(`Client ${client.id} unsubscribed from job ${jobId}`);
  }

  /**
   * Notify about a new job
   */
  notifyNewJob(job: Job): void {
    this.server.to('admin').emit('newJob', {
      id: job.id,
      type: job.type,
      priority: job.priority,
      status: job.status,
      submittedBy: job.submittedBy,
      createdAt: job.createdAt,
    });

    // Also notify the submitter
    this.server.to(`user:${job.submittedBy}`).emit('newJob', {
      id: job.id,
      type: job.type,
      priority: job.priority,
      status: job.status,
      createdAt: job.createdAt,
    });
  }

  /**
   * Notify about a job update
   */
  notifyJobUpdate(job: Job): void {
    const update = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      statusMessage: job.statusMessage,
      assignedToId: job.assignedToId,
      updatedAt: job.updatedAt,
    };

    // Broadcast to those subscribed to this job
    this.server.to(`job:${job.id}`).emit('jobUpdate', update);

    // Notify admin users
    this.server.to('admin').emit('jobUpdate', update);

    // Notify the node if assigned
    if (job.assignedToId) {
      this.server.to(`node:${job.assignedToId}`).emit('jobUpdate', update);
    }

    // Notify the submitter
    this.server.to(`user:${job.submittedBy}`).emit('jobUpdate', update);
  }

  /**
   * Notify about a job result
   */
  notifyJobResult(job: Job): void {
    const result = {
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      completedAt: job.completedAt,
    };

    // Broadcast to those subscribed to this job
    this.server.to(`job:${job.id}`).emit('jobResult', result);

    // Notify admin users
    this.server.to('admin').emit('jobResult', result);

    // Notify the submitter
    this.server.to(`user:${job.submittedBy}`).emit('jobResult', result);
  }

  /**
   * Notify about a node update
   */
  notifyNodeUpdate(node: Node): void {
    const update = {
      id: node.id,
      hostname: node.hostname,
      status: node.status,
      currentLoad: node.currentLoad,
      lastHeartbeatAt: node.lastHeartbeatAt,
    };

    // Notify admin users
    this.server.to('admin').emit('nodeUpdate', update);

    // Notify the node itself
    this.server.to(`node:${node.id}`).emit('nodeUpdate', update);
  }

  /**
   * Notify about system stats
   */
  notifySystemStats(stats: any): void {
    this.server.to('admin').emit('systemStats', stats);
  }
}