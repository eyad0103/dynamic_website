// Run Credentials functionality
async function runCredentials() {
    const apiKey = document.getElementById('apiKey').value;
    
    if (!apiKey) {
        showNotification('error', 'Missing API Key', 'Please enter an API key first');
        return;
    }
    
    try {
        showNotification('info', 'Preparing Agent', 'Generating agent with your API key...');
        
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
            // Open agent execution window
            const agentWindow = window.open(
                `${window.location.origin}/agent-executor.html?session=${data.sessionId}`,
                '_blank',
                'width=900,height=700,scrollbars=yes,resizable=yes'
            );
            
            showNotification('success', 'Agent Ready', 'Agent window opened with your API key');
            
            // Update UI to show session info
            updateRunCredentialsUI(data.sessionId, apiKey);
            
        } else {
            showNotification('error', 'Failed to Prepare Agent', data.error || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Run credentials error:', error);
        showNotification('error', 'Failed to Prepare Agent', 'Failed to prepare agent: ' + error.message);
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
