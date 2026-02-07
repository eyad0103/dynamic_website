#!/usr/bin/env node

/**
 * REAL PC AGENT - Runs on actual PC
 * 
 * Usage: node agent.js <pc_id> <auth_token> <server_url>
 * 
 * This agent:
 * - Authenticates with server using pc_id + auth_token
 * - Sends heartbeat every 3 seconds
 * - Logs errors locally
 * - Runs as real process on PC
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('❌ ERROR: Missing required arguments');
    console.error('Usage: node agent.js <pc_id> <auth_token> <server_url>');
    console.error('Example: node agent.js PC-12345 abcdef123456 https://your-server.com');
    process.exit(1);
}

const [pcId, authToken, serverUrl] = args;
let isRunning = true;
let heartbeatInterval = null;
let lastHeartbeatSuccess = false;

// Log file setup
const logFile = path.join(__dirname, 'agent.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] [${pcId}] ${message}`;
    console.log(logMessage);
    logStream.write(logMessage + '\n');
}

function makeRequest(url, data, callback) {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    const urlObj = new URL(url);
    
    const postData = JSON.stringify(data);
    
    const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': `PC-Agent/${pcId}`,
            'Authorization': `Bearer ${authToken}`
        }
    };

    const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(responseData);
                callback(null, res.statusCode, parsedData);
            } catch (error) {
                callback(error, res.statusCode, null);
            }
        });
    });

    req.on('error', (error) => {
        callback(error, null, null);
    });

    req.on('timeout', () => {
        req.destroy();
        callback(new Error('Request timeout'), null, null);
    });

    req.setTimeout(10000); // 10 second timeout
    req.write(postData);
    req.end();
}

function sendHeartbeat() {
    if (!isRunning) return;

    const heartbeatData = {
        pc_id: pcId,
        timestamp: Date.now(),
        status: 'ONLINE',
        system_info: {
            platform: process.platform,
            arch: process.arch,
            node_version: process.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            last_heartbeat_success: lastHeartbeatSuccess
        }
    };

    makeRequest(`${serverUrl}/api/heartbeat`, heartbeatData, (error, statusCode, data) => {
        if (error) {
            log('ERROR', `Heartbeat failed: ${error.message}`);
            lastHeartbeatSuccess = false;
        } else if (statusCode === 200) {
            log('INFO', `Heartbeat successful: ${data.message || 'OK'}`);
            lastHeartbeatSuccess = true;
        } else if (statusCode === 401) {
            log('ERROR', 'Authentication failed - invalid pc_id or auth_token');
            log('ERROR', 'Please check your credentials and restart the agent');
            isRunning = false;
        } else {
            log('ERROR', `Heartbeat failed with status ${statusCode}: ${JSON.stringify(data)}`);
            lastHeartbeatSuccess = false;
        }
    });
}

function registerAgent() {
    const registerData = {
        pc_id: pcId,
        auth_token: authToken,
        system_info: {
            platform: process.platform,
            arch: process.arch,
            node_version: process.version,
            hostname: require('os').hostname()
        }
    };

    makeRequest(`${serverUrl}/api/register-agent`, registerData, (error, statusCode, data) => {
        if (error) {
            log('ERROR', `Registration failed: ${error.message}`);
            log('ERROR', 'Please check server URL and network connection');
            process.exit(1);
        } else if (statusCode === 200) {
            log('INFO', `✅ Agent registered successfully: ${data.message}`);
            log('INFO', `🚀 Starting heartbeat every 3 seconds...`);
            
            // Start heartbeat interval
            heartbeatInterval = setInterval(sendHeartbeat, 3000);
            
            // Send first heartbeat immediately
            sendHeartbeat();
        } else {
            log('ERROR', `Registration failed with status ${statusCode}: ${JSON.stringify(data)}`);
            process.exit(1);
        }
    });
}

function shutdown() {
    log('INFO', '🛑 Shutting down agent...');
    isRunning = false;
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    // Send offline status
    const offlineData = {
        pc_id: pcId,
        timestamp: Date.now(),
        status: 'OFFLINE',
        shutdown_reason: 'Agent stopped'
    };

    makeRequest(`${serverUrl}/api/heartbeat`, offlineData, () => {
        log('INFO', '✅ Agent shutdown complete');
        logStream.end();
        process.exit(0);
    });
}

// Handle process termination
process.on('SIGINT', () => {
    log('INFO', 'Received SIGINT (Ctrl+C)');
    shutdown();
});

process.on('SIGTERM', () => {
    log('INFO', 'Received SIGTERM');
    shutdown();
});

process.on('uncaughtException', (error) => {
    log('ERROR', `Uncaught exception: ${error.message}`);
    log('ERROR', error.stack);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    log('ERROR', `Unhandled rejection at ${promise}: ${reason}`);
    shutdown();
});

// Start the agent
log('INFO', '🚀 Starting PC Agent...');
log('INFO', `PC ID: ${pcId}`);
log('INFO', `Server: ${serverUrl}`);
log('INFO', `Platform: ${process.platform} ${process.arch}`);
log('INFO', `Node.js: ${process.version}`);

registerAgent();
