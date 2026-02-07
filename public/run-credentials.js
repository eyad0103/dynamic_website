// Run Credentials functionality - State-driven agent execution
let currentAgentSession = null;
let stateCheckInterval = null;

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
    
    const runBtn = document.querySelector('button[onclick="runCredentials()"]');
    const originalText = runBtn ? runBtn.innerHTML : '';
    
    try {
        // Phase 8: Disable button immediately
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
        }
        
        // Phase 5: Async execution - immediate response expected
        showNotification('success', '🚀 Starting Agent', 'Initializing agent execution...');
        
        const response = await fetch('/api/run-credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                apiKey: apiKey,
                timestamp: Date.now()
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store session for state monitoring
            currentAgentSession = data.sessionId;
            
            // Update UI based on state
            updateUIForState(data.state, data);
            
            // Start state monitoring
            startStateMonitoring(data.sessionId);
            
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Preparing...';
            }
            
            // Open agent execution window
            const agentWindow = window.open(
                `${window.location.origin}/agent-executor.html?session=${data.sessionId}`,
                '_blank',
                'width=1000,height=800,scrollbars=yes,resizable=yes,location=yes,menubar=no'
            );
            
            if (!agentWindow || agentWindow.closed || typeof agentWindow.closed === 'undefined') {
                showNotification('warning', '⚠️ Popup Blocked', 'Please allow popups for this site to open the agent window');
            }
            
        } else {
            // Handle specific error codes
            handleExecutionError(data, runBtn, originalText);
        }
        
    } catch (error) {
        console.error('Run credentials error:', error);
        handleNetworkError(error, runBtn, originalText);
    }
}

// Phase 8: Handle execution errors
function handleExecutionError(data, runBtn, originalText) {
    let errorMessage = data.error || 'Unknown error occurred';
    let errorType = 'error';
    
    switch (data.code) {
        case 'MISSING_API_KEY':
        case 'INVALID_API_KEY_FORMAT':
        case 'STALE_API_KEY':
            errorType = 'error';
            break;
        case 'AGENT_ALREADY_RUNNING':
            errorType = 'warning';
            showNotification('warning', '⚠️ Agent Already Running', 'Please wait for current agent to complete');
            break;
        default:
            errorType = 'error';
    }
    
    showNotification(errorType, '❌ Execution Failed', errorMessage);
    
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = originalText;
    }
}

// Phase 8: Handle network errors
function handleNetworkError(error, runBtn, originalText) {
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
    
    showNotification(errorType, '❌ Connection Error', errorMessage);
    
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = originalText;
    }
}

// Phase 8: Update UI based on agent state
function updateUIForState(state, data) {
    const runBtn = document.querySelector('button[onclick="runCredentials()"]');
    
    switch (state) {
        case 'PREPARING':
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Preparing...';
            }
            showNotification('success', '⚙️ Agent Preparing', 'Agent is initializing...');
            break;
            
        case 'RUNNING':
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-play"></i> Running';
            }
            showNotification('success', '🚀 Agent Running', `Agent ${data.pcId} is now running`);
            break;
            
        case 'SUCCESS':
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = '<i class="fas fa-check"></i> Success';
            }
            showNotification('success', '✅ Agent Complete', `Agent ${data.pcId} completed successfully`);
            
            // Auto-switch to Registered PCs tab after 2 seconds
            setTimeout(() => {
                const registeredPcsTab = document.querySelector('button[onclick*="registered-pcs"]');
                if (registeredPcsTab) {
                    registeredPcsTab.click();
                    showNotification('success', '📊 Monitoring', 'Switched to Registered PCs tab to monitor your agent');
                }
            }, 2000);
            break;
            
        case 'FAILED':
        case 'TIMEOUT':
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = '<i class="fas fa-times"></i> Failed';
            }
            showNotification('error', '❌ Agent Failed', `Agent ${data.pcId} ${state.toLowerCase()}`);
            break;
    }
}

// Phase 8: Start state monitoring
function startStateMonitoring(sessionId) {
    // Clear existing interval
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval);
    }
    
    // Check state every 2 seconds
    stateCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/agent-state/${sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                updateUIForState(data.state, data.metadata);
                
                // Stop monitoring if terminal state reached
                if (data.state === 'SUCCESS' || data.state === 'FAILED' || data.state === 'TIMEOUT') {
                    clearInterval(stateCheckInterval);
                    currentAgentSession = null;
                }
            }
        } catch (error) {
            console.error('State check error:', error);
        }
    }, 2000);
}

// Clear existing sessions to ensure fresh start
function clearExistingSessions() {
    localStorage.removeItem('agentSession');
    localStorage.removeItem('lastApiKey');
    localStorage.removeItem('pcId');
    localStorage.removeItem('authToken');
    
    // Stop state monitoring
    if (stateCheckInterval) {
        clearInterval(stateCheckInterval);
        stateCheckInterval = null;
    }
    currentAgentSession = null;
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
