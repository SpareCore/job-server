import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';

export enum NodeStatus {
  ONLINE = 'online',
  BUSY = 'busy',
  IDLE = 'idle',
  OFFLINE = 'offline',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

@Entity('nodes')
export class Node {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  hostname: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  version: string;

  @Column({
    type: 'enum',
    enum: NodeStatus,
    default: NodeStatus.ONLINE,
  })
  @Index()
  status: NodeStatus;

  @Column('varchar', { array: true })
  capabilities: string[];

  @Column({ type: 'jsonb' })
  resourceInfo: {
    cpuCores: number;
    cpuModel: string;
    totalMemoryMb: number;
    availableDiskSpaceMb: number;
    operatingSystem: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  timeRestrictions: {
    availableHours: Array<{
      dayOfWeek: string;
      startTime: string;
      endTime: string;
    }>;
  };

  @Column({ type: 'jsonb', nullable: true })
  currentLoad: {
    cpuPercent: number;
    memoryPercent: number;
    availableMemoryMb: number;
    activeJobs: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastHeartbeatAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastJobCompletedAt: Date;

  @Column({ type: 'int', default: 0 })
  totalJobsProcessed: number;

  @Column({ type: 'int', default: 0 })
  failedJobs: number;

  @Column({ type: 'float', default: 0 })
  averageProcessingTimeSeconds: number;

  @OneToMany(() => Job, (job) => job.assignedTo)
  jobs: Job[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}