// Run Credentials API - Generate and execute agent code in browser
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Store active credentials temporarily (in production, use Redis/database)
const activeCredentials = new Map();

router.post('/api/run-credentials', (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                error: 'API key is required'
            });
        }
        
        // Validate API key format (basic check)
        if (!apiKey.startsWith('sk-or-v1-')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid API key format'
            });
        }
        
        // Generate unique session ID
        const sessionId = crypto.randomBytes(16).toString('hex');
        
        // Store credentials temporarily
        activeCredentials.set(sessionId, {
            apiKey: apiKey,
            createdAt: new Date().toISOString(),
            userAgent: req.get('User-Agent') || 'Unknown'
        });
        
        console.log(`🔑 Credentials stored for session: ${sessionId.substring(0, 8)}...`);
        
        // Generate agent code with this API key
        const agentCode = generateAgentCodeWithApiKey(apiKey);
        
        res.json({
            success: true,
            sessionId: sessionId,
            agentCode: agentCode,
            message: 'Credentials ready for execution'
        });
        
    } catch (error) {
        console.error('Run credentials error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process credentials'
        });
    }
});

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

function generateAgentCodeWithApiKey(apiKey) {
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

module.exports = router;
