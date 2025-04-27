import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  UseGuards,
  Req,
  Patch,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobResultDto } from './dto/job-result.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { JobType, JobStatus } from './entities/job.entity';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, description: 'The job has been created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  async create(@Body() createJobDto: CreateJobDto, @Req() req: any) {
    const submittedBy = req.user.id; // From AuthGuard
    return this.jobsService.create(createJobDto, submittedBy);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiResponse({ status: 200, description: 'Return all jobs.' })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus })
  @ApiQuery({ name: 'type', required: false, enum: JobType })
  @ApiQuery({ name: 'submittedBy', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Query('status') status?: JobStatus,
    @Query('type') type?: JobType,
    @Query('submittedBy') submittedBy?: string,
    @Query('tags') tags?: string[],
    @Query('assignedToId') assignedToId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Req() req?: any,
  ) {
    // If not admin, only return user's own jobs
    if (!req.user.isAdmin) {
      submittedBy = req.user.id;
    }

    return this.jobsService.findAll({
      status,
      type,
      submittedBy,
      tags,
      assignedToId,
      limit,
      offset,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiResponse({ status: 200, description: 'Return the job.' })
  @ApiResponse({ status: 404, description: 'Job not found.' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const job = await this.jobsService.findOne(id);
    
    // If not admin, check if user is the submitter
    if (!req.user.isAdmin && job.submittedBy !== req.user.id) {
      throw new Error('Not authorized to view this job');
    }
    
    return job;
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a job' })
  @ApiResponse({ status: 200, description: 'The job has been canceled.' })
  @ApiResponse({ status: 404, description: 'Job not found.' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    const job = await this.jobsService.findOne(id);
    
    // If not admin, check if user is the submitter
    if (!req.user.isAdmin && job.submittedBy !== req.user.id) {
      throw new Error('Not authorized to cancel this job');
    }
    
    return this.jobsService.cancelJob(id);
  }

  @Post(':id/result')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit job result from a node' })
  @ApiResponse({ status: 200, description: 'The result has been processed.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async submitResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() jobResultDto: JobResultDto,
  ) {
    // Validate that the job ID in the path matches the one in the body
    if (id !== jobResultDto.job_id) {
      throw new Error('Job ID mismatch');
    }
    
    return this.jobsService.processResult(jobResultDto);
  }

  @Post('request')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request jobs for a node' })
  @ApiResponse({ status: 200, description: 'Jobs assigned to the node.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  async requestJobs(
    @Body(ValidationPipe) requestDto: {
      node_id: string;
      capacity: number;
      capabilities: string[];
    },
  ) {
    const jobs = await this.jobsService.requestJobsForNode(
      requestDto.node_id,
      requestDto.capacity,
      requestDto.capabilities,
    );
    
    return { jobs };
  }
}