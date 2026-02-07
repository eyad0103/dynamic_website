// Separated PC Management System - API Key tab only manages keys, Create PC tab manages PCs
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Import persistent API key management
const { loadApiKeys, validateApiKey } = require('./persistent-api-keys.js');

// File path for PC data storage
const PC_DATA_FILE = path.join(__dirname, 'data', 'pcs.json');

// Ensure data directory exists
function ensureDataDirectory() {
    const dataDir = path.dirname(PC_DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Load PCs from file
function loadPCs() {
    try {
        ensureDataDirectory();
        
        if (fs.existsSync(PC_DATA_FILE)) {
            const data = fs.readFileSync(PC_DATA_FILE, 'utf8');
            const pcs = JSON.parse(data);
            console.log('🖥️ PCs loaded from file');
            return pcs;
        } else {
            console.log('📝 No PC file found, creating new one');
            return {};
        }
    } catch (error) {
        console.error('❌ Error loading PCs:', error);
        return {};
    }
}

// Save PCs to file
function savePCs(pcs) {
    try {
        ensureDataDirectory();
        
        // Create backup of existing file
        if (fs.existsSync(PC_DATA_FILE)) {
            const backupPath = PC_DATA_FILE + '.backup';
            fs.copyFileSync(PC_DATA_FILE, backupPath);
        }
        
        // Write new PCs data
        const data = JSON.stringify(pcs, null, 2);
        fs.writeFileSync(PC_DATA_FILE, data, 'utf8');
        
        console.log('✅ PCs saved to file');
        return true;
    } catch (error) {
        console.error('❌ Error saving PCs:', error);
        return false;
    }
}

// Generate secure token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Create new PC
function createPC(pcName, pcLocation, pcOwner, pcType, pcDescription) {
    const pcId = `PC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const authToken = generateToken();
    
    const pc = {
        pcId,
        pcName,
        pcLocation,
        pcOwner,
        pcType,
        pcDescription,
        authToken,
        status: 'WAITING_FOR_AGENT',
        createdAt: new Date().toISOString(),
        lastHeartbeat: null,
        systemInfo: null,
        agentConnected: false
    };
    
    return pc;
}

// Get latest PC waiting for agent
function getLatestWaitingPC() {
    const pcs = loadPCs();
    const waitingPCs = Object.values(pcs)
        .filter(pc => pc.status === 'WAITING_FOR_AGENT')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return waitingPCs.length > 0 ? waitingPCs[0] : null;
}

// Get oldest PC waiting for agent
function getOldestWaitingPC() {
    const pcs = loadPCs();
    const waitingPCs = Object.values(pcs)
        .filter(pc => pc.status === 'WAITING_FOR_AGENT')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    return waitingPCs.length > 0 ? waitingPCs[0] : null;
}

// Update PC status
function updatePCStatus(pcId, status, additionalData = {}) {
    const pcs = loadPCs();
    
    if (pcs[pcId]) {
        pcs[pcId].status = status;
        pcs[pcId].lastUpdated = new Date().toISOString();
        
        // Add additional data
        Object.assign(pcs[pcId], additionalData);
        
        savePCs(pcs);
        console.log(`📊 PC ${pcId} status updated to: ${status}`);
        return true;
    }
    
    return false;
}

// ==================== EXPRESS ROUTES ====================

// Create new PC
router.post('/api/create-pc', (req, res) => {
    try {
        const { pcName, pcLocation, pcOwner, pcType, pcDescription } = req.body;
        
        // Validate required fields
        if (!pcName || !pcLocation || !pcOwner) {
            return res.status(400).json({
                success: false,
                error: 'PC Name, Location, and Owner are required'
            });
        }
        
        // Create new PC
        const pc = createPC(pcName, pcLocation, pcOwner, pcType, pcDescription);
        
        // Save PC
        const pcs = loadPCs();
        pcs[pc.pcId] = pc;
        savePCs(pcs);
        
        // Generate agent command
        const serverUrl = process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com';
        const agentCommand = `node agent.js ${pc.pcId} ${pc.authToken} ${serverUrl}`;
        
        console.log(`🖥️ PC created: ${pc.pcId} - ${pcName}`);
        
        res.json({
            success: true,
            pc: {
                pcId: pc.pcId,
                pcName: pc.pcName,
                status: pc.status,
                createdAt: pc.createdAt
            },
            agentCommand: agentCommand,
            message: 'PC created successfully. Waiting for agent to connect...'
        });
        
    } catch (error) {
        console.error('❌ Error creating PC:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create PC: ' + error.message
        });
    }
});

// Connect agent to latest waiting PC
router.post('/api/connect-agent', (req, res) => {
    try {
        // Get saved API key
        const apiKeys = loadApiKeys();
        
        if (!apiKeys.openrouter) {
            return res.status(400).json({
                success: false,
                error: 'No API key configured. Please save an API key first.'
            });
        }
        
        // Find latest waiting PC
        const waitingPC = getLatestWaitingPC();
        
        if (!waitingPC) {
            return res.status(404).json({
                success: false,
                error: 'No PCs waiting for agent. Create a PC first.'
            });
        }
        
        // Generate agent command for this PC
        const serverUrl = process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com';
        const agentCommand = `node agent.js ${waitingPC.pcId} ${waitingPC.authToken} ${serverUrl}`;
        
        console.log(`🔗 Agent connection initiated for PC: ${waitingPC.pcId}`);
        
        res.json({
            success: true,
            pc: {
                pcId: waitingPC.pcId,
                pcName: waitingPC.pcName,
                status: waitingPC.status,
                createdAt: waitingPC.createdAt
            },
            agentCommand: agentCommand,
            apiKey: apiKeys.openrouter, // Include API key for agent setup
            message: `Connecting agent to PC: ${waitingPC.pcName} (${waitingPC.pcId})`
        });
        
    } catch (error) {
        console.error('❌ Error connecting agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect agent: ' + error.message
        });
    }
});

// Get all registered PCs
router.get('/api/registered-pcs', (req, res) => {
    try {
        const pcs = loadPCs();
        const pcsArray = Object.values(pcs).map(pc => ({
            pcId: pc.pcId,
            pcName: pc.pcName,
            status: pc.status,
            lastHeartbeat: pc.lastHeartbeat,
            location: pc.location,
            owner: pc.owner,
            type: pc.type,
            createdAt: pc.createdAt,
            lastUpdated: pc.lastUpdated
        }));
        
        // Sort by creation date (newest first)
        pcsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
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

// Get PC details
router.get('/api/pc/:pcId', (req, res) => {
    try {
        const { pcId } = req.params;
        const pcs = loadPCs();
        
        if (pcs[pcId]) {
            res.json({
                success: true,
                pc: pcs[pcId]
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
    } catch (error) {
        console.error('❌ Error fetching PC details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch PC details: ' + error.message
        });
    }
});

// Delete PC
router.delete('/api/pc/:pcId', (req, res) => {
    try {
        const { pcId } = req.params;
        const pcs = loadPCs();
        
        if (pcs[pcId]) {
            delete pcs[pcId];
            savePCs(pcs);
            
            console.log(`🗑️ PC deleted: ${pcId}`);
            
            res.json({
                success: true,
                message: 'PC deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
    } catch (error) {
        console.error('❌ Error deleting PC:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete PC: ' + error.message
        });
    }
});

// Heartbeat endpoint for agents
router.post('/api/heartbeat', (req, res) => {
    try {
        const { pcId, authToken, systemInfo } = req.body;
        
        if (!pcId || !authToken) {
            return res.status(400).json({
                success: false,
                error: 'PC ID and auth token are required'
            });
        }
        
        const pcs = loadPCs();
        const pc = pcs[pcId];
        
        if (!pc) {
            return res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
        if (pc.authToken !== authToken) {
            return res.status(401).json({
                success: false,
                error: 'Invalid auth token'
            });
        }
        
        // Update PC status and heartbeat
        updatePCStatus(pcId, 'ONLINE', {
            lastHeartbeat: new Date().toISOString(),
            systemInfo: systemInfo,
            agentConnected: true
        });
        
        console.log(`💓 Heartbeat received from PC: ${pcId}`);
        
        res.json({
            success: true,
            message: 'Heartbeat received',
            status: 'ONLINE'
        });
        
    } catch (error) {
        console.error('❌ Error processing heartbeat:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process heartbeat: ' + error.message
        });
    }
});

// Get statistics
router.get('/api/stats', (req, res) => {
    try {
        const pcs = loadPCs();
        const pcsArray = Object.values(pcs);
        
        const stats = {
            total: pcsArray.length,
            online: pcsArray.filter(pc => pc.status === 'ONLINE').length,
            offline: pcsArray.filter(pc => pc.status === 'OFFLINE').length,
            waiting: pcsArray.filter(pc => pc.status === 'WAITING_FOR_AGENT').length,
            lastUpdated: new Date().toISOString()
        };
        
        res.json({
            success: true,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats: ' + error.message
        });
    }
});

module.exports = router;
