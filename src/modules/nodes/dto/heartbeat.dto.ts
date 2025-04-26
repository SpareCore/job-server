import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NodeStatus } from '../entities/node.entity';

export class CurrentLoadDto {
  @ApiProperty({
    description: 'Current CPU usage percentage',
    minimum: 0,
    maximum: 100,
  })
  cpu_percent: number;

  @ApiProperty({
    description: 'Current memory usage percentage',
    minimum: 0,
    maximum: 100,
  })
  memory_percent: number;

  @ApiProperty({ description: 'Available memory in megabytes' })
  available_memory_mb: number;

  @ApiProperty({ description: 'Number of jobs currently being processed' })
  active_jobs: number;
}

export class HeartbeatDto {
  @ApiProperty({ description: 'Unique identifier for the node agent' })
  @IsUUID()
  @IsNotEmpty()
  node_id: string;

  @ApiProperty({
    description: 'Current status of the node',
    enum: NodeStatus,
  })
  @IsEnum(NodeStatus)
  @IsNotEmpty()
  status: NodeStatus;

  @ApiProperty({
    description: 'Current resource usage',
    type: CurrentLoadDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => CurrentLoadDto)
  current_load: CurrentLoadDto;
}