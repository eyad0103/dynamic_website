#!/usr/bin/env node

/**
 * Windows Service Installer for PC Monitor Agent
 * Installs the agent as a Windows service that auto-starts on boot
 */

const Service = require('node-windows').Service;
const path = require('path');
const fs = require('fs');

// Create a new service object
const svc = new Service({
    name: 'PC Monitor Agent',
    description: 'Production-grade PC monitoring agent for error detection and reporting',
    script: path.join(__dirname, 'agent.js'),
    nodeOptions: [
        '--silent'
    ],
    env: [
        {
            name: 'NODE_ENV',
            value: 'production'
        }
    ]
});

// Listen for the "install" event
svc.on('install', () => {
    console.log('✅ PC Monitor Agent service installed successfully!');
    console.log('📍 Service name: PC Monitor Agent');
    console.log('🔄 The agent will start automatically on system boot.');
    console.log('📝 Logs are available at:', path.join(__dirname, 'agent.log'));
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', () => {
    console.log('⚠️  PC Monitor Agent is already installed.');
});

// Listen for the "start" event
svc.on('start', () => {
    console.log('🚀 PC Monitor Agent service started.');
});

// Listen for the "stop" event
svc.on('stop', () => {
    console.log('⏹️  PC Monitor Agent service stopped.');
});

// Listen for the "uninstall" event
svc.on('uninstall', () => {
    console.log('🗑️  PC Monitor Agent service uninstalled.');
});

// Install the service
svc.install();

// Start the service after installation
svc.start();
