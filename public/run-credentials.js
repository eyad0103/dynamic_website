// Run Credentials functionality - One-Click Automatic Agent Runner
async function runCredentials() {
    // Always get the latest API key from input
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        showNotification('error', 'Missing API Key', 'Please enter an API key first');
        document.getElementById('apiKey').focus();
        return;
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-or-v1-')) {
        showNotification('error', 'Invalid API Key', 'Please enter a valid OpenRouter API key (starts with sk-or-v1-)');
        return;
    }
    
    // Clear any existing sessions to ensure fresh start
    clearExistingSessions();
    
    const runBtn = document.querySelector('button[onclick="runCredentials()"]');
    const originalText = runBtn ? runBtn.innerHTML : '';
    
    try {
        // Immediate UI feedback
        showNotification('info', '🚀 Starting Agent', 'Connecting to server...');
        
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        }
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Send API key to backend with timeout
        const response = await fetch('/api/run-credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                apiKey: apiKey,
                timestamp: Date.now() // Prevent caching
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', '✅ Agent Ready!', `Agent initialized with PC ID: ${data.autoPcId}`);
            
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-check"></i> Agent Ready';
            }
            
            // Open agent execution window with optimized settings
            const agentWindow = window.open(
                `${window.location.origin}/agent-executor.html?session=${data.sessionId}`,
                '_blank',
                'width=1000,height=800,scrollbars=yes,resizable=yes,location=yes,menubar=no'
            );
            
            if (!agentWindow || agentWindow.closed || typeof agentWindow.closed === 'undefined') {
                showNotification('warning', '⚠️ Popup Blocked', 'Please allow popups for this site to open the agent window');
            }
            
            // Update UI to show session info
            updateRunCredentialsUI(data.sessionId, apiKey, data.autoPcId);
            
            // Auto-switch to Registered PCs tab after 2 seconds
            setTimeout(() => {
                const registeredPcsTab = document.querySelector('button[onclick*="registered-pcs"]');
                if (registeredPcsTab) {
                    registeredPcsTab.click();
                    showNotification('info', '📊 Monitoring', 'Switched to Registered PCs tab to monitor your agent');
                }
            }, 2000);
            
        } else {
            throw new Error(data.error || data.message || 'Unknown server error');
        }
        
    } catch (error) {
        console.error('Run credentials error:', error);
        
        let errorMessage = 'Failed to start agent';
        let errorType = 'error';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out - please try again';
            errorType = 'warning';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error - check your connection';
            errorType = 'error';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorType, '❌ Failed to Start Agent', errorMessage);
        
    } finally {
        // Always re-enable button
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = originalText;
        }
    }
}

// Clear existing sessions to ensure fresh start
function clearExistingSessions() {
    // Clear any stored session data
    localStorage.removeItem('agentSession');
    localStorage.removeItem('lastApiKey');
    localStorage.removeItem('pcId');
    localStorage.removeItem('authToken');
}

function updateRunCredentialsUI(sessionId, apiKey, autoPcId) {
    // Update API Keys tab to show session info
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    if (apiStatus && apiStatusText) {
        apiStatus.className = 'api-status status-configured';
        apiStatusText.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>✅ Agent Session Active</strong><br>
                <span style="color: #00ff88;">Session ID: ${sessionId.substring(0, 8)}...</span><br>
                <span style="color: #00ff88;">PC ID: ${autoPcId || 'Generated'}</span>
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
