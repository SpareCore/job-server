import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum JobResultStatus {
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export class ProcessingStatsDto {
  @ApiProperty({ description: 'Total processing time in seconds' })
  processing_time_seconds: number;

  @ApiProperty({ description: 'Average CPU usage during processing' })
  @IsOptional()
  cpu_usage_percent_avg?: number;

  @ApiProperty({ description: 'Maximum memory usage during processing in MB' })
  @IsOptional()
  memory_usage_mb_max?: number;
}

export class JobResultDto {
  @ApiProperty({ description: 'Unique identifier for the job' })
  @IsUUID()
  @IsNotEmpty()
  job_id: string;

  @ApiProperty({ description: 'Unique identifier for the node agent that processed the job' })
  @IsUUID()
  @IsNotEmpty()
  node_id: string;

  @ApiProperty({
    description: 'Final status of the job',
    enum: JobResultStatus,
  })
  @IsEnum(JobResultStatus)
  @IsNotEmpty()
  status: JobResultStatus;

  @ApiProperty({
    description: 'Job-specific result data',
    type: 'object',
    additionalProperties: true
  })
  @IsObject()
  @IsOptional()
  result?: Record<string, any>;

  @ApiProperty({
    description: 'Information about where/how to access the output files',
    type: 'object',
    additionalProperties: true
  })
  @IsObject()
  @IsOptional()
  output_file_transfer?: Record<string, any>;

  @ApiProperty({
    description: 'Statistics about the job processing',
    type: ProcessingStatsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ProcessingStatsDto)
  processing_stats: ProcessingStatsDto;

  @ApiProperty({
    description: 'Error information if job status is failed',
    type: 'object',
    additionalProperties: true
  })
  @IsObject()
  @IsOptional()
  error?: {
    code?: string;
    message: string;
    details?: Record<string, any>;
  };
}