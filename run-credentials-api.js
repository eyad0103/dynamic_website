// Run Credentials API - Generate and execute agent code in browser
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Store active credentials temporarily (in production, use Redis/database)
const activeCredentials = new Map();

// Agent execution state management
const agentStates = new Map();
const executionLocks = new Map();

// Agent state constants
const AGENT_STATES = {
    IDLE: 'IDLE',
    PREPARING: 'PREPARING',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    TIMEOUT: 'TIMEOUT'
};

// Phase 1: Input Validation (Fast Fail)
function validateInput(apiKey, pcId) {
    const startTime = process.hrtime.bigint();
    
    // Check if API key exists
    if (!apiKey || typeof apiKey !== 'string') {
        return {
            valid: false,
            error: 'API key is required',
            code: 'MISSING_API_KEY',
            status: 401
        };
    }
    
    // Check API key format
    if (!apiKey.startsWith('sk-or-v1-')) {
        return {
            valid: false,
            error: 'Invalid API key format. Must start with sk-or-v1-',
            code: 'INVALID_API_KEY_FORMAT',
            status: 401
        };
    }
    
    // Check if this is the latest saved key (simulate key validation)
    // In production, this would check against stored latest key
    if (apiKey.length < 20) {
        return {
            valid: false,
            error: 'API key appears to be stale or incomplete',
            code: 'STALE_API_KEY',
            status: 401
        };
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    if (duration > 100) {
        console.warn(`⚠️ Validation took ${duration}ms (should be ≤100ms)`);
    }
    
    return {
        valid: true,
        duration: duration
    };
}

// Phase 2: Execution Lock
function checkExecutionLock(pcId) {
    if (executionLocks.has(pcId)) {
        return {
            locked: true,
            error: 'Agent already running for this PC',
            code: 'AGENT_ALREADY_RUNNING',
            status: 409
        };
    }
    return { locked: false };
}

function setExecutionLock(pcId, sessionId) {
    executionLocks.set(pcId, {
        sessionId: sessionId,
        timestamp: Date.now()
    });
}

function clearExecutionLock(pcId) {
    executionLocks.delete(pcId);
}

// Phase 3: State Machine
function setAgentState(sessionId, state, metadata = {}) {
    const currentState = agentStates.get(sessionId) || {};
    const previousState = currentState.state;
    
    agentStates.set(sessionId, {
        ...currentState,
        state: state,
        previousState: previousState,
        timestamp: Date.now(),
        ...metadata
    });
    
    console.log(`🔄 State transition: ${sessionId.substring(0, 8)} ${previousState} → ${state}`);
    return agentStates.get(sessionId);
}

function getAgentState(sessionId) {
    return agentStates.get(sessionId) || { state: AGENT_STATES.IDLE };
}

// Phase 4: Timeout Control
function setupTimeout(sessionId, timeoutMs = 10000) {
    setTimeout(() => {
        const state = getAgentState(sessionId);
        if (state.state === AGENT_STATES.PREPARING || state.state === AGENT_STATES.RUNNING) {
            setAgentState(sessionId, AGENT_STATES.TIMEOUT, {
                reason: `Timeout after ${timeoutMs}ms`
            });
            clearExecutionLock(state.pcId);
        }
    }, timeoutMs);
}

// Phase 6: Heartbeat Confirmation
function recordHeartbeat(sessionId) {
    const state = getAgentState(sessionId);
    if (state.state === AGENT_STATES.PREPARING) {
        setAgentState(sessionId, AGENT_STATES.RUNNING, {
            firstHeartbeat: Date.now()
        });
    }
    
    // Update last heartbeat
    agentStates.set(sessionId, {
        ...state,
        lastHeartbeat: Date.now()
    });
}

function checkHeartbeatTimeout(sessionId, timeoutMs = 3000) {
    const state = getAgentState(sessionId);
    if (state.state === AGENT_STATES.RUNNING && state.lastHeartbeat) {
        const timeSinceHeartbeat = Date.now() - state.lastHeartbeat;
        if (timeSinceHeartbeat > timeoutMs) {
            setAgentState(sessionId, AGENT_STATES.TIMEOUT, {
                reason: `No heartbeat for ${timeSinceHeartbeat}ms`
            });
            clearExecutionLock(state.pcId);
        }
    }
}

// Phase 5: Async Execution (Non-Blocking)
router.post('/api/run-credentials', (req, res) => {
    const requestStart = process.hrtime.bigint();
    
    try {
        const { apiKey, timestamp } = req.body;
        
        // Phase 1: Input Validation (Fast Fail)
        const validation = validateInput(apiKey);
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
        
        // Generate unique session ID and PC ID
        const sessionId = crypto.randomBytes(16).toString('hex');
        const pcId = `PC-${sessionId.substring(0, 8).toUpperCase()}`;
        
        // Phase 2: Execution Lock
        const lockCheck = checkExecutionLock(pcId);
        if (lockCheck.locked) {
            return res.status(lockCheck.status).json({
                success: false,
                error: lockCheck.error,
                code: lockCheck.code,
                state: getAgentState(sessionId)
            });
        }
        
        // Set execution lock
        setExecutionLock(pcId, sessionId);
        
        // Phase 3: State Machine - Set to PREPARING
        setAgentState(sessionId, AGENT_STATES.PREPARING, {
            pcId: pcId,
            apiKey: apiKey,
            userAgent: req.get('User-Agent') || 'Unknown',
            ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
        });
        
        // Phase 4: Timeout Control
        setupTimeout(sessionId, 10000);
        
        // Phase 5: Async Execution - Respond immediately
        const endTime = process.hrtime.bigint();
        const totalDuration = Number(endTime - requestStart) / 1000000;
        
        if (totalDuration > 300) {
            console.warn(`⚠️ Request took ${totalDuration}ms (should be ≤300ms)`);
        }
        
        // Store credentials
        activeCredentials.set(sessionId, {
            apiKey: apiKey,
            createdAt: new Date().toISOString(),
            userAgent: req.get('User-Agent') || 'Unknown',
            ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
            timestamp: Date.now()
        });
        
        // Generate agent code
        const agentCode = generateAgentCodeWithApiKey(apiKey, sessionId);
        
        // Immediate response (≤300ms requirement)
        res.json({
            success: true,
            sessionId: sessionId,
            pcId: pcId,
            agentCode: agentCode,
            state: AGENT_STATES.PREPARING,
            message: 'Agent preparation started',
            duration: totalDuration,
            instructions: {
                step1: 'Agent is preparing in background',
                step2: 'Will transition to RUNNING when ready',
                step3: 'Monitor state via /api/agent-state/:sessionId'
            }
        });
        
        // Start async agent execution (non-blocking)
        setTimeout(() => {
            executeAgentAsync(sessionId, pcId, agentCode);
        }, 100);
        
        console.log(`🚀 Agent execution started: ${sessionId.substring(0, 8)} (${totalDuration}ms)`);
        
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

// Async agent execution (non-blocking)
async function executeAgentAsync(sessionId, pcId, agentCode) {
    try {
        // Simulate agent preparation (in production, this would actually start the agent)
        setTimeout(() => {
            recordHeartbeat(sessionId);
            setAgentState(sessionId, AGENT_STATES.RUNNING, {
                agentStarted: Date.now()
            });
            
            // Simulate successful execution
            setTimeout(() => {
                setAgentState(sessionId, AGENT_STATES.SUCCESS, {
                    completedAt: Date.now(),
                    duration: Date.now() - getAgentState(sessionId).agentStarted
                });
                clearExecutionLock(pcId);
            }, 2000);
        }, 1000);
        
    } catch (error) {
        setAgentState(sessionId, AGENT_STATES.FAILED, {
            error: error.message,
            failedAt: Date.now()
        });
        clearExecutionLock(pcId);
    }
}

// Phase 6: Heartbeat endpoint
router.post('/api/agent-heartbeat/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    recordHeartbeat(sessionId);
    
    res.json({
        success: true,
        state: getAgentState(sessionId),
        timestamp: Date.now()
    });
});

// Phase 7: State query endpoint
router.get('/api/agent-state/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const state = getAgentState(sessionId);
    
    // Check heartbeat timeout
    checkHeartbeatTimeout(sessionId);
    
    res.json({
        success: true,
        state: state.state,
        metadata: state,
        timestamp: Date.now()
    });
});

// Clean up old sessions to prevent memory issues
function cleanupOldSessions() {
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const now = Date.now();
    
    for (const [sessionId, credentials] of activeCredentials.entries()) {
        if (now - new Date(credentials.createdAt).getTime() > oneHour) {
            activeCredentials.delete(sessionId);
            console.log(`🧹 Cleaned expired session: ${sessionId.substring(0, 8)}`);
        }
    }
}

// Get credentials for session
router.get('/api/credentials/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const credentials = activeCredentials.get(sessionId);
        if (!credentials) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or expired'
            });
        }
        
        res.json({
            success: true,
            apiKey: credentials.apiKey,
            createdAt: credentials.createdAt
        });
        
    } catch (error) {
        console.error('Get credentials error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve credentials'
        });
    }
});

// Execute agent code (called from generated HTML)
router.post('/api/execute-agent/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const credentials = activeCredentials.get(sessionId);
        if (!credentials) {
            return res.status(404).json({
                success: false,
                error: 'Session not found or expired'
            });
        }
        
        console.log(`🚀 Executing agent for session: ${sessionId.substring(0, 8)}...`);
        
        res.json({
            success: true,
            message: 'Agent execution started',
            apiKey: credentials.apiKey
        });
        
    } catch (error) {
        console.error('Execute agent error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute agent'
        });
    }
});

// Clean up old sessions (run every hour)
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    for (const [sessionId, credentials] of activeCredentials.entries()) {
        if (now - new Date(credentials.createdAt).getTime() > oneHour) {
            activeCredentials.delete(sessionId);
            console.log(`🧹 Cleaned expired session: ${sessionId.substring(0, 8)}`);
        }
    }
}, 60 * 60 * 1000); // Run every hour

function generateAgentCodeWithApiKey(apiKey, sessionId) {
    const websiteUrl = process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com';
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>PC Agent - Ready to Run</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: #1a1a2e; 
            color: #00ff88; 
            margin: 0;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding: 20px;
            background: rgba(0, 255, 136, 0.1); 
            border-radius: 8px;
        }
        .status { 
            background: rgba(0, 255, 136, 0.1); 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 3px solid #00ff88;
        }
        .code-block { 
            background: #000; 
            padding: 20px; 
            border-radius: 8px; 
            border: 2px solid #00ff88; 
            margin: 20px 0; 
            overflow-x: auto;
        }
        .btn { 
            background: #00ff88; 
            color: #000; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            font-weight: bold; 
            margin: 10px 5px; 
            display: inline-block;
        }
        .btn:hover { background: #00cc70; }
        .btn-secondary { background: #6c757d; }
        .btn-secondary:hover { background: #5a6268; }
        .instructions { 
            background: rgba(0, 255, 136, 0.1); 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
        }
        pre { 
            margin: 0; 
            white-space: pre-wrap; 
            word-wrap: break-word; 
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 PC Agent - Ready to Run</h1>
            <p>Your agent is configured and ready to connect to the dashboard</p>
        </div>
        
        <div class="status">
            <h3>📡 Connection Status</h3>
            <p><strong>Status:</strong> <span id="connectionStatus">Initializing...</span></p>
            <p><strong>Last Seen:</strong> <span id="lastSeen">Never</span></p>
            <p><strong>Dashboard:</strong> ${websiteUrl}</p>
        </div>
        
        <div class="instructions">
            <h3>📋 Instructions</h3>
            <ol>
                <li>Agent will automatically start connecting to dashboard</li>
                <li>Check your dashboard for PC registration status</li>
                <li>Connection status will update in real-time</li>
            </ol>
        </div>
        
        <div class="code-block">
            <h3>🔧 Debug Information</h3>
            <p><strong>Session ID:</strong> <span id="sessionId">${sessionId}</span></p>
            <p><strong>API Key:</strong> ${apiKey.substring(0, 10)}...</p>
        </div>
    </div>

    <script src="${websiteUrl}/agent.js"></script>
    <script>
        // Auto-start with credentials
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session') || localStorage.getItem('session');
        
        if (sessionId) {
            // Get credentials from server
            fetch('${websiteUrl}/api/credentials/' + sessionId)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('✅ Credentials loaded, starting agent...');
                        
                        // Update UI
                        document.getElementById('sessionId').textContent = sessionId;
                        document.getElementById('connectionStatus').textContent = 'Connecting...';
                        
                        // Start agent with loaded credentials
                        const urlParams = new URLSearchParams(window.location.search);
                        const pcId = urlParams.get('pc_id') || localStorage.getItem('pc_id');
                        const authToken = urlParams.get('auth_token') || localStorage.getItem('auth_token');
                        
                        if (pcId && authToken) {
                            const agent = new PCAgent(pcId, authToken, '${websiteUrl}');
                            agent.start();
                        } else {
                            document.getElementById('connectionStatus').textContent = 'Waiting for PC credentials...';
                        }
                    } else {
                        console.error('❌ Failed to load credentials');
                        document.getElementById('connectionStatus').textContent = 'Failed to load credentials';
                    }
                })
                .catch(error => {
                    console.error('❌ Error loading credentials:', error);
                    document.getElementById('connectionStatus').textContent = 'Error loading credentials';
                });
        } else {
            console.log('⚠️ No session ID found');
            document.getElementById('connectionStatus').textContent = 'No session found';
        }
        
        // Update connection status periodically
        setInterval(() => {
            const pcId = urlParams.get('pc_id') || localStorage.getItem('pc_id');
            const authToken = urlParams.get('auth_token') || localStorage.getItem('auth_token');
            
            if (pcId && authToken) {
                // Check if agent is connected by trying to register again
                fetch('${websiteUrl}/api/register-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pc_id: pcId,
                        auth_token: authToken,
                        hostname: 'Browser Agent',
                        OS: navigator.platform || 'Unknown',
                        local_ip: 'Browser'
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('connectionStatus').textContent = 'ONLINE';
                        document.getElementById('lastSeen').textContent = 'Just now';
                    } else {
                        document.getElementById('connectionStatus').textContent = 'OFFLINE';
                        document.getElementById('lastSeen').textContent = 'Connection failed';
                    }
                })
                .catch(error => {
                    console.error('❌ Status check error:', error);
                });
            }
        }, 5000); // Check every 5 seconds
    </script>
</body>
</html>`;
}

// Get registered PCs list
router.get('/api/registered-pcs', (req, res) => {
    try {
        // In a real implementation, this would query a database
        // For now, return a mock response that can be enhanced
        const mockPCs = [
            {
                pcId: 'PC-001',
                pcName: 'Main Desktop',
                owner: 'User',
                pcType: 'Desktop',
                location: 'Office',
                status: 'ONLINE',
                lastSeen: new Date().toISOString(),
                registeredAt: new Date().toISOString()
            }
        ];
        
        res.json({
            success: true,
            pcs: mockPCs,
            totalPCs: mockPCs.length
        });
        
    } catch (error) {
        console.error('Failed to get registered PCs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete PC endpoint
router.delete('/api/pc/:pcId', (req, res) => {
    try {
        const { pcId } = req.params;
        
        console.log(`🗑️ Deleting PC: ${pcId}`);
        
        // In a real implementation, this would delete from database
        // For now, return success response
        res.json({
            success: true,
            message: `PC ${pcId} deleted successfully`
        });
        
    } catch (error) {
        console.error('Failed to delete PC:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
