// Automated PC Management System - Full validation, auto-connection, and debug logging
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Import automated API system
const { loadApiKeys, validateApiKey, debugLog } = require('./automated-api-system.js');

// File paths
const PC_DATA_FILE = path.join(__dirname, 'data', 'pcs.json');
const DEBUG_LOG_FILE = path.join(__dirname, 'data', 'auto-debug.log');

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
            
            debugLog('DEBUG', 'PCs loaded from persistent storage', { 
                count: Object.keys(pcs).length,
                pcIds: Object.keys(pcs)
            });
            
            return pcs;
        } else {
            debugLog('DEBUG', 'No PC file found, creating new one');
            return {};
        }
    } catch (error) {
        debugLog('ERROR', 'Error loading PCs', { error: error.message });
        return {};
    }
}

// Save PCs to file with backup
function savePCs(pcs) {
    try {
        ensureDataDirectory();
        
        // Create backup
        if (fs.existsSync(PC_DATA_FILE)) {
            const backupPath = PC_DATA_FILE + '.backup';
            fs.copyFileSync(PC_DATA_FILE, backupPath);
            debugLog('DEBUG', 'PC data backup created', { backupPath });
        }
        
        // Write new PCs data
        const data = JSON.stringify(pcs, null, 2);
        fs.writeFileSync(PC_DATA_FILE, data, 'utf8');
        
        debugLog('DEBUG', 'PCs saved to persistent storage', { 
            count: Object.keys(pcs).length,
            pcIds: Object.keys(pcs)
        });
        
        return true;
    } catch (error) {
        debugLog('ERROR', 'Error saving PCs', { error: error.message });
        return false;
    }
}

// Generate secure token
function generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    debugLog('DEBUG', 'Generated new token', { tokenLength: token.length });
    return token;
}

// Generate unique PC ID
function generatePCId() {
    const pcId = `PC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    debugLog('DEBUG', 'Generated new PC ID', { pcId });
    return pcId;
}

// Validate PC creation form
function validatePCForm(pcName, pcLocation, pcOwner, pcType, pcDescription) {
    debugLog('DEBUG', 'Validating PC form', { 
        pcName,
        pcLocation,
        pcOwner,
        pcType,
        hasDescription: !!pcDescription
    });
    
    const errors = {};
    
    // Required field validation
    if (!pcName || typeof pcName !== 'string' || pcName.trim().length === 0) {
        errors.pcName = 'PC Name is required and cannot be empty';
    } else if (pcName.trim().length < 2) {
        errors.pcName = 'PC Name must be at least 2 characters long';
    } else if (pcName.trim().length > 50) {
        errors.pcName = 'PC Name cannot exceed 50 characters';
    }
    
    if (!pcLocation || typeof pcLocation !== 'string' || pcLocation.trim().length === 0) {
        errors.pcLocation = 'Location is required and cannot be empty';
    } else if (pcLocation.trim().length < 2) {
        errors.pcLocation = 'Location must be at least 2 characters long';
    } else if (pcLocation.trim().length > 50) {
        errors.pcLocation = 'Location cannot exceed 50 characters';
    }
    
    if (!pcOwner || typeof pcOwner !== 'string' || pcOwner.trim().length === 0) {
        errors.pcOwner = 'Owner is required and cannot be empty';
    } else if (pcOwner.trim().length < 2) {
        errors.pcOwner = 'Owner must be at least 2 characters long';
    } else if (pcOwner.trim().length > 50) {
        errors.pcOwner = 'Owner cannot exceed 50 characters';
    }
    
    // Optional field validation
    if (pcDescription && pcDescription.trim().length > 200) {
        errors.pcDescription = 'Description cannot exceed 200 characters';
    }
    
    const isValid = Object.keys(errors).length === 0;
    
    debugLog('DEBUG', 'PC form validation result', { 
        isValid,
        errorCount: Object.keys(errors).length,
        errors
    });
    
    return { isValid, errors };
}

// Create new PC with validation
function createPC(pcName, pcLocation, pcOwner, pcType, pcDescription) {
    const pcId = generatePCId();
    const authToken = generateToken();
    
    const pc = {
        pcId,
        pcName: pcName.trim(),
        pcLocation: pcLocation.trim(),
        pcOwner: pcOwner.trim(),
        pcType: pcType || 'unknown',
        pcDescription: pcDescription ? pcDescription.trim() : '',
        authToken,
        status: 'WAITING_FOR_AGENT',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastHeartbeat: null,
        systemInfo: null,
        agentConnected: false
    };
    
    debugLog('INFO', `PC-${pcId} created successfully`, { 
        pcId,
        pcName: pc.pcName,
        pcLocation: pc.pcLocation,
        pcOwner: pc.pcOwner,
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
    
    debugLog('DEBUG', 'Latest waiting PC requested', { 
        totalWaiting: waitingPCs.length,
        latest: waitingPCs.length > 0 ? waitingPCs[0].pcId : null
    });
    
    return waitingPCs.length > 0 ? waitingPCs[0] : null;
}

// Update PC status with logging
function updatePCStatus(pcId, status, additionalData = {}) {
    const pcs = loadPCs();
    
    if (pcs[pcId]) {
        const oldStatus = pcs[pcId].status;
        pcs[pcId].status = status;
        pcs[pcId].lastUpdated = new Date().toISOString();
        
        // Add additional data
        Object.assign(pcs[pcId], additionalData);
        
        savePCs(pcs);
        
        debugLog('INFO', `PC-${pcId} status updated`, { 
            pcId,
            oldStatus,
            newStatus: status,
            additionalData
        });
        
        return true;
    } else {
        debugLog('ERROR', `PC-${pcId} status update failed - PC not found`, { pcId });
        return false;
    }
}

// ==================== EXPRESS ROUTES ====================

// Create new PC with comprehensive validation
router.post('/api/create-pc', (req, res) => {
    debugLog('DEBUG', 'PC creation request received', { 
        body: req.body,
        hasRequiredFields: !!(req.body.pcName && req.body.pcLocation && req.body.pcOwner)
    });
    
    try {
        const { pcName, pcLocation, pcOwner, pcType, pcDescription } = req.body;
        
        // Validate form fields
        const validation = validatePCForm(pcName, pcLocation, pcOwner, pcType, pcDescription);
        
        if (!validation.isValid) {
            debugLog('ERROR', 'PC creation validation failed', { errors: validation.errors });
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                validationErrors: validation.errors
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
        
        debugLog('INFO', 'PC creation successful', { 
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
            message: 'PC created successfully and waiting for agent connection'
        });
        
    } catch (error) {
        debugLog('ERROR', 'PC creation exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to create PC: ' + error.message
        });
    }
});

// Automated agent connection to latest waiting PC
router.post('/api/connect-agent', (req, res) => {
    debugLog('DEBUG', 'Automated agent connection request received');
    
    try {
        // Validate API key first (blocks connection if invalid)
        const apiKeys = loadApiKeys();
        
        if (!apiKeys.openrouter) {
            debugLog('ERROR', 'Agent connection failed - no API key configured');
            return res.status(400).json({
                success: false,
                error: 'No API key configured. Please save an API key first.',
                blockConnection: true
            });
        }
        
        // Validate API key format
        const keyValidation = validateApiKey(apiKeys.openrouter);
        if (!keyValidation.valid) {
            debugLog('ERROR', 'Agent connection failed - invalid API key', { error: keyValidation.error });
            return res.status(400).json({
                success: false,
                error: 'Invalid API key format. Please save a valid API key first.',
                blockConnection: true
            });
        }
        
        debugLog('DEBUG', 'Connecting agent with API key', { 
            keyLength: apiKeys.openrouter.length,
            keyPrefix: apiKeys.openrouter.substring(0, 7) + '...'
        });
        
        // Automatically find latest waiting PC
        const waitingPC = getLatestWaitingPC();
        
        if (!waitingPC) {
            debugLog('ERROR', 'Agent connection failed - no waiting PCs');
            return res.status(404).json({
                success: false,
                error: 'No PCs waiting for agent. Create a PC first.',
                blockConnection: true
            });
        }
        
        // Generate agent command for this PC
        const serverUrl = process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com';
        const agentCommand = `node agent.js ${waitingPC.pcId} ${waitingPC.authToken} ${serverUrl}`;
        
        debugLog('DEBUG', 'Automated agent connection initiated', { 
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
            message: `Automatically connecting agent to PC: ${waitingPC.pcName} (${waitingPC.pcId})`,
            connectionProgress: {
                step: 'initiated',
                message: 'Agent connection initiated. Run the command below to complete connection.'
            }
        });
        
    } catch (error) {
        debugLog('ERROR', 'Agent connection exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to connect agent: ' + error.message,
            blockConnection: true
        });
    }
});

// Get all registered PCs
router.get('/api/registered-pcs', (req, res) => {
    debugLog('DEBUG', 'Registered PCs request received');
    
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
            lastUpdated: pc.lastUpdated,
            agentConnected: pc.agentConnected
        }));
        
        // Sort by creation date (newest first)
        pcsArray.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        debugLog('DEBUG', 'Registered PCs retrieved', { 
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
        debugLog('ERROR', 'Registered PCs exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch registered PCs: ' + error.message
        });
    }
});

// Heartbeat endpoint for agents (only updates to ONLINE after real heartbeat)
router.post('/api/heartbeat', (req, res) => {
    debugLog('DEBUG', 'Heartbeat request received', { 
        hasPcId: !!req.body.pcId,
        hasAuthToken: !!req.body.authToken,
        hasSystemInfo: !!req.body.systemInfo
    });
    
    try {
        const { pcId, authToken, systemInfo } = req.body;
        
        if (!pcId || !authToken) {
            debugLog('ERROR', 'Heartbeat validation failed', { 
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
            debugLog('ERROR', 'Heartbeat failed - PC not found', { pcId });
            return res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
        if (pc.authToken !== authToken) {
            debugLog('ERROR', 'Heartbeat failed - invalid auth token', { 
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
        
        debugLog('INFO', `Heartbeat received from PC-${pcId}`, { 
            pcId,
            oldStatus,
            newStatus,
            hasSystemInfo: !!systemInfo
        });
        
        res.json({
            success: true,
            message: 'Heartbeat received and PC status updated to ONLINE',
            status: newStatus
        });
        
    } catch (error) {
        debugLog('ERROR', 'Heartbeat exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to process heartbeat: ' + error.message
        });
    }
});

// Delete PC
router.delete('/api/pc/:pcId', (req, res) => {
    debugLog('DEBUG', 'PC deletion request received', { pcId: req.params.pcId });
    
    try {
        const { pcId } = req.params;
        const pcs = loadPCs();
        
        if (pcs[pcId]) {
            delete pcs[pcId];
            savePCs(pcs);
            
            debugLog('INFO', `PC-${pcId} deleted successfully`, { pcId });
            
            res.json({
                success: true,
                message: 'PC deleted successfully'
            });
        } else {
            debugLog('ERROR', 'PC deletion failed - PC not found', { pcId });
            res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
    } catch (error) {
        debugLog('ERROR', 'PC deletion exception', { error: error.message, stack: error.stack });
        res.status(500).json({
            success: false,
            error: 'Failed to delete PC: ' + error.message
        });
    }
});

module.exports = router;
