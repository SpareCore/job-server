const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'GoPineJobServer',
  description: 'GoPine Distributed Computing Job Server',
  script: path.join(__dirname, 'dist/main.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  // Log file paths
  workingDirectory: __dirname,
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    }
  ]
});

// Listen for service install/uninstall events
svc.on('install', function() {
  console.log('Service installed successfully');
  svc.start();
});

svc.on('uninstall', function() {
  console.log('Service uninstalled successfully');
});

svc.on('start', function() {
  console.log('Service started successfully');
});

svc.on('stop', function() {
  console.log('Service stopped');
});

svc.on('error', function(err) {
  console.error('Service error:', err);
});

// Install the service
svc.install();