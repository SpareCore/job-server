const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'GoPineJobServer',
  description: 'GoPine Distributed Computing Job Server',
  script: path.join(__dirname, 'dist/main.js')
});

// Listen for uninstall event
svc.on('uninstall', function() {
  console.log('GoPine Job Server service uninstalled successfully');
});

// Uninstall the service
svc.uninstall();