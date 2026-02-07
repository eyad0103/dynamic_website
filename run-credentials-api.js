// Real Agent API - Server-side agent management
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Store registered PCs and their status
const registeredPCs = new Map();
const pcStatus = new Map(); // ONLINE/OFFLINE status based on heartbeats

// PC status constants
const PC_STATES = {
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    WAITING: 'WAITING_FOR_AGENT'
};

// Generate secure PC credentials
function generatePCCredentials() {
    const pcId = `PC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const authToken = crypto.randomBytes(32).toString('hex');
    const createdAt = new Date().toISOString();
    
    return {
        pcId,
        authToken,
        createdAt,
        serverUrl: process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com'
    };
}

// Phase 1: Input Validation (Fast Fail)
function validateAPIKey(apiKey) {
    const startTime = process.hrtime.bigint();
    
    if (!apiKey || typeof apiKey !== 'string') {
        return {
            valid: false,
            error: 'API key is required',
            code: 'MISSING_API_KEY',
            status: 401
        };
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
        return {
            valid: false,
            error: 'Invalid API key format. Must start with sk-or-v1-',
            code: 'INVALID_API_KEY_FORMAT',
            status: 401
        };
    }
    
    if (apiKey.length < 20) {
        return {
            valid: false,
            error: 'API key appears to be stale or incomplete',
            code: 'STALE_API_KEY',
            status: 401
        };
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;
    
    if (duration > 100) {
        console.warn(`⚠️ Validation took ${duration}ms (should be ≤100ms)`);
    }
    
    return {
        valid: true,
        duration: duration
    };
}

// NEW: /api/run-credentials - Generate PC credentials only
router.post('/api/run-credentials', (req, res) => {
    const requestStart = process.hrtime.bigint();
    
    try {
        const { apiKey } = req.body;
        
        // Phase 1: Input Validation (Fast Fail)
        const validation = validateAPIKey(apiKey);
        if (!validation.valid) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - requestStart) / 1000000;
            
            console.log(`❌ Validation failed in ${duration}ms: ${validation.error}`);
            return res.status(validation.status).json({
                success: false,
                error: validation.error,
                code: validation.code,
                duration: duration
            });
        }
        
        // Generate PC credentials
        const credentials = generatePCCredentials();
        
        // Store PC information
        registeredPCs.set(credentials.pcId, {
            pcId: credentials.pcId,
            authToken: credentials.authToken,
            apiKey: apiKey,
            createdAt: credentials.createdAt,
            userAgent: req.get('User-Agent') || 'Unknown',
            ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
        });
        
        // Mark as waiting for agent
        pcStatus.set(credentials.pcId, {
            state: PC_STATES.WAITING,
            lastSeen: new Date().toISOString(),
            createdAt: credentials.createdAt
        });
        
        const endTime = process.hrtime.bigint();
        const totalDuration = Number(endTime - requestStart) / 1000000;
        
        if (totalDuration > 300) {
            console.warn(`⚠️ Request took ${totalDuration}ms (should be ≤300ms)`);
        }
        
        // Immediate response with PC credentials
        res.json({
            success: true,
            pcId: credentials.pcId,
            authToken: credentials.authToken,
            serverUrl: credentials.serverUrl,
            state: PC_STATES.WAITING,
            message: 'PC credentials generated. Agent must be started manually.',
            duration: totalDuration,
            instructions: {
                step1: 'Download agent.js to your PC',
                step2: 'Run: node agent.js ' + credentials.pcId + ' ' + credentials.authToken + ' ' + credentials.serverUrl,
                step3: 'Agent will connect and show as ONLINE',
                step4: 'Monitor status in dashboard'
            },
            agentCommand: `node agent.js ${credentials.pcId} ${credentials.authToken} ${credentials.serverUrl}`
        });
        
        console.log(`🔑 PC credentials generated: ${credentials.pcId} (${totalDuration}ms)`);
        
    } catch (error) {
        console.error('Run credentials error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                details: process.env.NODE_ENV === 'development' ? error.message : 'Contact administrator'
            });
        }
    }
});

// NEW: /api/register-agent - Agent registration
router.post('/api/register-agent', (req, res) => {
    try {
        const { pc_id, auth_token, system_info } = req.body;
        
        // Validate credentials
        const pc = registeredPCs.get(pc_id);
        if (!pc || pc.authToken !== auth_token) {
            return res.status(401).json({
                success: false,
                error: 'Invalid pc_id or auth_token',
                code: 'INVALID_CREDENTIALS'
            });
        }
        
        // Update PC status to ONLINE
        pcStatus.set(pc_id, {
            state: PC_STATES.ONLINE,
            lastSeen: new Date().toISOString(),
            systemInfo: system_info,
            registeredAt: new Date().toISOString()
        });
        
        console.log(`✅ Agent registered: ${pc_id} from ${system_info?.platform || 'Unknown'}`);
        
        res.json({
            success: true,
            message: 'Agent registered successfully',
            pc_id: pc_id,
            state: PC_STATES.ONLINE
        });
        
    } catch (error) {
        console.error('Agent registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR'
        });
    }
});

// NEW: /api/heartbeat - Real agent heartbeat
router.post('/api/heartbeat', (req, res) => {
    try {
        const { pc_id, timestamp, status, system_info, shutdown_reason } = req.body;
        
        // Validate PC exists
        const pc = registeredPCs.get(pc_id);
        if (!pc) {
            return res.status(401).json({
                success: false,
                error: 'Unknown PC ID',
                code: 'UNKNOWN_PC'
            });
        }
        
        // Update status based on heartbeat
        const currentState = status || 'ONLINE';
        pcStatus.set(pc_id, {
            state: currentState === 'OFFLINE' ? PC_STATES.OFFLINE : PC_STATES.ONLINE,
            lastSeen: new Date().toISOString(),
            systemInfo: system_info,
            shutdownReason: shutdown_reason
        });
        
        if (currentState === 'OFFLINE') {
            console.log(`🔴 Agent went offline: ${pc_id} (${shutdown_reason || 'Unknown reason'})`);
        } else {
            console.log(`💓 Heartbeat received: ${pc_id}`);
        }
        
        res.json({
            success: true,
            message: 'Heartbeat received',
            pc_id: pc_id,
            state: currentState
        });
        
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({
            success: false,
            error: 'Heartbeat processing failed',
            code: 'HEARTBEAT_ERROR'
        });
    }
});

// NEW: /api/registered-pcs - Get all PC statuses
router.get('/api/registered-pcs', (req, res) => {
    try {
        const pcs = [];
        
        for (const [pcId, pcInfo] of registeredPCs.entries()) {
            const status = pcStatus.get(pcId) || { state: PC_STATES.OFFLINE };
            
            pcs.push({
                pcId: pcId,
                pcName: `PC-${pcId.split('-')[1]}`,
                owner: 'User',
                pcType: status.systemInfo?.platform || 'Unknown',
                location: 'Local',
                status: status.state,
                lastSeen: status.lastSeen,
                registeredAt: pcInfo.createdAt,
                systemInfo: status.systemInfo
            });
        }
        
        res.json({
            success: true,
            pcs: pcs,
            totalPCs: pcs.length
        });
        
    } catch (error) {
        console.error('Failed to get registered PCs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// NEW: /api/pc/:pcId - Delete PC
router.delete('/api/pc/:pcId', (req, res) => {
    try {
        const { pcId } = req.params;
        
        if (registeredPCs.has(pcId)) {
            registeredPCs.delete(pcId);
            pcStatus.delete(pcId);
            
            console.log(`🗑️ PC deleted: ${pcId}`);
            
            res.json({
                success: true,
                message: `PC ${pcId} deleted successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                error: `PC ${pcId} not found`
            });
        }
        
    } catch (error) {
        console.error('Failed to delete PC:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cleanup offline PCs (no heartbeat for 10 seconds)
function cleanupOfflinePCs() {
    const now = Date.now();
    
    for (const [pcId, status] of pcStatus.entries()) {
        const lastSeen = new Date(status.lastSeen).getTime();
        if (now - lastSeen > 10000 && status.state === PC_STATES.ONLINE) {
            pcStatus.set(pcId, {
                ...status,
                state: PC_STATES.OFFLINE,
                lastSeen: new Date().toISOString(),
                shutdownReason: 'Heartbeat timeout'
            });
            console.log(`⏰ PC marked offline due to timeout: ${pcId}`);
        }
    }
}

// Run cleanup every 5 seconds
setInterval(cleanupOfflinePCs, 5000);

module.exports = router;
