const express = require('express');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');

// Import clean modules
const { createApiKeyRoutes } = require('./persistent-api-system.js');
const pcManagementRoutes = require('./clean-pc-management.js');

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
        const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
};

// Set API key from environment (for production)
if (process.env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
}

// Agent management system with persistence
const agents = new Map(); // pcId -> { ws, token, lastSeen, systemInfo }
const agentPackages = new Map(); // packageId -> { pcId, token, createdAt, downloaded }

// Load persisted data on startup
function loadPersistedData() {
    try {
        console.log('🔄 Loading persisted data...');
        
        // Check if we have any existing packages
        if (agentPackages.size === 0) {
            console.log('📦 No existing packages found - system ready for new registrations');
        }
        
        console.log(`📊 Current state: ${agents.size} agents, ${agentPackages.size} packages`);
    } catch (error) {
        console.error('❌ Failed to load persisted data:', error);
    }
}

// Initialize data on startup
loadPersistedData();

// Generate secure token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
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
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Use clean routes
app.use(createApiKeyRoutes());
app.use(pcManagementRoutes);

// Download agent route
app.get('/download-agent', (req, res) => {
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
    res.render('index', { 
        posts: posts,
        systemInfo: systemBaseline
    });
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard', { 
        systemInfo: systemBaseline
    });
});

app.get('/api/stats', (req, res) => {
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
    console.log('🔗 WebSocket connection established');
    
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
                    
                    console.log(`💓 Heartbeat from PC: ${pcId}`);
                }
            }
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Clean Dynamic PC Management System running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔑 API Key Management: Persistent storage`);
    console.log(`🖥️ PC Management: Separated responsibilities`);
    console.log(`📢 Notifications: No stacking system`);
    console.log(`🔄 Auto-refresh: Real-time monitoring`);
});

// Attach WebSocket to HTTP server
wss.clients = new Set();
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head);
});

module.exports = app;
