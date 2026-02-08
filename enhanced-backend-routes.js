// Enhanced backend routes for Dynamic PC Management System
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ==================== DOWNLOAD AGENT ROUTE ====================

// Proper file download route using res.download()
router.get('/download-agent', (req, res) => {
    try {
        console.log('📥 Agent download requested');
        
        // Path to agent.js file
        const filePath = path.join(__dirname, 'public', 'agent.js');
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('❌ agent.js file not found:', filePath);
            return res.status(404).json({
                success: false,
                error: 'Agent file not found'
            });
        }
        
        // Use res.download() for proper file download
        res.download(filePath, 'agent.js', (err) => {
            if (err) {
                console.error('❌ Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Download failed: ' + err.message
                    });
                }
            } else {
                console.log('✅ Agent download completed successfully');
            }
        });
        
    } catch (error) {
        console.error('❌ Download route error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Server error: ' + error.message
            });
        }
    }
});

// ==================== REGISTERED PCS API ====================

// Get registered PCs with real-time status
router.get('/api/registered-pcs', (req, res) => {
    try {
        console.log('📊 Fetching registered PCs');
        
        // Get registered PCs from the main API
        // This should be integrated with your existing PC management system
        const registeredPCs = global.registeredPCs || new Map();
        const pcsArray = Array.from(registeredPCs.values()).map(pc => ({
            pcId: pc.pcId,
            pcName: pc.pcName,
            status: pc.status,
            lastHeartbeat: pc.lastHeartbeat,
            location: pc.location,
            owner: pc.owner,
            registeredAt: pc.registeredAt
        }));
        
        res.json({
            success: true,
            pcs: pcsArray,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error fetching registered PCs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch registered PCs: ' + error.message
        });
    }
});

// ==================== FALLBACK AGENT.JS SERVE ====================

// Serve agent.js file with proper headers (fallback)
router.get('/agent.js', (req, res) => {
    try {
        console.log('📄 Serving agent.js file');
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Content-Disposition', 'attachment; filename="agent.js"');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Path to agent.js file
        const filePath = path.join(__dirname, 'public', 'agent.js');
        
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            // Fallback: provide inline agent code
            const agentCode = `// Downloadable agent.js - Real PC Agent
// Usage: node agent.js <pc_id> <auth_token> <server_url>

const http = require('http');
const https = require('https');
const os = require('os');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node agent.js <pc_id> <auth_token> <server_url>');
    process.exit(1);
}

const [pcId, authToken, serverUrl] = args;

// Agent configuration
const HEARTBEAT_INTERVAL = 3000; // 3 seconds
const LOG_FILE = 'agent.log';

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = \`[\${timestamp}] \${message}\`;
    console.log(logMessage);
    
    // Write to log file
    fs.appendFile(LOG_FILE, logMessage + '\\n', (err) => {
        if (err) console.error('Log file error:', err);
    });
}

// Send heartbeat to server
function sendHeartbeat() {
    const data = {
        pcId: pcId,
        authToken: authToken,
        timestamp: new Date().toISOString(),
        systemInfo: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            uptime: os.uptime(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem()
        }
    };
    
    const postData = JSON.stringify(data);
    const url = new URL(serverUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/api/heartbeat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = httpModule.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
            responseData += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 200) {
                log('✅ Heartbeat sent successfully');
            } else {
                log(\`❌ Heartbeat failed: \${res.statusCode} - \${responseData}\`);
            }
        });
    });
    
    req.on('error', (err) => {
        log(\`❌ Heartbeat error: \${err.message}\`);
    });
    
    req.write(postData);
    req.end();
}

// Graceful shutdown
function shutdown() {
    log('🛑 Agent shutting down...');
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start agent
log(\`🚀 Agent started for PC: \${pcId}\`);
log(\`📡 Server: \${serverUrl}\`);
log(\n💡 Sending heartbeat every \${HEARTBEAT_INTERVAL/1000} seconds...\n);

// Send first heartbeat immediately
sendHeartbeat();

// Send heartbeat at regular intervals
setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
`;
            
            res.send(agentCode);
        }
        
    } catch (error) {
        console.error('❌ Error serving agent.js:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to serve agent.js: ' + error.message
        });
    }
});

module.exports = router;
