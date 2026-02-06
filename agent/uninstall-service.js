const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'PC Monitor Agent',
    script: path.join(__dirname, 'agent.js')
});

// Uninstall the service
svc.on('uninstall', () => {
    console.log('Service uninstalled successfully');
});

// Uninstall the service
svc.uninstall();
