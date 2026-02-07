// Debug-Enabled PC Management System - Proper agent connection logic with logging
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Import debug API key system
const { loadApiKeys, validateApiKey } = require('./debug-api-system.js');

// File paths
const PC_DATA_FILE = path.join(__dirname, 'data', 'pcs.json');
const DEBUG_LOG_FILE = path.join(__dirname, 'data', 'debug-pc.log');

// Ensure data directory exists
function ensureDataDirectory() {
    const dataDir = path.dirname(PC_DATA_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Debug logging function for PC operations
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? ' | Data: ' + JSON.stringify(data) : ''}\n`;
    
    console.log(`🖥️ PC-DEBUG: ${message}`, data || '');
    
    try {
        fs.appendFileSync(DEBUG_LOG_FILE, logEntry);
    } catch (error) {
        console.error('❌ Failed to write PC debug log:', error);
    }
}

// Load PCs from file
function loadPCs() {
    try {
        ensureDataDirectory();
        
        if (fs.existsSync(PC_DATA_FILE)) {
            const data = fs.readFileSync(PC_DATA_FILE, 'utf8');
            const pcs = JSON.parse(data);
            debugLog('PCs loaded from persistent storage', { 
                count: Object.keys(pcs).length,
                pcIds: Object.keys(pcs)
            });
            return pcs;
        } else {
            debugLog('No PC file found, creating new one');
            return {};
        }
    } catch (error) {
        debugLog('Error loading PCs', { error: error.message });
        return {};
    }
}

// Save PCs to file with backup
function savePCs(pcs) {
    try {
        ensureDataDirectory();
        
        // Create backup of existing file
        if (fs.existsSync(PC_DATA_FILE)) {
            const backupPath = PC_DATA_FILE + '.backup';
            fs.copyFileSync(PC_DATA_FILE, backupPath);
            debugLog('PC data backup created', { backupPath });
        }
        
        // Write new PCs data
        const data = JSON.stringify(pcs, null, 2);
        fs.writeFileSync(PC_DATA_FILE, data, 'utf8');
        
        debugLog('PCs saved to persistent storage', { 
            count: Object.keys(pcs).length,
            pcIds: Object.keys(pcs)
        });
        
        return true;
    } catch (error) {
        debugLog('Error saving PCs', { error: error.message });
        return false;
    }
}

// Generate secure token
function generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    debugLog('Generated new token', { tokenLength: token.length });
    return token;
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
    
    debugLog('New PC created', { 
        pcId,
        pcName,
        pcLocation,
        pcOwner,
        status: pc.status
    });
    
    return pc;
}

// Get latest PC waiting for agent (newest first)
function getLatestWaitingPC() {
    const pcs = loadPCs();
    const waitingPCs = Object.values(pcs)
        .filter(pc => pc.status === 'WAITING_FOR_AGENT')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    debugLog('Latest waiting PC requested', { 
        totalWaiting: waitingPCs.length,
        latest: waitingPCs.length > 0 ? waitingPCs[0].pcId : null
    });
    
    return waitingPCs.length > 0 ? waitingPCs[0] : null;
}

// Get oldest PC waiting for agent
function getOldestWaitingPC() {
    const pcs = loadPCs();
    const waitingPCs = Object.values(pcs)
        .filter(pc => pc.status === 'WAITING_FOR_AGENT')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    debugLog('Oldest waiting PC requested', { 
        totalWaiting: waitingPCs.length,
        oldest: waitingPCs.length > 0 ? waitingPCs[0].pcId : null
    });
    
    return waitingPCs.length > 0 ? waitingPCs[0] : null;
}

// Update PC status
function updatePCStatus(pcId, status, additionalData = {}) {
    const pcs = loadPCs();
    
    if (pcs[pcId]) {
        const oldStatus = pcs[pcId].status;
        pcs[pcId].status = status;
        pcs[pcId].lastUpdated = new Date().toISOString();
        
        // Add additional data
        Object.assign(pcs[pcId], additionalData);
        
        savePCs(pcs);
        
        debugLog('PC status updated', { 
            pcId,
            oldStatus,
            newStatus: status,
            additionalData
        });
        
        return true;
    } else {
        debugLog('PC status update failed - PC not found', { pcId });
        return false;
    }
}

// ==================== EXPRESS ROUTES ====================

// Create new PC
router.post('/api/create-pc', (req, res) => {
    debugLog('PC creation request received', { 
        body: req.body,
        hasRequiredFields: !!(req.body.pcName && req.body.pcLocation && req.body.pcOwner)
    });
    
    try {
        const { pcName, pcLocation, pcOwner, pcType, pcDescription } = req.body;
        
        // Validate required fields
        if (!pcName || !pcLocation || !pcOwner) {
            debugLog('PC creation validation failed', { 
                missingFields: {
                    pcName: !pcName,
                    pcLocation: !pcLocation,
                    pcOwner: !pcOwner
                }
            });
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
        
        debugLog('PC creation successful', { 
            pcId: pc.pcId,
            pcName: pc.pcName,
            agentCommand
        });
        
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
        debugLog('PC creation exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to create PC: ' + error.message
        });
    }
});

// Connect agent to latest waiting PC (uses saved API key)
router.post('/api/connect-agent', (req, res) => {
    debugLog('Agent connection request received');
    
    try {
        // Validate API key first
        const apiKeys = loadApiKeys();
        
        if (!apiKeys.openrouter) {
            debugLog('Agent connection failed - no API key configured');
            return res.status(400).json({
                success: false,
                error: 'No API key configured. Please save an API key first.'
            });
        }
        
        // Validate API key format
        const keyValidation = validateApiKey(apiKeys.openrouter);
        if (!keyValidation.valid) {
            debugLog('Agent connection failed - invalid API key', { error: keyValidation.error });
            return res.status(400).json({
                success: false,
                error: 'Invalid API key format. Please save a valid API key first.'
            });
        }
        
        // Find latest waiting PC
        const waitingPC = getLatestWaitingPC();
        
        if (!waitingPC) {
            debugLog('Agent connection failed - no waiting PCs');
            return res.status(404).json({
                success: false,
                error: 'No PCs waiting for agent. Create a PC first.'
            });
        }
        
        // Generate agent command for this PC
        const serverUrl = process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com';
        const agentCommand = `node agent.js ${waitingPC.pcId} ${waitingPC.authToken} ${serverUrl}`;
        
        debugLog('Agent connection initiated', { 
            pcId: waitingPC.pcId,
            pcName: waitingPC.pcName,
            apiKeyValid: true,
            agentCommand
        });
        
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
        debugLog('Agent connection exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to connect agent: ' + error.message
        });
    }
});

// Get all registered PCs
router.get('/api/registered-pcs', (req, res) => {
    debugLog('Registered PCs request received');
    
    try {
        const pcs = loadPCs();
        const pcsArray = Object.values(pcs).map(pc => ({
            pcId: pc.pcId,
            pcName: pc.pcName,
            status: pc.status,
            lastHeartbeat: pc.lastHeartbeat,
            location: pc.pcLocation,
            owner: pc.pcOwner,
            type: pc.pcType,
            createdAt: pc.createdAt,
            lastUpdated: pc.lastUpdated
        }));
        
        // Sort by creation date (newest first)
        pcsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        debugLog('Registered PCs retrieved', { 
            count: pcsArray.length,
            statuses: pcsArray.reduce((acc, pc) => {
                acc[pc.status] = (acc[pc.status] || 0) + 1;
                return acc;
            }, {})
        });
        
        res.json({
            success: true,
            pcs: pcsArray,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        debugLog('Registered PCs exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch registered PCs: ' + error.message
        });
    }
});

// Heartbeat endpoint for agents (only updates to ONLINE after real heartbeat)
router.post('/api/heartbeat', (req, res) => {
    debugLog('Heartbeat request received', { 
        hasPcId: !!req.body.pcId,
        hasAuthToken: !!req.body.authToken,
        hasSystemInfo: !!req.body.systemInfo
    });
    
    try {
        const { pcId, authToken, systemInfo } = req.body;
        
        if (!pcId || !authToken) {
            debugLog('Heartbeat validation failed', { 
                missingPcId: !pcId,
                missingAuthToken: !authToken
            });
            return res.status(400).json({
                success: false,
                error: 'PC ID and auth token are required'
            });
        }
        
        const pcs = loadPCs();
        const pc = pcs[pcId];
        
        if (!pc) {
            debugLog('Heartbeat failed - PC not found', { pcId });
            return res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
        if (pc.authToken !== authToken) {
            debugLog('Heartbeat failed - invalid auth token', { 
                pcId,
                providedToken: authToken.substring(0, 8) + '...',
                expectedToken: pc.authToken.substring(0, 8) + '...'
            });
            return res.status(401).json({
                success: false,
                error: 'Invalid auth token'
            });
        }
        
        // Update PC status and heartbeat - ONLY after real agent heartbeat
        const oldStatus = pc.status;
        const newStatus = 'ONLINE';
        
        updatePCStatus(pcId, newStatus, {
            lastHeartbeat: new Date().toISOString(),
            systemInfo: systemInfo,
            agentConnected: true
        });
        
        debugLog('Heartbeat processed successfully', { 
            pcId,
            oldStatus,
            newStatus,
            hasSystemInfo: !!systemInfo
        });
        
        res.json({
            success: true,
            message: 'Heartbeat received',
            status: newStatus
        });
        
    } catch (error) {
        debugLog('Heartbeat exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to process heartbeat: ' + error.message
        });
    }
});

// Delete PC
router.delete('/api/pc/:pcId', (req, res) => {
    debugLog('PC deletion request received', { pcId: req.params.pcId });
    
    try {
        const { pcId } = req.params;
        const pcs = loadPCs();
        
        if (pcs[pcId]) {
            delete pcs[pcId];
            savePCs(pcs);
            
            debugLog('PC deleted successfully', { pcId });
            
            res.json({
                success: true,
                message: 'PC deleted successfully'
            });
        } else {
            debugLog('PC deletion failed - PC not found', { pcId });
            res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
    } catch (error) {
        debugLog('PC deletion exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to delete PC: ' + error.message
        });
    }
});

module.exports = router;
