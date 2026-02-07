// PHASE 1 - SYSTEM TRUTH (NON-NEGOTIABLE)
// SYSTEM TRUTH RULES IMPLEMENTED:
// 1. Server is the ONLY source of truth
// 2. UI never fabricates state
// 3. A PC is ONLINE ONLY if heartbeats are received
// 4. Creating a PC ≠ connecting a PC
// 5. Agent is the only entity allowed to connect PCs

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
        
        // PHASE 2 - API KEY BLOCKING LOGIC
        // Check if API key exists and is valid
        const apiKeys = loadApiKeys();
        if (!apiKeys || Object.keys(apiKeys).length === 0) {
            return res.status(403).json({
                success: false,
                error: 'API key not configured. Please configure API key first.',
                blocked: true
            });
        }
        
        // Validate API key format and existence
        const isValidApiKey = validateApiKey(Object.keys(apiKeys)[0]);
        if (!isValidApiKey) {
            return res.status(403).json({
                success: false,
                error: 'Invalid API key. Please configure a valid API key.',
                blocked: true
            });
        }
        
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
        
        // PHASE 9 - Log PC creation
        logEvent('PC_CREATED', {
            pcId: pc.pcId,
            pcName: pc.pcName,
            pcLocation: pc.pcLocation,
            pcOwner: pc.pcOwner,
            status: pc.status
        });
        
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

// PHASE 4 - AGENT CONNECTION (REAL PCS ONLY)
// Agent registration with strict validation
router.post('/api/register-agent', (req, res) => {
    try {
        const { pc_id, auth_token, hostname, OS, local_ip } = req.body;
        
        // Validate required fields
        if (!pc_id || !auth_token) {
            return res.status(400).json({
                success: false,
                error: 'PC ID and auth token are required'
            });
        }
        
        // Load PCs and find the PC
        const pcs = loadPCs();
        const pc = pcs[pc_id];
        
        if (!pc) {
            return res.status(404).json({
                success: false,
                error: 'PC not found'
            });
        }
        
        // Validate PC status must be WAITING_FOR_AGENT
        if (pc.status !== 'WAITING_FOR_AGENT') {
            return res.status(400).json({
                success: false,
                error: 'PC is not waiting for agent. Current status: ' + pc.status
            });
        }
        
        // Validate auth token matches
        if (pc.authToken !== auth_token) {
            return res.status(401).json({
                success: false,
                error: 'Invalid auth token'
            });
        }
        
        // Validate API key exists and is valid
        const apiKeys = loadApiKeys();
        if (!apiKeys || Object.keys(apiKeys).length === 0) {
            return res.status(403).json({
                success: false,
                error: 'API key not configured'
            });
        }
        
        // CRITICAL: PC is NOT ONLINE yet - only AGENT_CONNECTED
        updatePCStatus(pc_id, 'AGENT_CONNECTED', {
            agentConnected: true,
            systemInfo: {
                hostname: hostname || 'Unknown',
                OS: OS || 'Unknown',
                local_ip: local_ip || 'Unknown'
            },
            connectedAt: new Date().toISOString()
        });
        
        // PHASE 9 - Log agent registration
        logEvent('AGENT_REGISTERED', {
            pcId: pc_id,
            pcName: pc.pcName,
            hostname: hostname,
            OS: OS,
            local_ip: local_ip,
            status: 'AGENT_CONNECTED'
        });
        
        console.log(`✅ Agent registered for PC: ${pc_id} (${pc.pcName})`);
        
        res.json({
            success: true,
            message: 'Agent registered successfully. Waiting for first heartbeat...',
            pc_id: pc_id,
            status: 'AGENT_CONNECTED'
        });
        
    } catch (error) {
        console.error('❌ Error registering agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register agent: ' + error.message
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

// PHASE 5 - HEARTBEAT & OFFLINE LOGIC
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
        
        // PHASE 5 LOGIC: Only mark ONLINE on first heartbeat from AGENT_CONNECTED
        const isFirstHeartbeat = pc.status === 'AGENT_CONNECTED';
        const newStatus = isFirstHeartbeat ? 'ONLINE' : pc.status;
        
        // Update PC status and heartbeat
        updatePCStatus(pcId, newStatus, {
            lastHeartbeat: new Date().toISOString(),
            systemInfo: systemInfo,
            agentConnected: true
        });
        
        if (isFirstHeartbeat) {
            console.log(`🎉 First heartbeat! PC ${pcId} is now ONLINE`);
            
            // PHASE 9 - Log first heartbeat and status transition
            logEvent('FIRST_HEARTBEAT', {
                pcId: pcId,
                pcName: pc.pcName,
                previousStatus: 'AGENT_CONNECTED',
                newStatus: 'ONLINE',
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`💓 Heartbeat received from PC: ${pcId} (status: ${newStatus})`);
            
            // PHASE 9 - Log heartbeat
            logEvent('HEARTBEAT_RECEIVED', {
                pcId: pcId,
                pcName: pc.pcName,
                status: newStatus,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json({
            success: true,
            message: 'Heartbeat received',
            status: newStatus,
            isFirstHeartbeat: isFirstHeartbeat
        });
        
    } catch (error) {
        console.error('❌ Error processing heartbeat:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process heartbeat: ' + error.message
        });
    }
});

// PHASE 5 - OFFLINE DETECTION (10 seconds)
// Check for offline PCs
router.post('/api/check-offline-pcs', (req, res) => {
    try {
        const pcs = loadPCs();
        const now = new Date();
        let updatedCount = 0;
        
        Object.values(pcs).forEach(pc => {
            if (pc.status === 'ONLINE' && pc.lastHeartbeat) {
                const lastHeartbeat = new Date(pc.lastHeartbeat);
                const timeDiff = now - lastHeartbeat;
                
                // If no heartbeat for 10 seconds, mark as OFFLINE
                if (timeDiff > 10000) { // 10 seconds
                    updatePCStatus(pc.pcId, 'OFFLINE', {
                        agentConnected: false,
                        offlineAt: now.toISOString()
                    });
                    updatedCount++;
                    
                    // PHASE 9 - Log offline transition
                    logEvent('PC_OFFLINE', {
                        pcId: pc.pcId,
                        pcName: pc.pcName,
                        previousStatus: 'ONLINE',
                        newStatus: 'OFFLINE',
                        lastHeartbeat: pc.lastHeartbeat,
                        offlineAt: now.toISOString(),
                        timeSinceLastHeartbeat: Math.round(timeDiff/1000)
                    });
                    
                    console.log(`⚠️ PC ${pc.pcId} marked OFFLINE (no heartbeat for ${Math.round(timeDiff/1000)}s)`);
                }
            }
        });
        
        res.json({
            success: true,
            message: `Checked ${Object.keys(pcs).length} PCs for offline status`,
            updatedCount: updatedCount,
            timestamp: now.toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error checking offline PCs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check offline PCs: ' + error.message
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

// PHASE 2 - API KEY STATUS (PERSISTENT & BLOCKING)
// Load API key on page load
router.get('/api/api-key-status', (req, res) => {
    try {
        const apiKeys = loadApiKeys();
        
        if (!apiKeys || Object.keys(apiKeys).length === 0) {
            return res.json({
                success: true,
                configured: false,
                apiKey: null,
                message: 'API key not configured'
            });
        }
        
        const apiKey = Object.keys(apiKeys)[0];
        const isValid = validateApiKey(apiKey);
        
        res.json({
            success: true,
            configured: true,
            apiKey: apiKey,
            isValid: isValid,
            message: isValid ? 'API key configured' : 'Invalid API key format'
        });
        
    } catch (error) {
        console.error('❌ Error checking API key status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check API key status: ' + error.message
        });
    }
});

// PHASE 9 - DEBUG LOGGING (MANDATORY)
// Comprehensive logging system for all critical events

function logEvent(event, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp: timestamp,
        event: event,
        data: data
    };
    
    console.log(`📋 [${timestamp}] ${event}:`, JSON.stringify(data, null, 2));
    
    // Store in memory for debugging (keep last 100 events)
    if (!global.eventLog) global.eventLog = [];
    global.eventLog.unshift(logEntry);
    if (global.eventLog.length > 100) global.eventLog.splice(100);
}

// Get event log for debugging
router.get('/api/event-log', (req, res) => {
    try {
        res.json({
            success: true,
            events: global.eventLog || [],
            count: (global.eventLog || []).length
        });
    } catch (error) {
        console.error('❌ Error fetching event log:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event log: ' + error.message
        });
    }
});

// PHASE 7 - NOTIFICATIONS (CRITICAL ERRORS ONLY)
// Notification storage (in memory for now, could be persisted)
const notifications = [];

// Add critical error notification
function addCriticalNotification(message, details = {}) {
    const notification = {
        id: Date.now(),
        type: 'critical_error',
        message: message,
        details: details,
        timestamp: new Date().toISOString()
    };
    
    notifications.unshift(notification); // Add to beginning
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications.splice(50);
    }
    
    // PHASE 9 - Log critical notification
    logEvent('CRITICAL_NOTIFICATION', { message, details });
    
    console.error(`🚨 CRITICAL NOTIFICATION: ${message}`);
    return notification;
}

// Get notifications (critical errors only)
router.get('/api/notifications', (req, res) => {
    try {
        res.json({
            success: true,
            notifications: notifications,
            count: notifications.length
        });
        
    } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications: ' + error.message
        });
    }
});

// Clear notifications
router.delete('/api/notifications', (req, res) => {
    try {
        notifications.length = 0; // Clear array
        
        res.json({
            success: true,
            message: 'Notifications cleared'
        });
        
    } catch (error) {
        console.error('❌ Error clearing notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear notifications: ' + error.message
        });
    }
});

// PHASE 8 - REAL-TIME DASHBOARD SYNC
// Get all data for dashboard (single call for polling)
router.get('/api/dashboard-sync', (req, res) => {
    try {
        const pcs = loadPCs();
        const pcsArray = Object.values(pcs);
        
        const stats = {
            total: pcsArray.length,
            online: pcsArray.filter(pc => pc.status === 'ONLINE').length,
            offline: pcsArray.filter(pc => pc.status === 'OFFLINE').length,
            waiting: pcsArray.filter(pc => pc.status === 'WAITING_FOR_AGENT').length,
            connected: pcsArray.filter(pc => pc.status === 'AGENT_CONNECTED').length,
            lastUpdated: new Date().toISOString()
        };
        
        // Format PCs for dashboard
        const formattedPCs = pcsArray.map(pc => ({
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
        })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({
            success: true,
            stats: stats,
            pcs: formattedPCs,
            notifications: notifications.slice(0, 10), // Last 10 notifications
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error syncing dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync dashboard: ' + error.message
        });
    }
});

// PHASE 10 - ACCEPTANCE TESTS (PASS OR FAIL)
// All tests must pass for system to be considered working

// Test 1: Create PC with empty form → FAIL
router.post('/api/test/1-empty-form', async (req, res) => {
    try {
        console.log('🧪 TEST 1: Create PC with empty form');
        
        const response = await fetch('http://localhost:3000/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        const result = await response.json();
        
        const passed = !result.success && result.error && response.status === 400;
        
        logEvent('TEST_1_EMPTY_FORM', {
            passed: passed,
            responseStatus: response.status,
            result: result
        });
        
        res.json({
            success: true,
            test: 'Create PC with empty form',
            expected: 'FAIL - Should return 400 error',
            actual: passed ? 'FAIL (as expected)' : 'PASS (unexpected)',
            passed: passed,
            details: result
        });
        
    } catch (error) {
        console.error('❌ TEST 1 ERROR:', error);
        res.status(500).json({
            success: false,
            test: 'Create PC with empty form',
            error: error.message
        });
    }
});

// Test 2: Create PC valid → WAITING_FOR_AGENT
router.post('/api/test/2-valid-pc', async (req, res) => {
    try {
        console.log('🧪 TEST 2: Create PC valid → WAITING_FOR_AGENT');
        
        const validPCData = {
            pcName: 'Test PC',
            pcLocation: 'Test Location',
            pcOwner: 'Test Owner',
            pcType: 'Test Type',
            pcDescription: 'Test Description'
        };
        
        const response = await fetch('http://localhost:3000/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(validPCData)
        });
        
        const result = await response.json();
        
        const passed = result.success && result.pc && result.pc.status === 'WAITING_FOR_AGENT';
        
        logEvent('TEST_2_VALID_PC', {
            passed: passed,
            responseStatus: response.status,
            result: result
        });
        
        res.json({
            success: true,
            test: 'Create PC valid → WAITING_FOR_AGENT',
            expected: 'SUCCESS with status WAITING_FOR_AGENT',
            actual: passed ? 'SUCCESS (as expected)' : 'FAIL (unexpected)',
            passed: passed,
            details: result
        });
        
    } catch (error) {
        console.error('❌ TEST 2 ERROR:', error);
        res.status(500).json({
            success: false,
            test: 'Create PC valid → WAITING_FOR_AGENT',
            error: error.message
        });
    }
});

// Test 3: Run agent → ONLINE after heartbeat
router.post('/api/test/3-agent-online', async (req, res) => {
    try {
        console.log('🧪 TEST 3: Run agent → ONLINE after heartbeat');
        
        // First create a PC
        const pcResponse = await fetch('http://localhost:3000/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcName: 'Agent Test PC',
                pcLocation: 'Test Location',
                pcOwner: 'Test Owner'
            })
        });
        
        const pcResult = await pcResponse.json();
        
        if (!pcResult.success) {
            throw new Error('Failed to create test PC');
        }
        
        const pcId = pcResult.pc.pcId;
        const authToken = pcResult.pc.authToken || (await fetch(`http://localhost:3000/api/pc/${pcId}`)).json().pc.authToken;
        
        // Register agent
        const registerResponse = await fetch('http://localhost:3000/api/register-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pc_id: pcId,
                auth_token: authToken,
                hostname: 'test-host',
                OS: 'test-os',
                local_ip: '127.0.0.1'
            })
        });
        
        const registerResult = await registerResponse.json();
        
        if (!registerResult.success) {
            throw new Error('Failed to register agent');
        }
        
        // Send first heartbeat
        const heartbeatResponse = await fetch('http://localhost:3000/api/heartbeat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcId: pcId,
                authToken: authToken,
                systemInfo: {
                    hostname: 'test-host',
                    OS: 'test-os'
                }
            })
        });
        
        const heartbeatResult = await heartbeatResponse.json();
        
        const passed = heartbeatResult.success && heartbeatResult.status === 'ONLINE' && heartbeatResult.isFirstHeartbeat;
        
        logEvent('TEST_3_AGENT_ONLINE', {
            passed: passed,
            pcId: pcId,
            registerResult: registerResult,
            heartbeatResult: heartbeatResult
        });
        
        res.json({
            success: true,
            test: 'Run agent → ONLINE after heartbeat',
            expected: 'Agent registers and goes ONLINE after first heartbeat',
            actual: passed ? 'SUCCESS (as expected)' : 'FAIL (unexpected)',
            passed: passed,
            details: {
                pcId: pcId,
                registerResult: registerResult,
                heartbeatResult: heartbeatResult
            }
        });
        
    } catch (error) {
        console.error('❌ TEST 3 ERROR:', error);
        res.status(500).json({
            success: false,
            test: 'Run agent → ONLINE after heartbeat',
            error: error.message
        });
    }
});

// Test 4: Stop agent → OFFLINE
router.post('/api/test/4-agent-offline', async (req, res) => {
    try {
        console.log('🧪 TEST 4: Stop agent → OFFLINE');
        
        // Create PC and register agent (reuse logic from test 3)
        const pcResponse = await fetch('http://localhost:3000/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcName: 'Offline Test PC',
                pcLocation: 'Test Location',
                pcOwner: 'Test Owner'
            })
        });
        
        const pcResult = await pcResponse.json();
        const pcId = pcResult.pc.pcId;
        const authToken = pcResult.pc.authToken || (await fetch(`http://localhost:3000/api/pc/${pcId}`)).json().pc.authToken;
        
        // Register and send heartbeat to make it ONLINE
        await fetch('http://localhost:3000/api/register-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pc_id: pcId,
                auth_token: authToken,
                hostname: 'test-host',
                OS: 'test-os'
            })
        });
        
        await fetch('http://localhost:3000/api/heartbeat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcId: pcId,
                authToken: authToken
            })
        });
        
        // Wait 11 seconds to simulate agent stopping
        await new Promise(resolve => setTimeout(resolve, 11000));
        
        // Check offline PCs
        const offlineResponse = await fetch('http://localhost:3000/api/check-offline-pcs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const offlineResult = await offlineResponse.json();
        
        // Check PC status
        const pcStatusResponse = await fetch(`http://localhost:3000/api/pc/${pcId}`);
        const pcStatusResult = await pcStatusResponse.json();
        
        const passed = pcStatusResult.success && pcStatusResult.pc.status === 'OFFLINE';
        
        logEvent('TEST_4_AGENT_OFFLINE', {
            passed: passed,
            pcId: pcId,
            offlineResult: offlineResult,
            pcStatus: pcStatusResult.pc.status
        });
        
        res.json({
            success: true,
            test: 'Stop agent → OFFLINE',
            expected: 'PC marked OFFLINE after 10 seconds without heartbeat',
            actual: passed ? 'SUCCESS (as expected)' : 'FAIL (unexpected)',
            passed: passed,
            details: {
                pcId: pcId,
                offlineResult: offlineResult,
                pcStatus: pcStatusResult.pc.status
            }
        });
        
    } catch (error) {
        console.error('❌ TEST 4 ERROR:', error);
        res.status(500).json({
            success: false,
            test: 'Stop agent → OFFLINE',
            error: error.message
        });
    }
});

// Test 5: Refresh page → state preserved
router.post('/api/test/5-state-preserved', async (req, res) => {
    try {
        console.log('🧪 TEST 5: Refresh page → state preserved');
        
        // Create a PC
        const pcResponse = await fetch('http://localhost:3000/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcName: 'State Test PC',
                pcLocation: 'Test Location',
                pcOwner: 'Test Owner'
            })
        });
        
        const pcResult = await pcResponse.json();
        const pcId = pcResult.pc.pcId;
        
        // Get initial state
        const initialSyncResponse = await fetch('http://localhost:3000/api/dashboard-sync');
        const initialState = await initialSyncResponse.json();
        
        // Simulate page refresh by checking state again
        const refreshSyncResponse = await fetch('http://localhost:3000/api/dashboard-sync');
        const refreshState = await refreshSyncResponse.json();
        
        const passed = refreshState.success && 
                     refreshState.pcs.some(pc => pc.pcId === pcId) &&
                     initialState.pcs.length === refreshState.pcs.length;
        
        logEvent('TEST_5_STATE_PRESERVED', {
            passed: passed,
            pcId: pcId,
            initialState: initialState,
            refreshState: refreshState
        });
        
        res.json({
            success: true,
            test: 'Refresh page → state preserved',
            expected: 'PC state preserved across refresh',
            actual: passed ? 'SUCCESS (as expected)' : 'FAIL (unexpected)',
            passed: passed,
            details: {
                pcId: pcId,
                initialPCs: initialState.pcs.length,
                refreshPCs: refreshState.pcs.length,
                pcFound: refreshState.pcs.some(pc => pc.pcId === pcId)
            }
        });
        
    } catch (error) {
        console.error('❌ TEST 5 ERROR:', error);
        res.status(500).json({
            success: false,
            test: 'Refresh page → state preserved',
            error: error.message
        });
    }
});

// Test 6: Multiple PCs → isolated
router.post('/api/test/6-multiple-isolated', async (req, res) => {
    try {
        console.log('🧪 TEST 6: Multiple PCs → isolated');
        
        // Create two PCs
        const pc1Response = await fetch('http://localhost:3000/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcName: 'Isolation Test PC 1',
                pcLocation: 'Location 1',
                pcOwner: 'Owner 1'
            })
        });
        
        const pc2Response = await fetch('http://localhost:3000/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcName: 'Isolation Test PC 2',
                pcLocation: 'Location 2',
                pcOwner: 'Owner 2'
            })
        });
        
        const pc1Result = await pc1Response.json();
        const pc2Result = await pc2Response.json();
        
        if (!pc1Result.success || !pc2Result.success) {
            throw new Error('Failed to create test PCs');
        }
        
        const pc1Id = pc1Result.pc.pcId;
        const pc2Id = pc2Result.pc.pcId;
        
        // Try to use PC1's auth token with PC2 (should fail)
        const pc1Auth = pc1Result.pc.authToken || (await fetch(`http://localhost:3000/api/pc/${pc1Id}`)).json().pc.authToken;
        
        const invalidRegisterResponse = await fetch('http://localhost:3000/api/register-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pc_id: pc2Id, // Using PC2 ID
                auth_token: pc1Auth, // But PC1's auth token
                hostname: 'test-host',
                OS: 'test-os'
            })
        });
        
        const invalidRegisterResult = await invalidRegisterResponse.json();
        
        // Verify PCs are separate in dashboard
        const syncResponse = await fetch('http://localhost:3000/api/dashboard-sync');
        const syncState = await syncResponse.json();
        
        const passed = !invalidRegisterResult.success && 
                     syncState.pcs.some(pc => pc.pcId === pc1Id) &&
                     syncState.pcs.some(pc => pc.pcId === pc2Id) &&
                     pc1Id !== pc2Id;
        
        logEvent('TEST_6_MULTIPLE_ISOLATED', {
            passed: passed,
            pc1Id: pc1Id,
            pc2Id: pc2Id,
            invalidRegisterResult: invalidRegisterResult,
            totalPCs: syncState.pcs.length
        });
        
        res.json({
            success: true,
            test: 'Multiple PCs → isolated',
            expected: 'PCs are isolated - PC1 auth token cannot access PC2',
            actual: passed ? 'SUCCESS (as expected)' : 'FAIL (unexpected)',
            passed: passed,
            details: {
                pc1Id: pc1Id,
                pc2Id: pc2Id,
                isolationTest: !invalidRegisterResult.success,
                totalPCs: syncState.pcs.length,
                bothPCsFound: syncState.pcs.some(pc => pc.pcId === pc1Id) && syncState.pcs.some(pc => pc.pcId === pc2Id)
            }
        });
        
    } catch (error) {
        console.error('❌ TEST 6 ERROR:', error);
        res.status(500).json({
            success: false,
            test: 'Multiple PCs → isolated',
            error: error.message
        });
    }
});

// Run all tests
router.get('/api/test/run-all', async (req, res) => {
    try {
        console.log('🧪 RUNNING ALL ACCEPTANCE TESTS');
        
        const tests = [
            '/api/test/1-empty-form',
            '/api/test/2-valid-pc',
            '/api/test/3-agent-online',
            '/api/test/4-agent-offline',
            '/api/test/5-state-preserved',
            '/api/test/6-multiple-isolated'
        ];
        
        const results = [];
        let passedCount = 0;
        
        for (const testPath of tests) {
            try {
                const response = await fetch(`http://localhost:3000${testPath}`, {
                    method: 'POST'
                });
                const result = await response.json();
                results.push(result);
                if (result.passed) passedCount++;
            } catch (error) {
                results.push({
                    success: false,
                    test: testPath,
                    error: error.message,
                    passed: false
                });
            }
        }
        
        const allPassed = passedCount === tests.length;
        
        logEvent('ALL_TESTS_COMPLETED', {
            totalTests: tests.length,
            passedCount: passedCount,
            failedCount: tests.length - passedCount,
            allPassed: allPassed,
            results: results
        });
        
        res.json({
            success: true,
            summary: {
                total: tests.length,
                passed: passedCount,
                failed: tests.length - passedCount,
                allPassed: allPassed
            },
            results: results,
            status: allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'
        });
        
    } catch (error) {
        console.error('❌ RUN ALL TESTS ERROR:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run all tests: ' + error.message
        });
    }
});

module.exports = router;
