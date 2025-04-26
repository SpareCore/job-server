import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
} from 'class-validator';
import { JobType } from '../entities/job.entity';

export class CreateJobDto {
  @ApiProperty({
    enum: JobType,
    description: 'Type of job to create',
  })
  @IsEnum(JobType)
  @IsNotEmpty()
  job_type: JobType;

  @ApiProperty({
    description: 'Priority (1-10, with 10 being highest)',
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number = 5;

  @ApiProperty({
    description: 'Job-specific parameters',
    type: 'object',
  })
  @IsObject()
  @IsNotEmpty()
  parameters: Record<string, any>;

  @ApiProperty({
    description: 'Maximum number of retries allowed for this job',
    minimum: 0,
    default: 3,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  max_retries?: number = 3;

  @ApiProperty({
    description: 'Maximum time in seconds job is allowed to run before timing out',
    minimum: 0,
    default: 3600,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  timeout_seconds?: number = 3600;

  @ApiProperty({
    description: 'Custom tags for categorizing and filtering jobs',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];
}