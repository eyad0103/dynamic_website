#!/usr/bin/env node

/**
 * Windows Service Uninstaller for PC Monitor Agent
 * Removes the agent service completely
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
    name: 'PC Monitor Agent',
    script: path.join(__dirname, 'agent.js')
});

// Listen for the "uninstall" event
svc.on('uninstall', () => {
    console.log('✅ PC Monitor Agent service uninstalled successfully!');
    console.log('🔄 The agent will no longer start on boot.');
});

// Uninstall the service
svc.uninstall();
