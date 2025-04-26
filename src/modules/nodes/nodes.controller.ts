import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NodesService } from './nodes.service';
import { RegisterNodeDto } from './dto/register-node.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { NodeStatus } from './entities/node.entity';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new node' })
  @ApiResponse({ status: 201, description: 'The node has been registered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  async register(@Body() registerNodeDto: RegisterNodeDto) {
    return this.nodesService.register(registerNodeDto);
  }

  @Post(':id/heartbeat')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a heartbeat from a node' })
  @ApiResponse({ status: 200, description: 'Heartbeat processed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  @ApiParam({ name: 'id', description: 'Node ID' })
  async heartbeat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() heartbeatDto: HeartbeatDto,
  ) {
    // Validate that the node ID in the path matches the one in the body
    if (id !== heartbeatDto.node_id) {
      throw new Error('Node ID mismatch');
    }
    
    return this.nodesService.heartbeat(heartbeatDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all nodes' })
  @ApiResponse({ status: 200, description: 'Return all nodes.' })
  @ApiQuery({ name: 'status', required: false, enum: NodeStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Query('status') status?: NodeStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.nodesService.findAll({ status, limit, offset });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a node by ID' })
  @ApiResponse({ status: 200, description: 'Return the node.' })
  @ApiResponse({ status: 404, description: 'Node not found.' })
  @ApiParam({ name: 'id', description: 'Node ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.nodesService.findOne(id);
  }
}