import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { ConfigService } from '@nestjs/config';

interface QueueStats {
  queueSize: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  oldestJob: Date | null;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private readonly maxQueueSize: number;

  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    private configService: ConfigService,
  ) {
    this.maxQueueSize = this.configService.get<number>('MAX_QUEUE_SIZE', 1000);
  }

  /**
   * Add a job to the queue
   */
  async addJob(job: Job): Promise<void> {
    // Check queue size
    const queueSize = await this.getQueueSize();
    if (queueSize >= this.maxQueueSize) {
      this.logger.warn(`Queue is full (size: ${queueSize}), dropping job ${job.id}`);
      return;
    }

    // Update job status if not already queued
    if (job.status !== JobStatus.QUEUED) {
      job.status = JobStatus.QUEUED;
      await this.jobRepository.save(job);
    }

    this.logger.debug(`Added job ${job.id} to queue (priority: ${job.priority})`);
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(jobId: string): Promise<void> {
    // Find the job
    const job = await this.jobRepository.findOneBy({
      id: jobId,
      status: JobStatus.QUEUED,
    });

    if (!job) {
      return;
    }

    // Mark as canceled
    job.status = JobStatus.CANCELED;
    await this.jobRepository.save(job);

    this.logger.debug(`Removed job ${jobId} from queue`);
  }

  /**
   * Get jobs for a node
   */
  async getJobsForNode(
    nodeId: string,
    capacity: number,
    capabilities: string[],
  ): Promise<string[]> {
    if (capacity <= 0) {
      return [];
    }

    // Find jobs that match the capabilities, ordered by priority
    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: JobStatus.QUEUED })
      .andWhere('job.type IN (:...capabilities)', { capabilities })
      .orderBy('job.priority', 'DESC')
      .addOrderBy('job.createdAt', 'ASC')
      .take(capacity)
      .getMany();

    return jobs.map(job => job.id);
  }

  /**
   * Get current queue size
   */
  async getQueueSize(): Promise<number> {
    return this.jobRepository.count({
      where: { status: JobStatus.QUEUED },
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    // Get queue size
    const queueSize = await this.getQueueSize();

    // Get priority breakdowns
    const highPriority = await this.jobRepository.count({
      where: {
        status: JobStatus.QUEUED,
        priority: In([8, 9, 10]),
      },
    });

    const mediumPriority = await this.jobRepository.count({
      where: {
        status: JobStatus.QUEUED,
        priority: In([4, 5, 6, 7]),
      },
    });

    const lowPriority = await this.jobRepository.count({
      where: {
        status: JobStatus.QUEUED,
        priority: In([1, 2, 3]),
      },
    });

    // Get oldest job timestamp
    const oldestJob = await this.jobRepository.findOne({
      where: { status: JobStatus.QUEUED },
      order: { createdAt: 'ASC' },
      select: ['createdAt'],
    });

    return {
      queueSize,
      highPriority,
      mediumPriority,
      lowPriority,
      oldestJob: oldestJob?.createdAt || null,
    };
  }

  /**
   * Check for stalled jobs
   */
  async checkStalledJobs(): Promise<number> {
    // Calculate cutoff time (jobs that have been processing for longer than their timeout)
    const now = new Date();
    
    // Find jobs that should have timed out
    const stalledJobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.status IN (:...statuses)', {
        statuses: [JobStatus.ASSIGNED, JobStatus.PROCESSING],
      })
      .andWhere('job.startedAt IS NOT NULL')
      .andWhere(
        'job.startedAt < CURRENT_TIMESTAMP - (job.timeoutSeconds || \' seconds\')::interval',
      )
      .getMany();

    this.logger.debug(`Found ${stalledJobs.length} stalled jobs`);
    return stalledJobs.length;
  }
}