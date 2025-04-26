import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NodeResourceInfoDto {
  @ApiProperty({ description: 'Number of CPU cores' })
  @IsNotEmpty()
  cpuCores: number;

  @ApiProperty({ description: 'CPU model information' })
  @IsString()
  @IsOptional()
  cpuModel?: string;

  @ApiProperty({ description: 'Total RAM in megabytes' })
  @IsNotEmpty()
  totalMemoryMb: number;

  @ApiProperty({ description: 'Available RAM in megabytes' })
  @IsNotEmpty()
  availableMemoryMb: number;

  @ApiProperty({ description: 'Available disk space in megabytes' })
  @IsNotEmpty()
  availableDiskSpaceMb: number;

  @ApiProperty({ description: 'Operating system information' })
  @IsString()
  @IsNotEmpty()
  operatingSystem: string;
}

export class TimeWindowDto {
  @ApiProperty({
    description: 'Day of week',
    enum: [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Weekdays',
      'Weekends',
      'All',
    ],
  })
  @IsString()
  @IsNotEmpty()
  dayOfWeek: string;

  @ApiProperty({ description: 'Start time in 24-hour format (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time in 24-hour format (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  endTime: string;
}

export class TimeRestrictionsDto {
  @ApiProperty({
    description: 'Hours during which this node can process jobs',
    type: [TimeWindowDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeWindowDto)
  availableHours: TimeWindowDto[];
}

export class RegisterNodeDto {
  @ApiProperty({ description: 'Unique identifier for the node agent' })
  @IsString()
  @IsOptional() // Allow the server to generate an ID if not provided
  node_id?: string;

  @ApiProperty({ description: 'Hostname of the computer running the node agent' })
  @IsString()
  @IsNotEmpty()
  hostname: string;

  @ApiProperty({ description: 'IP address of the node agent' })
  @IsString()
  @IsOptional()
  ip_address?: string;

  @ApiProperty({ description: 'Version of the node agent software' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({
    description: 'List of job types this node can process',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  capabilities: string[];

  @ApiProperty({
    description: 'Information about available computing resources',
    type: NodeResourceInfoDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => NodeResourceInfoDto)
  resource_info: NodeResourceInfoDto;

  @ApiProperty({
    description: 'Time restrictions for job processing',
    type: TimeRestrictionsDto,
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TimeRestrictionsDto)
  @IsOptional()
  time_restrictions?: TimeRestrictionsDto;
}