// Run Credentials functionality - One-Click Automatic Agent Runner
async function runCredentials() {
    const apiKey = document.getElementById('apiKey').value;
    
    if (!apiKey) {
        showNotification('error', 'Missing API Key', 'Please enter an API key first');
        // Focus on API key input
        document.getElementById('apiKey').focus();
        return;
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-or-v1-')) {
        showNotification('error', 'Invalid API Key', 'Please enter a valid OpenRouter API key (starts with sk-or-v1-)');
        return;
    }
    
    try {
        showNotification('info', '🚀 Starting Agent', 'Initializing automatic agent runner...');
        
        // Disable button to prevent multiple clicks
        const runBtn = document.querySelector('button[onclick="runCredentials()"]');
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
        }
        
        // Send API key to backend
        const response = await fetch('/api/run-credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                apiKey: apiKey
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', '✅ Agent Ready!', 'Agent window opened automatically');
            
            // Open agent execution window with optimized settings
            const agentWindow = window.open(
                `${window.location.origin}/agent-executor.html?session=${data.sessionId}`,
                '_blank',
                'width=1000,height=800,scrollbars=yes,resizable=yes,location=yes,menubar=no'
            );
            
            // Check if window opened successfully
            if (!agentWindow || agentWindow.closed || typeof agentWindow.closed === 'undefined') {
                showNotification('warning', 'Popup Blocked', 'Please allow popups for this site to open the agent window');
            }
            
            // Update UI to show session info
            updateRunCredentialsUI(data.sessionId, apiKey);
            
            // Auto-switch to Registered PCs tab after 2 seconds to monitor agent
            setTimeout(() => {
                const registeredPcsTab = document.querySelector('button[onclick*="registered-pcs"]');
                if (registeredPcsTab) {
                    registeredPcsTab.click();
                    showNotification('info', '📊 Monitoring', 'Switched to Registered PCs tab to monitor your agent');
                }
            }, 2000);
            
        } else {
            showNotification('error', '❌ Failed to Start Agent', data.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Run credentials error:', error);
        showNotification('error', '❌ Connection Error', 'Failed to start agent: ' + error.message);
    } finally {
        // Re-enable button
        const runBtn = document.querySelector('button[onclick="runCredentials()"]');
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = '<i class="fas fa-play"></i> Run Credentials';
        }
    }
}

function updateRunCredentialsUI(sessionId, apiKey) {
    // Update the API Keys tab to show session info
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    if (apiStatus && apiStatusText) {
        apiStatus.className = 'api-status status-configured';
        apiStatusText.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>✅ Agent Session Active</strong><br>
                <span style="color: #00ff88;">Session ID: ${sessionId.substring(0, 8)}...</span>
            </div>
            <div style="margin-bottom: 10px;">
                <strong>🚀 Agent Status:</strong> 
                <span style="color: #28a745;">Running in separate window</span>
            </div>
            <div style="padding: 10px; background: rgba(0, 255, 136, 0.1); border-radius: 4px; border-left: 3px solid #00ff88;">
                <strong>📋 Instructions:</strong>
                <ol style="margin: 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8);">
                    <li>Agent is running in separate window</li>
                    <li>Connection status updates automatically</li>
                    <li>Check dashboard for PC registration</li>
                    <li>Close window when done</li>
                </ol>
            </div>
        `;
    }
}

// Auto-update session status
function checkAgentSessionStatus(sessionId) {
    fetch(`${window.location.origin}/api/credentials/${sessionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const age = Math.floor((Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60));
                const statusElement = document.getElementById('sessionStatus');
                if (statusElement) {
                    statusElement.textContent = `Active (${age}m old)`;
                }
            }
        })
        .catch(error => {
            console.error('Session status check error:', error);
        });
}
