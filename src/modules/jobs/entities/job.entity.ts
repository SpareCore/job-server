import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Node } from '../../nodes/entities/node.entity';

export enum JobType {
  OCR = 'ocr',
  PDF_PARSE = 'pdf_parse',
}

export enum JobStatus {
  QUEUED = 'queued',
  ASSIGNED = 'assigned',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: JobType,
  })
  type: JobType;

  @Column({ type: 'int', default: 5 })
  priority: number;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.QUEUED,
  })
  @Index()
  status: JobStatus;

  @Column({ type: 'text', nullable: true })
  statusMessage: string;

  @Column({ type: 'jsonb' })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  error: Record<string, any>;

  @Column({ type: 'varchar', length: 255 })
  submittedBy: string;

  @ManyToOne(() => Node, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: Node;

  @Column({ nullable: true })
  assignedToId: string;

  @Column({ type: 'float', nullable: true })
  progress: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 3600 })
  timeoutSeconds: number;

  @Column('varchar', { array: true, default: [] })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}