import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueService } from './queue.service';
import { Job } from '../jobs/entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}