# GoPine Job Server

## Overview
The Job Server is the central intelligence of the GoPine distributed computing system. It orchestrates the workflow of jobs across the network of node agents, managing task distribution, monitoring, and result aggregation.

## Purpose
- Acts as the central coordinator for the entire GoPine ecosystem
- Intelligently distributes computing tasks to available node agents
- Tracks job progress and handles failure scenarios
- Provides API endpoints for job submission and result retrieval

## Key Components
- **Job Queue Management**: Prioritizes and schedules incoming job requests
- **Node Registry**: Tracks all active/inactive node agents in the network
- **Workload Distribution**: Intelligently assigns jobs based on node capacity and availability
- **Status Monitoring**: Real-time tracking of job progress and node health
- **Result Aggregation**: Collects and processes completed job results
- **API Layer**: Provides REST/WebSocket interfaces for system interaction

## Technical Architecture
- **Tech Stack**: NestJS + TypeORM + PostgreSQL
- Scalable server design to handle growing node networks
- Real-time communication with node agents
- Integration with Job Schemas for standardized task definitions
- Persistent storage for job history and results
- Authentication and authorization for API access

## Features
- **Job Management**: Create, monitor, and manage distributed computing jobs
- **Node Management**: Register, track, and monitor node agents
- **Real-time Updates**: WebSocket-based live updates for jobs and nodes
- **Priority Queue**: Job prioritization and intelligent distribution
- **Fault Tolerance**: Automatic job retries and node failure handling
- **API Documentation**: Swagger-based API documentation

## API Endpoints

### Jobs
- `POST /api/jobs` - Create a new job
- `GET /api/jobs` - Get list of jobs with filtering options
- `GET /api/jobs/:id` - Get job details
- `DELETE /api/jobs/:id` - Cancel a job
- `POST /api/jobs/:id/result` - Submit job result
- `POST /api/jobs/request` - Request jobs for a node

### Nodes
- `POST /api/nodes/register` - Register a new node
- `POST /api/nodes/:id/heartbeat` - Send node heartbeat
- `GET /api/nodes` - Get list of nodes
- `GET /api/nodes/:id` - Get node details

## Installation & Setup for LAN Environment

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 15 or higher
- npm or yarn
- Internet connection for initial package installation (offline package installation option below)

### Local Installation
1. Clone or copy the repository to your server
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your local PostgreSQL settings
5. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE gopine;
   CREATE USER gopine WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE gopine TO gopine;
   ```
6. Run database migrations:
   ```bash
   npm run migration:run
   ```
7. Start the server:
   ```bash
   npm run start:prod
   ```

### Offline Package Installation
For environments without internet access:
1. On a machine with internet, run:
   ```bash
   npm pack
   ```
   This will create a tarball of the project
2. Copy the tarball and the following to your offline environment:
   - The project tarball
   - Node.js installer
   - PostgreSQL installer
3. Install Node.js and PostgreSQL
4. Extract the project tarball
5. Install dependencies from the local cache:
   ```bash
   npm install --offline
   ```

### Running as a Windows Service
To run the job server as a Windows service:
1. Install node-windows:
   ```bash
   npm install -g node-windows
   npm link node-windows
   ```
2. Create a service script (install-service.js):
   ```javascript
   const Service = require('node-windows').Service;
   const svc = new Service({
     name: 'GoPineJobServer',
     description: 'GoPine Distributed Computing Job Server',
     script: require('path').join(__dirname, 'dist/main.js')
   });
   svc.on('install', function() {
     svc.start();
   });
   svc.install();
   ```
3. Run the script:
   ```bash
   node install-service.js
   ```

## Database Migrations
- Generate a migration:
  ```bash
  npm run migration:generate -- src/migrations/MigrationName
  ```
- Run migrations:
  ```bash
  npm run migration:run
  ```

## Documentation
The API documentation is available at `/api/docs` when the server is running.

## LAN Configuration
- Configure your network to allow the server to be accessible from other machines
- Ensure firewall rules allow traffic on the configured ports (default: 8080 for HTTP, 8081 for WebSockets)
- For security in LAN environments, consider:
  - Using self-signed SSL certificates
  - Setting up IP-based access controls
  - Implementing strong password policies