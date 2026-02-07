#!/usr/bin/env node

/**
 * AUTOMATED PC AGENT - Real-time PC monitoring
 * 
 * Usage: node agent.js <pc_id> <auth_token> <server_url>
 * 
 * This agent:
 * - Authenticates with server using pc_id + auth_token
 * - Sends heartbeat every 3 seconds
 * - Logs errors locally
 * - Updates PC status to ONLINE after first successful heartbeat
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('❌ ERROR: Missing required arguments');
    console.error('Usage: node agent.js <pc_id> <auth_token> <server_url>');
    console.error('Example: node agent.js PC-12345 abcdef123456 https://dynamic-website-hzu1.onrender.com');
    process.exit(1);
}

const [pcId, authToken, serverUrl] = args;
let isRunning = true;
let heartbeatInterval = null;
let lastHeartbeatSuccess = false;
let firstHeartbeatSent = false;

// Log file setup in current directory
const logFile = path.join(process.cwd(), 'agent.log');
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
        pcId: pcId,
        authToken: authToken,
        timestamp: Date.now(),
        status: 'ONLINE',
        systemInfo: {
            platform: process.platform,
            arch: process.arch,
            node_version: process.version,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            last_heartbeat_success: lastHeartbeatSuccess,
            hostname: os.hostname(),
            cwd: process.cwd(),
            cpus: os.cpus().length,
            total_memory: os.totalmem(),
            free_memory: os.freemem(),
            load_average: os.loadavg()
        }
    };

    makeRequest(`${serverUrl}/api/heartbeat`, heartbeatData, (error, statusCode, data) => {
        if (error) {
            log('ERROR', `💓 Heartbeat failed: ${error.message}`);
            lastHeartbeatSuccess = false;
        } else if (statusCode === 200) {
            if (!firstHeartbeatSent) {
                log('INFO', `✅ FIRST HEARTBEAT SUCCESSFUL - PC is now ONLINE`);
                firstHeartbeatSent = true;
            } else {
                log('INFO', `💓 Heartbeat successful: ${data.message || 'OK'}`);
            }
            lastHeartbeatSuccess = true;
        } else if (statusCode === 401) {
            log('ERROR', '❌ Authentication failed - invalid pc_id or auth_token');
            log('ERROR', 'Please check your credentials and restart agent');
            isRunning = false;
        } else {
            log('ERROR', `❌ Heartbeat failed with status ${statusCode}: ${JSON.stringify(data)}`);
            lastHeartbeatSuccess = false;
        }
    });
}

function startHeartbeat() {
    log('INFO', `🚀 Starting heartbeat every 3 seconds...`);
    
    // Start heartbeat interval
    heartbeatInterval = setInterval(sendHeartbeat, 3000);
    
    // Send first heartbeat immediately
    sendHeartbeat();
}

function shutdown() {
    log('INFO', '🛑 Shutting down agent...');
    isRunning = false;
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    // Send offline status
    const offlineData = {
        pcId: pcId,
        authToken: authToken,
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
    log('INFO', '📡 Received SIGINT (Ctrl+C)');
    shutdown();
});

process.on('SIGTERM', () => {
    log('INFO', '📡 Received SIGTERM');
    shutdown();
});

process.on('uncaughtException', (error) => {
    log('ERROR', `💥 Uncaught exception: ${error.message}`);
    log('ERROR', error.stack);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    log('ERROR', `💥 Unhandled rejection at ${promise}: ${reason}`);
    shutdown();
});

// Start agent
log('INFO', '🚀 Starting Automated PC Agent...');
log('INFO', `📍 Working Directory: ${process.cwd()}`);
log('INFO', `🆔 PC ID: ${pcId}`);
log('INFO', `🌐 Server: ${serverUrl}`);
log('INFO', `💻 Platform: ${process.platform} ${process.arch}`);
log('INFO', `📦 Node.js: ${process.version}`);
log('INFO', `🖥️ Hostname: ${os.hostname()}`);
log('INFO', `🧠 CPUs: ${os.cpus().length}`);
log('INFO', `💾 Total Memory: ${Math.round(os.totalmem() / 1024 / 1024)}MB`);
log('INFO', `💾 Free Memory: ${Math.round(os.freemem() / 1024 / 1024)}MB`);

// Start heartbeat immediately (no registration needed for automated system)
startHeartbeat();
