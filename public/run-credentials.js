// Real Agent Management - Generate PC credentials and show instructions
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
        // Disable button immediately
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PC...';
        }
        
        showNotification('success', '� Generating PC', 'Creating PC credentials...');
        
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
            // Show PC credentials and instructions
            showPCInstructions(data);
            
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = '<i class="fas fa-check"></i> PC Ready';
            }
            
            // Auto-switch to Registered PCs tab after 2 seconds
            setTimeout(() => {
                const registeredPcsTab = document.querySelector('button[onclick*="registered-pcs"]');
                if (registeredPcsTab) {
                    registeredPcsTab.click();
                    showNotification('success', '📊 Monitor PC', 'Switched to Registered PCs tab to monitor your agent');
                }
            }, 2000);
            
        } else {
            handleExecutionError(data, runBtn, originalText);
        }
        
    } catch (error) {
        console.error('Run credentials error:', error);
        handleNetworkError(error, runBtn, originalText);
    }
}

// Show PC instructions to user
function showPCInstructions(data) {
    showNotification('success', '✅ PC Created', `PC ID: ${data.pcId} - Ready for agent setup`);
    
    // Update UI with PC information
    updateRunCredentialsUI(data);
    
    // Copy command to clipboard
    const command = data.agentCommand;
    navigator.clipboard.writeText(command).then(() => {
        showNotification('success', '📋 Command Copied', 'Agent command copied to clipboard');
    }).catch(() => {
        console.log('Could not copy to clipboard');
    });
}

// Handle execution errors
function handleExecutionError(data, runBtn, originalText) {
    let errorMessage = data.error || 'Unknown error occurred';
    let errorType = 'error';
    
    switch (data.code) {
        case 'MISSING_API_KEY':
        case 'INVALID_API_KEY_FORMAT':
        case 'STALE_API_KEY':
            errorType = 'error';
            break;
        default:
            errorType = 'error';
    }
    
    showNotification(errorType, '❌ PC Creation Failed', errorMessage);
    
    if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = originalText;
    }
}

// Handle network errors
function handleNetworkError(error, runBtn, originalText) {
    let errorMessage = 'Failed to create PC';
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

// Update UI with PC information
function updateRunCredentialsUI(data) {
    // Update API Keys tab to show PC info
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    if (apiStatus && apiStatusText) {
        apiStatus.className = 'api-status status-configured';
        apiStatusText.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>✅ PC Created Successfully</strong><br>
                <span style="color: #00ff88;">PC ID: ${data.pcId}</span><br>
                <span style="color: #00ff88;">Status: ${data.state}</span>
            </div>
            <div style="margin-bottom: 10px;">
                <strong>🚀 Next Steps:</strong> 
                <span style="color: #28a745;">Run agent on your PC</span>
            </div>
            <div style="padding: 10px; background: rgba(0, 255, 136, 0.1); border-radius: 4px; border-left: 3px solid #00ff88;">
                <strong>📋 Agent Command:</strong>
                <div style="margin: 5px 0; padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                    ${data.agentCommand}
                </div>
                <ol style="margin: 10px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.8);">
                    <li>Download agent.js to your PC</li>
                    <li>Run the command above in terminal</li>
                    <li>Agent will connect automatically</li>
                    <li>Monitor status in dashboard</li>
                </ol>
            </div>
        `;
    }
}

// Clear existing sessions
function clearExistingSessions() {
    localStorage.removeItem('agentSession');
    localStorage.removeItem('lastApiKey');
    localStorage.removeItem('pcId');
    localStorage.removeItem('authToken');
}

