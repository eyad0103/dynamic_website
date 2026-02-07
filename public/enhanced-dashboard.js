// Enhanced Dynamic PC Management System - All Issues Fixed
let instructionTimeout = null;
let refreshInterval = null;
let isRefreshing = false;

// ==================== INSTRUCTIONS VISIBILITY FIX ====================

// Keep instructions visible for 10 seconds or until user dismisses
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

// ==================== DOWNLOAD AGENT FIX ====================

// Proper file download using backend route
function downloadAgent() {
    // Create a temporary link element for download
    const link = document.createElement('a');
    link.href = '/download-agent';
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

// ==================== AUTO-REFRESH REGISTERED PCS ====================

// Start auto-refresh for registered PCs
function startAutoRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Refresh every 5 seconds
    refreshInterval = setInterval(() => {
        if (!isRefreshing) {
            fetchRegisteredPCs();
        }
    }, 5000);
    
    console.log('🔄 Auto-refresh started for Registered PCs (every 5 seconds)');
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('⏹️ Auto-refresh stopped');
    }
}

// Fetch registered PCs from server
async function fetchRegisteredPCs() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    
    try {
        const response = await fetch('/api/registered-pcs');
        const data = await response.json();
        
        if (data.success) {
            updatePcTable(data.pcs);
            updatePcStatusCards(data.pcs);
        } else {
            console.error('Failed to fetch registered PCs:', data.error);
        }
    } catch (error) {
        console.error('Error fetching registered PCs:', error);
    } finally {
        isRefreshing = false;
    }
}

// Update PC table with new data
function updatePcTable(pcs) {
    const pcListDiv = document.getElementById('pcList');
    if (!pcListDiv) return;
    
    // Clear existing content
    pcListDiv.innerHTML = '';
    
    if (pcs.length === 0) {
        pcListDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.6);">
                <h4 style="color: #00ff88; margin-bottom: 1rem;">No PCs Registered Yet</h4>
                <p>Create your first PC agent to get started with monitoring.</p>
            </div>
        `;
        return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    `;
    
    table.innerHTML = `
        <thead>
            <tr style="background: rgba(0, 255, 136, 0.1);">
                <th style="padding: 0.75rem; text-align: left; color: #00ff88; border-bottom: 1px solid rgba(0, 255, 136, 0.3);">PC Name</th>
                <th style="padding: 0.75rem; text-align: left; color: #00ff88; border-bottom: 1px solid rgba(0, 255, 136, 0.3);">Status</th>
                <th style="padding: 0.75rem; text-align: left; color: #00ff88; border-bottom: 1px solid rgba(0, 255, 136, 0.3);">Last Heartbeat</th>
                <th style="padding: 0.75rem; text-align: left; color: #00ff88; border-bottom: 1px solid rgba(0, 255, 136, 0.3);">Location</th>
            </tr>
        </thead>
        <tbody id="pcTableBody">
            ${pcs.map(pc => {
                let statusColor, statusIcon;
                switch (pc.status) {
                    case 'ONLINE':
                        statusColor = '#00ff88';
                        statusIcon = '🟢';
                        break;
                    case 'OFFLINE':
                        statusColor = '#ff4757';
                        statusIcon = '🔴';
                        break;
                    case 'WAITING_FOR_AGENT':
                        statusColor = '#ffc107';
                        statusIcon = '🟡';
                        break;
                    default:
                        statusColor = '#6c757d';
                        statusIcon = '⚪';
                }
                
                const lastHeartbeat = pc.lastHeartbeat ? 
                    new Date(pc.lastHeartbeat).toLocaleTimeString() : 'Never';
                
                return `
                    <tr style="border-bottom: 1px solid rgba(0, 255, 136, 0.1); transition: background-color 0.3s ease;">
                        <td style="padding: 0.75rem; color: #fff;">
                            <strong>${pc.pcName}</strong><br>
                            <small style="color: rgba(255, 255, 255, 0.6);">${pc.pcId}</small>
                        </td>
                        <td style="padding: 0.75rem;">
                            <span style="color: ${statusColor}; font-weight: bold;">
                                ${statusIcon} ${pc.status}
                            </span>
                        </td>
                        <td style="padding: 0.75rem; color: rgba(255, 255, 255, 0.8);">
                            ${lastHeartbeat}
                        </td>
                        <td style="padding: 0.75rem; color: rgba(255, 255, 255, 0.8);">
                            ${pc.location || 'Unknown'}
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    
    pcListDiv.appendChild(table);
    
    // Add hover effects
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = 'rgba(0, 255, 136, 0.05)';
        });
        
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = 'transparent';
        });
    });
}

// Update PC status cards
function updatePcStatusCards(pcs) {
    const statusCards = document.getElementById('pcStatusCards');
    if (!statusCards) return;
    
    // Calculate statistics
    const onlineCount = pcs.filter(pc => pc.status === 'ONLINE').length;
    const offlineCount = pcs.filter(pc => pc.status === 'OFFLINE').length;
    const waitingCount = pcs.filter(pc => pc.status === 'WAITING_FOR_AGENT').length;
    const totalCount = pcs.length;
    
    statusCards.innerHTML = `
        <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid #00ff88; border-radius: 8px; padding: 1rem;">
            <h4 style="color: #00ff88; margin: 0 0 0.5rem 0;">🟢 Online</h4>
            <div style="font-size: 2rem; font-weight: bold; color: #00ff88;">${onlineCount}</div>
            <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Active PCs</div>
        </div>
        <div style="background: rgba(255, 71, 87, 0.1); border: 1px solid #ff4757; border-radius: 8px; padding: 1rem;">
            <h4 style="color: #ff4757; margin: 0 0 0.5rem 0;">🔴 Offline</h4>
            <div style="font-size: 2rem; font-weight: bold; color: #ff4757;">${offlineCount}</div>
            <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Inactive PCs</div>
        </div>
        <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid #ffc107; border-radius: 8px; padding: 1rem;">
            <h4 style="color: #ffc107; margin: 0 0 0.5rem 0;">🟡 Waiting</h4>
            <div style="font-size: 2rem; font-weight: bold; color: #ffc107;">${waitingCount}</div>
            <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">Pending Agents</div>
        </div>
        <div style="background: rgba(108, 117, 125, 0.1); border: 1px solid #6c757d; border-radius: 8px; padding: 1rem;">
            <h4 style="color: #6c757d; margin: 0 0 0.5rem 0;">📊 Total</h4>
            <div style="font-size: 2rem; font-weight: bold; color: #6c757d;">${totalCount}</div>
            <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">All PCs</div>
        </div>
    `;
}

// Enhanced tab switching with auto-refresh control
function switchTabWithAutoRefresh(tabName, event) {
    // Remove active class from all tabs and contents
    const allTabs = document.querySelectorAll('.tab-button');
    const allContents = document.querySelectorAll('.tab-content');
    
    allTabs.forEach(tab => tab.classList.remove('active'));
    allContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Hide all tab contents
    allContents.forEach(content => {
        content.style.display = 'none';
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName + '-tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('active');
    }
    
    console.log('🔧 Debug: Switched to tab:', tabName);
    
    // Control auto-refresh based on tab
    if (tabName === 'registered-pcs') {
        startAutoRefresh();
        // Immediate refresh when switching to this tab
        setTimeout(() => {
            fetchRegisteredPCs();
        }, 100);
    } else {
        stopAutoRefresh();
    }
}

// ==================== API KEY MANAGEMENT ====================

// Enhanced save API key with persistent instructions
async function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    if (!apiKey) {
        showInstructions('error', '❌ API Key Required', 'Please enter your OpenRouter API key first');
        return;
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-or-v1-')) {
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
            apiStatus.className = 'api-status status-configured';
            apiStatusText.innerHTML = '<i class="fas fa-check-circle"></i> API key configured and saved';
            
            // Show persistent success instructions for 10 seconds
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
            
            // Update the main Run Agent button
            const runBtn = document.querySelector('button[onclick="runCredentials()"]');
            if (runBtn) {
                runBtn.innerHTML = '<i class="fas fa-rocket"></i> 🚀 Create PC Agent';
                runBtn.style.background = '#00ff88';
            }
            
        } else {
            apiStatus.className = 'api-status status-not-configured';
            apiStatusText.textContent = 'Failed to save API key';
            showInstructions('error', '❌ Save Failed', data.error);
        }
        
    } catch (error) {
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

// ==================== NOTIFICATION SYSTEM ====================

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

// ==================== INITIALIZATION ====================

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
    
    // Override existing switchTab function if it exists
    if (typeof switchTab === 'function') {
        const originalSwitchTab = switchTab;
        switchTab = function(tabName, event) {
            originalSwitchTab(tabName, event);
            switchTabWithAutoRefresh(tabName, event);
        };
    } else {
        // If switchTab doesn't exist, create it
        window.switchTab = switchTabWithAutoRefresh;
    }
    
    // Add visibility change listener to pause/resume refresh
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            // Check if we're on the registered-pcs tab
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'registered-pcs-tab') {
                startAutoRefresh();
            }
        }
    });
    
    // Add window focus/blur listeners
    window.addEventListener('focus', function() {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'registered-pcs-tab') {
            startAutoRefresh();
        }
    });
    
    window.addEventListener('blur', function() {
        stopAutoRefresh();
    });
    
    // Check if we're on the registered-pcs tab by default
    const registeredPcsTab = document.getElementById('registered-pcs-tab');
    if (registeredPcsTab && registeredPcsTab.style.display !== 'none') {
        startAutoRefresh();
    }
});

// Export functions for global access
window.downloadAgent = downloadAgent;
window.saveApiKey = saveApiKey;
window.fetchRegisteredPCs = fetchRegisteredPCs;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;
window.switchTabWithAutoRefresh = switchTabWithAutoRefresh;
window.showInstructions = showInstructions;
