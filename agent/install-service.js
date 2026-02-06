const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

// Create a new service object
const svc = new Service({
    name: 'PC Monitor Agent',
    description: 'Real-time PC monitoring and error tracking agent',
    script: path.join(__dirname, 'agent.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ]
});

// Listen for the "install" event
svc.on('install', () => {
    console.log('Service installed successfully');
    svc.start();
});

// Listen for the "start" event
svc.on('start', () => {
    console.log('Service started successfully');
});

// Listen for the "stop" event
svc.on('stop', () => {
    console.log('Service stopped');
});

// Listen for the "uninstall" event
svc.on('uninstall', () => {
    console.log('Service uninstalled successfully');
});

// Listen for the "alreadyrunning" event
svc.on('alreadyrunning', () => {
    console.log('Service is already running');
});

// Install the service
svc.install();
