const express = require('express');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');

// Import debug modules
const { createApiKeyRoutes } = require('./debug-api-system.js');
const pcManagementRoutes = require('./debug-pc-management.js');

const app = express();
const PORT = process.env.PORT || 3000;

// System Baseline Object
const systemBaseline = {
    serverStartTime: new Date(),
    uptime: function() {
        return Date.now() - this.serverStartTime.getTime();
    },
    getUptimeFormatted: function() {
        const uptime = this.uptime();
        const seconds = Math.floor(uptime / 1000) % 60;
        const minutes = Math.floor(uptime / (1000 * 60)) % 60;
        const hours = Math.floor(uptime / (1000 * 60 * 60)) %24;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
};

// Debug logging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? ' | Data: ' + JSON.stringify(data) : ''}\n`;
    
    console.log(`🚀 SERVER-DEBUG: ${message}`, data || '');
    
    try {
        fs.appendFileSync(path.join(__dirname, 'data', 'debug-server.log'), logEntry);
    } catch (error) {
        console.error('❌ Failed to write server debug log:', error);
    }
}

// Set API key from environment (for production)
if (process.env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    debugLog('API key set from environment');
}

// Agent management system with persistence
const agents = new Map(); // pcId -> { ws, token, lastSeen, systemInfo }
const agentPackages = new Map(); // packageId -> { pcId, token, createdAt, downloaded }

// Load persisted data on startup
function loadPersistedData() {
    try {
        debugLog('Loading persisted data...');
        
        // Check if we have any existing packages
        if (agentPackages.size === 0) {
            debugLog('No existing packages found - system ready for new registrations');
        }
        
        debugLog(`Current state: ${agents.size} agents, ${agentPackages.size} packages`);
    } catch (error) {
        debugLog('Failed to load persisted data', { error: error.message });
    }
}

// Initialize data on startup
loadPersistedData();

// Generate secure token
function generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    debugLog('Generated new token', { tokenLength: token.length });
    return token;
}

// Create agent package
function createAgentPackage(pcName, pcLocation, pcOwner, pcType, pcDescription) {
    const pcId = `PC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const token = generateToken();
    const packageId = crypto.randomBytes(16).toString('hex');
    
    const agentConfig = {
        pcId,
        token,
        serverUrl: process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com'
    };
    
    agentPackages.set(packageId, {
        pcId,
        token,
        pcName,
        pcLocation,
        pcOwner,
        pcType,
        pcDescription,
        createdAt: new Date().toISOString(),
        downloaded: false
    });
    
    debugLog('Agent package created', { 
        packageId,
        pcId,
        pcName,
        pcLocation,
        pcOwner
    });
    
    return {
        packageId,
        pcId,
        token,
        config: agentConfig
    };
}

// Request tracking middleware
app.use((req, res, next) => {
    req.requestCount = (global.requestCount || 0) + 1;
    global.requestCount = req.requestCount;
    
    debugLog('Request received', { 
        method: req.method,
        url: req.url,
        requestCount: req.requestCount
    });
    
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Use debug routes
app.use(createApiKeyRoutes());
app.use(pcManagementRoutes);

// Download agent route
app.get('/download-agent', (req, res) => {
    debugLog('Agent download requested', { 
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });
    
    try {
        // Path to agent.js file
        const filePath = path.join(__dirname, 'public', 'agent.js');
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            debugLog('Agent file not found', { filePath });
            return res.status(404).json({
                success: false,
                error: 'Agent file not found'
            });
        }
        
        // Use res.download() for proper file download
        res.download(filePath, 'agent.js', (err) => {
            if (err) {
                debugLog('Download error', { error: err.message });
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Download failed: ' + err.message
                    });
                }
            } else {
                debugLog('Agent download completed successfully');
            }
        });
        
    } catch (error) {
        debugLog('Download route error', { error: error.message });
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Server error: ' + error.message
            });
        }
    }
});

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sample dynamic data
const posts = [
    {
        id: 1,
        title: "Welcome to My Dynamic Website",
        content: "This is a fully functional dynamic website built with Node.js and Express! The site features server-side rendering with EJS templates, RESTful API endpoints, and a responsive modern design.",
        date: new Date().toLocaleDateString(),
        author: "Admin",
        category: "Announcement"
    },
    {
        id: 2,
        title: "About This Project",
        content: "This website demonstrates a complete full-stack application with dynamic content rendering, RESTful API endpoints, and professional UI/UX design. Built with modern web technologies for optimal performance.",
        date: new Date().toLocaleDateString(),
        author: "Admin",
        category: "Information"
    },
    {
        id: 3,
        title: "Getting Started with Node.js",
        content: "Node.js provides a powerful runtime for building scalable network applications. Combined with Express.js, we can create robust RESTful APIs and dynamic web applications with ease.",
        date: new Date(Date.now() - 86400000).toLocaleDateString(),
        author: "Admin",
        category: "Tutorial"
    }
];

// Routes
app.get('/', (req, res) => {
    debugLog('Home page requested');
    res.render('index', { 
        posts: posts,
        systemInfo: systemBaseline
    });
});

app.get('/dashboard', (req, res) => {
    debugLog('Dashboard page requested');
    res.render('debug-dashboard', { 
        systemInfo: systemBaseline
    });
});

app.get('/api/stats', (req, res) => {
    debugLog('Stats API requested');
    res.json({
        success: true,
        systemInfo: systemBaseline,
        agents: agents.size,
        packages: agentPackages.size,
        uptime: systemBaseline.getUptimeFormatted()
    });
});

// WebSocket for real-time agent communication
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    debugLog('WebSocket connection established');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'heartbeat') {
                const { pcId, authToken, systemInfo } = data;
                
                if (agents.has(pcId) && agents.get(pcId).token === authToken) {
                    const agent = agents.get(pcId);
                    agent.lastSeen = new Date();
                    agent.systemInfo = systemInfo;
                    
                    // Broadcast to all clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'agent-update',
                                pcId: pcId,
                                status: 'ONLINE',
                                lastSeen: agent.lastSeen,
                                systemInfo: agent.systemInfo
                            }));
                        }
                    });
                    
                    debugLog('Heartbeat received from PC', { pcId });
                }
            }
        } catch (error) {
            debugLog('WebSocket message error', { error: error.message });
        }
    });
    
    ws.on('close', () => {
        debugLog('WebSocket connection closed');
    });
});

// Start server
const server = app.listen(PORT, () => {
    debugLog('Debug Dynamic PC Management System started', { 
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
    });
    
    console.log(`🚀 Debug Dynamic PC Management System running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔑 API Key Management: Persistent storage with debug logging`);
    console.log(`🖥️ PC Management: Separated responsibilities with debug logging`);
    console.log(`📢 Notifications: Important events only with debug logging`);
    console.log(`🔄 Auto-refresh: Real-time monitoring with debug logging`);
    console.log(`🐛 Debug Panel: Real-time debug logs in UI`);
});

// Attach WebSocket to HTTP server
wss.clients = new Set();
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head);
});

module.exports = app;
