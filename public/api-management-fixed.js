// Fixed API Key Management with persistence and proper download
let instructionTimeout = null;

// Enhanced API Key Saving with persistence
async function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    if (!apiKey) {
        showTestResult('Please enter an API key', 'error');
        showInstructions('error', '❌ API Key Required', 'Please enter your OpenRouter API key first');
        return;
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-or-v1-')) {
        showTestResult('Invalid API key format. Must start with sk-or-v1-', 'error');
        showInstructions('error', '❌ Invalid API Key', 'API key must start with "sk-or-v1-"');
        return;
    }
    
    apiStatus.className = 'api-status status-testing';
    apiStatusText.innerHTML = '<span class="loading-spinner"></span> Saving API key...';
    
    try {
        const response = await fetch('/api/save-api-key', {
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
            showTestResult('✅ API key saved successfully!', 'success');
            apiStatus.className = 'api-status status-configured';
            apiStatusText.innerHTML = '<i class="fas fa-check-circle"></i> API key configured and saved';
            
            // Show success instructions for 10 seconds
            showInstructions('success', '✅ API Key Saved', `
                <div style="text-align: left;">
                    <strong>🎉 Success!</strong><br>
                    Your API key has been securely saved to the server.<br><br>
                    <strong>Next Steps:</strong><br>
                    1. Click "🚀 Run Agent Now" to create a PC<br>
                    2. Download the agent.js file<br>
                    3. Run it on your target PC<br><br>
                    <small>Your API key will persist between sessions.</small>
                </div>
            `);
            
            // Update the main Run Agent button to show API key is saved
            const runBtn = document.querySelector('button[onclick="runCredentials()"]');
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-rocket"></i> 🚀 Create PC Agent';
                runBtn.style.background = '#00ff88';
            }
            
        } else {
            showTestResult('❌ Failed to save API key: ' + data.error, 'error');
            apiStatus.className = 'api-status status-not-configured';
            apiStatusText.textContent = 'Failed to save API key';
            showInstructions('error', '❌ Save Failed', data.error);
        }
        
    } catch (error) {
        showTestResult('❌ Failed to save API key: ' + error.message, 'error');
        apiStatus.className = 'api-status status-not-configured';
        apiStatusText.textContent = 'Failed to save API key';
        showInstructions('error', '❌ Connection Error', error.message);
    }
}

// Load saved API key on page load
async function loadSavedApiKey() {
    try {
        const response = await fetch('/api/get-api-key');
        const data = await response.json();
        
        if (data.success) {
            // Fill the input with saved key
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) {
                apiKeyInput.value = data.apiKey;
                
                // Update status
                const apiStatus = document.getElementById('apiStatus');
                const apiStatusText = document.getElementById('apiStatusText');
                
                apiStatus.className = 'api-status status-configured';
                apiStatusText.innerHTML = '<i class="fas fa-check-circle"></i> API key loaded from server';
                
                // Update run button
                const runBtn = document.querySelector('button[onclick="runCredentials()"]');
                if (runBtn) {
                    runBtn.innerHTML = '<i class="fas fa-rocket"></i> 🚀 Create PC Agent';
                    runBtn.style.background = '#00ff88';
                }
                
                // Show brief notification
                showInstructions('success', '✅ API Key Loaded', 'Your saved API key has been loaded');
            }
        }
    } catch (error) {
        console.log('No saved API key found');
    }
}

// Show instructions with auto-hide after 10 seconds
function showInstructions(type, title, message) {
    // Clear any existing timeout
    if (instructionTimeout) {
        clearTimeout(instructionTimeout);
    }
    
    // Create or update instruction element
    let instructionDiv = document.getElementById('instructionDiv');
    if (!instructionDiv) {
        instructionDiv = document.createElement('div');
        instructionDiv.id = 'instructionDiv';
        instructionDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999;
            min-width: 350px;
            max-width: 450px;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
            font-family: 'Courier New', monospace;
            border: 2px solid;
        `;
        document.body.appendChild(instructionDiv);
    }
    
    // Set colors based on type
    let bgColor, borderColor, textColor;
    switch (type) {
        case 'success':
            bgColor = 'linear-gradient(135deg, #00ff88, #00cc70)';
            borderColor = '#00cc70';
            textColor = '#000';
            break;
        case 'error':
            bgColor = 'linear-gradient(135deg, #ff4757, #ff3838)';
            borderColor = '#ff3838';
            textColor = '#fff';
            break;
        case 'warning':
            bgColor = 'linear-gradient(135deg, #ffa502, #ff8c00)';
            borderColor = '#ff8c00';
            textColor = '#000';
            break;
        default:
            bgColor = 'linear-gradient(135deg, #3742fa, #2f3542)';
            borderColor = '#3742fa';
            textColor = '#fff';
    }
    
    instructionDiv.style.background = bgColor;
    instructionDiv.style.borderColor = borderColor;
    instructionDiv.style.color = textColor;
    
    instructionDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1rem;">${title}</div>
        <div style="line-height: 1.4;">${message}</div>
        <button onclick="this.parentElement.style.display='none'" style="
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.3);
            border: none;
            color: ${textColor};
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        ">×</button>
    `;
    
    instructionDiv.style.display = 'block';
    
    // Auto-hide after 10 seconds
    instructionTimeout = setTimeout(() => {
        if (instructionDiv) {
            instructionDiv.style.display = 'none';
        }
    }, 10000);
}

// Enhanced agent download with proper file download
function downloadAgent() {
    // Create a temporary link element for download
    const link = document.createElement('a');
    link.href = '/agent.js';
    link.download = 'agent.js';
    link.style.display = 'none';
    
    // Add to DOM and click
    document.body.appendChild(link);
    link.click();
    
    // Remove from DOM
    document.body.removeChild(link);
    
    // Show notification
    showNotification('success', '📥 Download Started', 'agent.js download started - check your downloads folder');
    
    // Show instructions
    showInstructions('success', '📥 Agent Downloaded', `
        <div style="text-align: left;">
            <strong>✅ Download Started!</strong><br><br>
            <strong>Next Steps:</strong><br>
            1. Save agent.js to any folder (e.g., Desktop/agent)<br>
            2. Open CMD/PowerShell in that folder<br>
            3. Run the agent command shown in the dashboard<br><br>
            <small>The file will be in your downloads folder.</small>
        </div>
    `);
}

// Enhanced showTestResult function
function showTestResult(message, type) {
    const testResult = document.getElementById('testResult');
    if (!testResult) return;
    
    testResult.style.display = 'block';
    testResult.className = `test-result ${type}`;
    
    let bgColor, textColor;
    switch (type) {
        case 'success':
            bgColor = 'rgba(0, 255, 136, 0.1)';
            textColor = '#00ff88';
            break;
        case 'error':
            bgColor = 'rgba(255, 71, 87, 0.1)';
            textColor = '#ff4757';
            break;
        case 'loading':
            bgColor = 'rgba(255, 193, 7, 0.1)';
            textColor = '#ffc107';
            break;
        default:
            bgColor = 'rgba(0, 0, 0, 0.1)';
            textColor = '#fff';
    }
    
    testResult.style.background = bgColor;
    testResult.style.color = textColor;
    testResult.style.border = `1px solid ${textColor}`;
    testResult.style.padding = '1rem';
    testResult.style.borderRadius = '4px';
    testResult.style.marginTop = '1rem';
    testResult.style.fontFamily = "'Courier New', monospace";
    
    testResult.innerHTML = message;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            testResult.style.display = 'none';
        }, 5000);
    }
}

// Enhanced notification system
function showNotification(type, title, message) {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.error('Notification container not found');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">${title}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-body">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load saved API key
    loadSavedApiKey();
    
    // Add event listeners
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', function() {
            // Clear instructions when user starts typing
            const instructionDiv = document.getElementById('instructionDiv');
            if (instructionDiv) {
                instructionDiv.style.display = 'none';
            }
        });
    }
    
    // Add download button event listener
    const downloadBtn = document.getElementById('downloadAgentBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadAgent);
    }
});

// Override the existing runCredentials to use saved API key if available
async function runCredentials() {
    // First try to get saved API key
    try {
        const response = await fetch('/api/get-api-key');
        const data = await response.json();
        
        if (data.success) {
            // Use saved API key
            const apiKey = data.apiKey;
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) {
                apiKeyInput.value = apiKey;
            }
        }
    } catch (error) {
        console.log('Using manually entered API key');
    }
    
    // Continue with original runCredentials logic
    const apiKey = document.getElementById('apiKey').value.trim();
    
    if (!apiKey) {
        showNotification('error', 'Missing API Key', 'Please enter an API key first');
        document.getElementById('apiKey').focus();
        return;
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
        showNotification('error', 'Invalid API Key', 'Please enter a valid OpenRouter API key (starts with sk-or-v1-)');
        return;
    }
    
    const runBtn = document.querySelector('button[onclick="runCredentials()"]');
    const originalText = runBtn ? runBtn.innerHTML : '';
    
    try {
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PC...';
        }
        
        showNotification('success', '🔑 Generating PC', 'Creating PC credentials...');
        
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
            showPCInstructions(data);
            
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = '<i class="fas fa-check"></i> PC Ready';
            }
            
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

function showPCInstructions(data) {
    showNotification('success', '✅ PC Created', `PC ID: ${data.pcId} - Ready for agent setup`);
    updateRunCredentialsUI(data);
    
    const command = data.agentCommand;
    navigator.clipboard.writeText(command).then(() => {
        showNotification('success', '📋 Command Copied', 'Agent command copied to clipboard');
    }).catch(() => {
        console.log('Could not copy to clipboard');
    });
    
    const agentDownloadUrl = `${window.location.origin}/agent.js`;
    
    const apiStatusText = document.getElementById('apiStatusText');
    if (apiStatusText) {
        const downloadSection = document.createElement('div');
        downloadSection.innerHTML = `
            <div style="margin-top: 15px; padding: 10px; background: rgba(0, 123, 255, 0.1); border-radius: 4px; border-left: 3px solid #007bff;">
                <strong>📥 STEP 1: Download Agent</strong><br>
                <button onclick="downloadAgent()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 5px;">
                    <i class="fas fa-download"></i> Download agent.js
                </button>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: rgba(40, 167, 69, 0.1); border-radius: 4px; border-left: 3px solid #28a745;">
                <strong>📁 STEP 2: Save & Run</strong><br>
                <ol style="margin: 5px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.9);">
                    <li>Save agent.js to any folder (e.g., Desktop/agent)</li>
                    <li>Open CMD/PowerShell in that folder</li>
                    <li>Run: <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 2px;">${command}</code></li>
                </ol>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: rgba(255, 193, 7, 0.1); border-radius: 4px; border-left: 3px solid #ffc107;">
                <strong>🚀 STEP 3: Monitor</strong><br>
                <ul style="margin: 5px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.9);">
                    <li>Agent will connect automatically</li>
                    <li>PC status will change to ONLINE</li>
                    <li>Monitor in Registered PCs tab</li>
                    <li>Close browser → agent stays ONLINE</li>
                </ul>
            </div>
        `;
        apiStatusText.appendChild(downloadSection);
    }
}

function updateRunCredentialsUI(data) {
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
                <span style="color: #28a745;">Download agent.js and run on your PC</span>
            </div>
            <div style="padding: 10px; background: rgba(0, 255, 136, 0.1); border-radius: 4px; border-left: 3px solid #00ff88;">
                <strong>📋 Agent Command:</strong>
                <div style="margin: 5px 0; padding: 8px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; font-family: monospace; font-size: 0.9rem;">
                    ${data.agentCommand}
                </div>
                <div style="margin-top: 10px; font-size: 0.85rem; color: rgba(255, 255, 255, 0.8);">
                    <strong>⚠️ IMPORTANT:</strong> Save agent.js to your PC first, then run the command in the same folder.
                </div>
            </div>
        `;
    }
}

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
