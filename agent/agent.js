#!/usr/bin/env node

/**
 * PRODUCTION-GRADE PC MONITOR AGENT
 * 
 * This is a real monitoring agent that:
 * - Runs as a background service
 * - Auto-starts on boot
 * - Detects application errors
 * - Reports to central backend
 * - No UI, completely invisible
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');
const WebSocket = require('ws');
const winston = require('winston');
const cron = require('node-cron');
const si = require('systeminformation');

// Configuration
const CONFIG_FILE = path.join(__dirname, 'agent-config.json');
const LOG_FILE = path.join(__dirname, 'agent.log');
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');

// Initialize logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: LOG_FILE }),
        new winston.transports.Console({ 
            format: winston.format.simple(),
            silent: process.argv.includes('--silent') 
        })
    ]
});

// Agent state
let agentConfig = null;
let credentials = null;
let wsConnection = null;
let systemInfo = null;
let isRegistered = false;
let heartbeatInterval = null;

// Load configuration
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            agentConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            logger.info('Configuration loaded', { config: agentConfig });
        } else {
            logger.error('Configuration file not found. Please run setup first.');
            process.exit(1);
        }
    } catch (error) {
        logger.error('Failed to load configuration', { error: error.message });
        process.exit(1);
    }
}

// Load credentials
function loadCredentials() {
    try {
        if (fs.existsSync(CREDENTIALS_FILE)) {
            credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
            logger.info('Credentials loaded', { pcId: credentials.pcId });
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Failed to load credentials', { error: error.message });
        return false;
    }
}

// Save credentials
function saveCredentials(newCredentials) {
    try {
        fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(newCredentials, null, 2));
        credentials = newCredentials;
        logger.info('Credentials saved', { pcId: credentials.pcId });
    } catch (error) {
        logger.error('Failed to save credentials', { error: error.message });
    }
}

// Get system information
async function getSystemInfo() {
    try {
        const cpu = await si.cpu();
        const mem = await si.mem();
        const osInfo = await si.osInfo();
        const disk = await si.diskLayout();
        const net = await si.networkInterfaces();

        systemInfo = {
            platform: osInfo.platform,
            os: osInfo.distro,
            osVersion: osInfo.release,
            hostname: osInfo.hostname,
            cpu: cpu.model,
            cores: cpu.cores,
            memory: Math.round(mem.total / 1024 / 1024 / 1024) + 'GB',
            disk: disk.map(d => `${d.device} (${Math.round(d.size / 1024 / 1024 / 1024)}GB)`),
            network: net.filter(n => n && !n.internal).map(n => n.ip4),
            nodeVersion: process.version,
            agentVersion: require('./package.json').version
        };

        logger.info('System information gathered', systemInfo);
        return systemInfo;
    } catch (error) {
        logger.error('Failed to get system info', { error: error.message });
        return null;
    }
}

// Register agent with backend
async function registerAgent() {
    try {
        logger.info('Registering agent with backend...', { 
            serverUrl: agentConfig.serverUrl,
            pcId: agentConfig.pcId 
        });

        const response = await axios.post(`${agentConfig.serverUrl}/api/register-agent`, {
            pcId: agentConfig.pcId,
            token: agentConfig.token,
            systemInfo: await getSystemInfo()
        }, {
            timeout: 10000,
            headers: {
                'User-Agent': `PC-Monitor-Agent/${require('./package.json').version}`
            }
        });

        if (response.data.success) {
            isRegistered = true;
            saveCredentials({
                pcId: agentConfig.pcId,
                token: agentConfig.token,
                serverUrl: agentConfig.serverUrl,
                registeredAt: new Date().toISOString()
            });
            
            logger.info('Agent registered successfully', { 
                pcId: agentConfig.pcId,
                serverUrl: agentConfig.serverUrl 
            });
            
            return true;
        } else {
            logger.error('Registration failed', { response: response.data });
            return false;
        }
    } catch (error) {
        logger.error('Registration error', { 
            error: error.message,
            code: error.code 
        });
        return false;
    }
}

// Establish WebSocket connection
function connectWebSocket() {
    if (!credentials) return;

    const wsUrl = credentials.wsUrl || `${credentials.serverUrl.replace('http', 'ws')}/agent-ws`;
    logger.info('Connecting to WebSocket...', { wsUrl });

    try {
        wsConnection = new WebSocket(wsUrl, {
            headers: {
                'pc-id': credentials.pcId,
                'token': credentials.token
            }
        });

        wsConnection.on('open', () => {
            logger.info('WebSocket connection established');
            startHeartbeat();
        });

        wsConnection.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                handleWebSocketMessage(message);
            } catch (error) {
                logger.error('Invalid WebSocket message', { error: error.message });
            }
        });

        wsConnection.on('close', (code, reason) => {
            logger.warn('WebSocket connection closed', { code, reason });
            stopHeartbeat();
            // Attempt to reconnect after 30 seconds
            setTimeout(connectWebSocket, 30000);
        });

        wsConnection.on('error', (error) => {
            logger.error('WebSocket error', { error: error.message });
        });

    } catch (error) {
        logger.error('Failed to create WebSocket connection', { error: error.message });
        setTimeout(connectWebSocket, 30000);
    }
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'ping':
            sendWebSocketMessage({ type: 'pong', timestamp: new Date().toISOString() });
            break;
        case 'config-update':
            logger.info('Configuration update received', message.config);
            break;
        case 'restart':
            logger.info('Restart command received');
            process.exit(0); // Service manager will restart
            break;
        default:
            logger.debug('Unknown message type', { type: message.type });
    }
}

// Send WebSocket message
function sendWebSocketMessage(message) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify(message));
    }
}

// Heartbeat system
function startHeartbeat() {
    stopHeartbeat(); // Clear any existing interval
    
    heartbeatInterval = setInterval(() => {
        sendWebSocketMessage({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    }, 30000); // Every 30 seconds
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Monitor system for errors
function startErrorMonitoring() {
    logger.info('Starting error monitoring...');

    // Monitor application crashes (Windows Event Log)
    if (os.platform() === 'win32') {
        monitorWindowsEvents();
    }

    // Monitor system logs (Linux/macOS)
    if (os.platform() === 'linux') {
        monitorLinuxLogs();
    }

    // Monitor process crashes
    monitorProcessCrashes();

    // Monitor unhandled exceptions
    process.on('uncaughtException', (error) => {
        reportError({
            type: 'uncaught_exception',
            appName: 'pc-monitor-agent',
            message: error.message,
            stackTrace: error.stack,
            severity: 'critical',
            timestamp: new Date().toISOString()
        });
    });

    process.on('unhandledRejection', (reason, promise) => {
        reportError({
            type: 'unhandled_rejection',
            appName: 'pc-monitor-agent',
            message: reason.toString(),
            stackTrace: reason.stack,
            severity: 'critical',
            timestamp: new Date().toISOString()
        });
    });
}

// Monitor Windows Event Log
function monitorWindowsEvents() {
    try {
        // Use PowerShell to monitor application errors
        const command = `Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2,3} -MaxEvents 1 | ConvertTo-Json`;
        
        exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
            if (error) {
                logger.error('Failed to monitor Windows events', { error: error.message });
                return;
            }

            try {
                const events = JSON.parse(stdout);
                if (Array.isArray(events) && events.length > 0) {
                    events.forEach(event => {
                        if (event.TimeCreated && event.Message) {
                            reportError({
                                type: 'application_error',
                                appName: event.Source || 'Unknown',
                                message: event.Message,
                                stackTrace: event.LevelDisplayName,
                                severity: event.Level === 2 ? 'error' : 'warning',
                                timestamp: event.TimeCreated
                            });
                        }
                    });
                }
            } catch (parseError) {
                logger.error('Failed to parse Windows events', { error: parseError.message });
            }
        });

        // Check every 60 seconds
        setTimeout(monitorWindowsEvents, 60000);
    } catch (error) {
        logger.error('Windows event monitoring failed', { error: error.message });
    }
}

// Monitor Linux system logs
function monitorLinuxLogs() {
    try {
        exec('journalctl -p err,crit --since "1 minute ago" --no-pager -o json', (error, stdout, stderr) => {
            if (error) {
                logger.error('Failed to monitor Linux logs', { error: error.message });
                return;
            }

            const lines = stdout.trim().split('\n');
            lines.forEach(line => {
                try {
                    const entry = JSON.parse(line);
                    if (entry.MESSAGE) {
                        reportError({
                            type: 'system_error',
                            appName: entry.SYSLOG_IDENTIFIER || 'System',
                            message: entry.MESSAGE,
                            stackTrace: entry.PRIORITY,
                            severity: entry.PRIORITY <= 3 ? 'critical' : 'error',
                            timestamp: entry.__REALTIME_TIMESTAMP
                        });
                    }
                } catch (parseError) {
                    // Skip malformed entries
                }
            });
        });

        // Check every 60 seconds
        setTimeout(monitorLinuxLogs, 60000);
    } catch (error) {
        logger.error('Linux log monitoring failed', { error: error.message });
    }
}

// Monitor process crashes
function monitorProcessCrashes() {
    // This would be expanded based on specific applications to monitor
    // For now, it monitors the agent itself
    logger.info('Process crash monitoring initialized');
}

// Report error to backend
async function reportError(errorData) {
    try {
        const errorPayload = {
            pcId: credentials.pcId,
            appName: errorData.appName,
            errorType: errorData.type,
            message: errorData.message,
            stackTrace: errorData.stackTrace,
            severity: errorData.severity,
            timestamp: errorData.timestamp,
            systemInfo: systemInfo
        };

        // Send via HTTP first
        await axios.post(`${credentials.serverUrl}/api/error-report`, errorPayload, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': `PC-Monitor-Agent/${require('./package.json').version}`
            }
        });

        // Also send via WebSocket if available
        sendWebSocketMessage({
            type: 'error',
            data: errorPayload
        });

        logger.info('Error reported', { 
            type: errorData.type,
            appName: errorData.appName,
            severity: errorData.severity 
        });

    } catch (error) {
        logger.error('Failed to report error', { 
            error: error.message,
            originalError: errorData 
        });
    }
}

// Graceful shutdown
function shutdown() {
    logger.info('Shutting down agent...');
    
    stopHeartbeat();
    
    if (wsConnection) {
        sendWebSocketMessage({
            type: 'shutdown',
            timestamp: new Date().toISOString()
        });
        wsConnection.close();
    }
    
    process.exit(0);
}

// Main execution
async function main() {
    logger.info('PC Monitor Agent starting...', { 
        version: require('./package.json').version,
        platform: os.platform(),
        nodeVersion: process.version
    });

    // Handle shutdown signals
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Load configuration
    loadConfig();

    // Try to load existing credentials
    if (!loadCredentials()) {
        // Need to register
        logger.info('No credentials found, attempting registration...');
        if (await registerAgent()) {
            logger.info('Registration successful, starting monitoring...');
        } else {
            logger.error('Registration failed, exiting...');
            process.exit(1);
        }
    } else {
        logger.info('Credentials loaded, connecting to backend...');
        agentConfig = { ...agentConfig, ...credentials };
    }

    // Get system info
    await getSystemInfo();

    // Start error monitoring
    startErrorMonitoring();

    // Connect to backend
    connectWebSocket();

    logger.info('PC Monitor Agent started successfully');
}

// Start the agent
if (require.main === module) {
    main().catch(error => {
        logger.error('Agent startup failed', { error: error.message });
        process.exit(1);
    });
}

module.exports = { main, reportError, shutdown };
