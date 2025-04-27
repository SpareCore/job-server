import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { Job, JobStatus, JobType } from './entities/job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { JobResultDto, JobResultStatus } from './dto/job-result.dto';
import { NodesService } from '../nodes/nodes.service';
import { QueueService } from '../queue/queue.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    private nodesService: NodesService,
    private queueService: QueueService,
    private websocketGateway: WebsocketGateway,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new job
   */
  async create(createJobDto: CreateJobDto, submittedBy: string): Promise<Job> {
    // Create new job entity
    const job = this.jobRepository.create({
      id: uuidv4(),
      type: createJobDto.job_type,
      priority: createJobDto.priority || 5,
      parameters: createJobDto.parameters,
      submittedBy,
      maxRetries: createJobDto.max_retries || 3,
      timeoutSeconds: createJobDto.timeout_seconds || 3600,
      tags: createJobDto.tags || [],
      status: JobStatus.QUEUED,
    });

    // Save the job
    const savedJob = await this.jobRepository.save(job);

    // Add to queue
    await this.queueService.addJob(savedJob);

    // Notify websocket clients
    this.websocketGateway.notifyNewJob(savedJob);

    return savedJob;
  }

  /**
   * Find all jobs with optional filtering
   */
  async findAll(
    options: {
      status?: JobStatus | JobStatus[];
      type?: JobType;
      submittedBy?: string;
      tags?: string[];
      assignedToId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ jobs: Job[]; total: number }> {
    const { status, type, submittedBy, tags, assignedToId, limit = 50, offset = 0 } = options;

    // Build where conditions
    const where: FindOptionsWhere<Job> = {};

    if (status) {
      if (Array.isArray(status)) {
        where.status = In(status);
      } else {
        where.status = status;
      }
    }

    if (type) {
      where.type = type;
    }

    if (submittedBy) {
      where.submittedBy = submittedBy;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (tags && tags.length > 0) {
      where.tags = In(tags);
    }

    // Query jobs
    const [jobs, total] = await this.jobRepository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip: offset,
      relations: ['assignedTo'],
    });

    return { jobs, total };
  }

  /**
   * Find a job by ID
   */
  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['assignedTo'],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return job;
  }

  /**
   * Update job status
   */
  async updateStatus(
    id: string,
    status: JobStatus,
    updates: {
      progress?: number;
      statusMessage?: string;
      assignedToId?: string;
      startedAt?: Date;
      completedAt?: Date;
    } = {},
  ): Promise<Job> {
    const job = await this.findOne(id);

    // Update job
    job.status = status;

    if (updates.progress !== undefined) {
      job.progress = updates.progress;
    }

    if (updates.statusMessage) {
      job.statusMessage = updates.statusMessage;
    }

    if (updates.assignedToId) {
      job.assignedToId = updates.assignedToId;
    }

    if (updates.startedAt) {
      job.startedAt = updates.startedAt;
    }

    if (updates.completedAt) {
      job.completedAt = updates.completedAt;
    }

    // Save updated job
    await this.jobRepository.save(job);

    // Notify websocket clients
    this.websocketGateway.notifyJobUpdate(job);

    return job;
  }

  /**
   * Process job result
   */
  async processResult(jobResultDto: JobResultDto): Promise<Job> {
    const { job_id, node_id, status, result, error, processing_stats } = jobResultDto;

    // Find the job
    const job = await this.findOne(job_id);

    // Validate that the job is assigned to the node
    if (job.assignedToId !== node_id) {
      throw new BadRequestException(
        `Job ${job_id} is not assigned to node ${node_id}`,
      );
    }

    // Update job based on result status
    if (status === JobResultStatus.COMPLETED) {
      job.status = JobStatus.COMPLETED;
      job.result = result || {};
      job.progress = 100;
      job.completedAt = new Date();
    } else if (status === JobResultStatus.FAILED) {
      job.status = JobStatus.FAILED;
      job.error = error || { message: 'Unknown error' };
      job.completedAt = new Date();
    } else if (status === JobResultStatus.PARTIAL) {
      // Handle partial results if needed
      job.result = result || {};
    }

    // Save job update
    await this.jobRepository.save(job);

    // Update node stats
    if (status === JobResultStatus.COMPLETED || status === JobResultStatus.FAILED) {
      await this.nodesService.updateNodeJobStats(
        node_id,
        status === JobResultStatus.COMPLETED,
        processing_stats.processing_time_seconds,
      );
    }

    // Notify websocket clients
    this.websocketGateway.notifyJobResult(job);

    return job;
  }

  /**
   * Request jobs for a node
   */
  async requestJobsForNode(
    nodeId: string,
    capacity: number,
    capabilities: string[],
  ): Promise<Job[]> {
    // Get appropriate jobs from queue
    const jobIds = await this.queueService.getJobsForNode(
      nodeId,
      capacity,
      capabilities,
    );

    if (!jobIds.length) {
      return [];
    }

    // Find the jobs
    const jobs = await this.jobRepository.findBy({ id: In(jobIds) });

    // Update job status to assigned
    const now = new Date();
    const updatedJobs = await Promise.all(
      jobs.map(async (job) => {
        job.status = JobStatus.ASSIGNED;
        job.assignedToId = nodeId;
        job.startedAt = now;
        await this.jobRepository.save(job);
        this.websocketGateway.notifyJobUpdate(job);
        return job;
      }),
    );

    return updatedJobs;
  }

  /**
   * Cancel a job
   */
  async cancelJob(id: string): Promise<Job> {
    const job = await this.findOne(id);

    // Can only cancel jobs that are not completed or failed
    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot cancel job with status ${job.status}`,
      );
    }

    // Remove from queue if job is in QUEUED state
    const isQueued = job.status === JobStatus.QUEUED;
    
    // Update job status
    job.status = JobStatus.CANCELED;

    // Save updated job
    await this.jobRepository.save(job);

    // Remove from queue if needed
    if (isQueued) {
      await this.queueService.removeJob(id);
    }

    // Notify websocket clients
    this.websocketGateway.notifyJobUpdate(job);

    return job;
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(): Promise<number> {
    const retentionDays = this.configService.get<number>('JOB_RETENTION_DAYS', 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Find jobs older than retention period
    const result = await this.jobRepository
      .createQueryBuilder()
      .delete()
      .from(Job)
      .where(
        'status IN (:...statuses) AND createdAt < :cutoffDate',
        {
          statuses: [
            JobStatus.COMPLETED,
            JobStatus.FAILED,
            JobStatus.CANCELED,
          ],
          cutoffDate,
        },
      )
      .execute();

    return result.affected || 0;
  }

  /**
   * Handle job timeout
   */
  async handleJobTimeout(jobId: string): Promise<void> {
    const job = await this.findOne(jobId);

    if (
      job.status !== JobStatus.ASSIGNED &&
      job.status !== JobStatus.PROCESSING
    ) {
      return;
    }

    if (job.retryCount < job.maxRetries) {
      // Retry the job
      job.status = JobStatus.QUEUED;
      job.assignedToId = null as unknown as string;
      job.retryCount += 1;
      job.startedAt = null as unknown as Date;
      job.progress = 0;

      await this.jobRepository.save(job);

      // Add back to queue
      await this.queueService.addJob(job);
    } else {
      // Max retries reached, mark as failed
      job.status = JobStatus.FAILED;
      job.error = {
        message: `Job timed out after ${job.retryCount} attempts`,
        code: 'JOB_TIMEOUT',
      };
      job.completedAt = new Date();

      await this.jobRepository.save(job);
    }

    // Notify websocket clients
    this.websocketGateway.notifyJobUpdate(job);
  }
}