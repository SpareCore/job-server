# GoPine Job Server Offline Installation Guide

This guide provides instructions for installing and running the GoPine Job Server in an offline LAN environment with no internet access.

## Prerequisites

You will need to gather these installers from a machine with internet access:

1. **Node.js Installer** (version 18 or higher)
   - Download from: https://nodejs.org/en/download/
   
2. **PostgreSQL Installer** (version 15 or higher)
   - Download from: https://www.postgresql.org/download/

3. **npm Dependencies Package**
   - On a machine with internet and Node.js installed, run:
     ```bash
     # Clone the repository
     git clone https://github.com/your-org/gopine-job-server.git
     
     # Go to the project directory
     cd gopine-job-server
     
     # Install dependencies to create a node_modules folder
     npm install
     
     # Create a tarball of node_modules
     tar -czvf node_modules.tar.gz node_modules/
     ```

## Installation Steps

### 1. Install Node.js

1. Run the Node.js installer
2. Follow the installation wizard
3. Verify installation by opening a command prompt and running:
   ```
   node -v
   npm -v
   ```

### 2. Install PostgreSQL

1. Run the PostgreSQL installer
2. Choose a password for the postgres user (remember this!)
3. Keep the default port (5432)
4. Complete the installation

### 3. Set Up PostgreSQL Database

1. Open SQL Shell (psql) from the Start menu
2. Connect to PostgreSQL (press Enter to accept defaults, enter your password when prompted)
3. Create a database and user for GoPine:
   ```sql
   CREATE DATABASE gopine;
   CREATE USER gopine WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE gopine TO gopine;
   ```

### 4. Install GoPine Job Server

1. Copy the GoPine Job Server files to your server
2. Extract the node_modules tarball in the project directory:
   ```
   tar -xzvf node_modules.tar.gz
   ```
   or on Windows, use 7-Zip or a similar tool

3. Create a `.env` file from the example:
   ```
   copy .env.example .env
   ```

4. Edit the `.env` file to match your PostgreSQL settings:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=gopine
   DB_PASSWORD=your_password
   DB_DATABASE=gopine
   ```

5. Change the JWT_SECRET to a secure random string

### 5. Build and Run the Application

1. Build the application:
   ```
   npm run build
   ```

2. Start the server:
   ```
   npm run start:prod
   ```

### 6. Install as a Windows Service (Optional)

1. Run the provided installation script:
   ```
   install-service.bat
   ```

## Network Configuration

1. Configure your firewall to allow inbound connections on ports 8080 and 8081
2. Note the IP address of your server (run `ipconfig` to find it)
3. Test the connection from another computer on the LAN by visiting:
   ```
   http://[server-ip]:8080/api/docs
   ```

## Troubleshooting

1. **Service won't start**:
   - Check the logs in the `daemon` folder created by node-windows
   - Ensure PostgreSQL is running

2. **Can't connect to the server**:
   - Check that the server is running: `sc query GoPineJobServer`
   - Verify firewall settings allow the connection
   - Ensure the HOST in .env is set to 0.0.0.0

3. **Database connection issues**:
   - Check PostgreSQL is running: `sc query postgresql-x64-15`
   - Verify database credentials in .env file
   - Try connecting with psql to test credentials