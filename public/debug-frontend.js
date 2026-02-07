// Debug-Enabled Frontend - Clean UI with proper logging and validation
let instructionTimeout = null;
let refreshInterval = null;
let isRefreshing = false;
let notificationHistory = [];

// Debug logging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? ' | Data: ' + JSON.stringify(data) : ''}`;
    
    console.log(`🎯 FRONTEND-DEBUG: ${message}`, data || '');
    
    // Store in localStorage for debugging
    try {
        const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        logs.push({ timestamp, message, data });
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.shift();
        }
        localStorage.setItem('debugLogs', JSON.stringify(logs));
    } catch (error) {
        console.error('Failed to store debug log:', error);
    }
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    debugLog('Frontend initialization started');
    
    // Load saved API key on page load
    loadSavedApiKey();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup tab switching with auto-refresh
    setupTabSwitching();
    
    // Check if we're on registered-pcs tab by default
    const registeredPcsTab = document.getElementById('registered-pcs-tab');
    if (registeredPcsTab && registeredPcsTab.style.display !== 'none') {
        startAutoRefresh();
    }
    
    debugLog('Frontend initialization completed');
});

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    debugLog('Setting up event listeners');
    
    // API Key input listener
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', function() {
            debugLog('API key input changed', { 
                hasValue: !!this.value,
                length: this.value.length
            });
            
            // Clear instructions when user starts typing
            const instructionDiv = document.getElementById('instructionDiv');
            if (instructionDiv) {
                instructionDiv.style.display = 'none';
            }
        });
    }
    
    // Download button listener
    const downloadBtn = document.getElementById('downloadAgentBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            debugLog('Download button clicked');
            downloadAgent();
        });
    }
    
    debugLog('Event listeners setup completed');
}

// ==================== NOTIFICATION SYSTEM (IMPORTANT EVENTS ONLY) ====================

// Show notification for important events only
function showNotification(type, title, message, duration = 5000) {
    debugLog('Notification triggered', { type, title, message, duration });
    
    // Add to history
    notificationHistory.push({
        timestamp: new Date().toISOString(),
        type,
        title,
        message
    });
    
    // Keep only last 20 notifications
    if (notificationHistory.length > 20) {
        notificationHistory.shift();
    }
    
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.error('❌ Notification container not found');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">${title}</div>
            <button class="notification-close" onclick="removeNotification(this)">×</button>
        </div>
        <div class="notification-body">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Auto-dismiss after specified duration
    setTimeout(() => {
        removeNotification(notification.querySelector('.notification-close'));
    }, duration);
    
    debugLog('Notification displayed', { type, title });
}

// Remove notification
function removeNotification(closeBtn) {
    const notification = closeBtn.closest('.notification');
    if (notification) {
        notification.remove();
        debugLog('Notification removed', { 
            title: notification.querySelector('.notification-title')?.textContent
        });
    }
}

// Show notification history (optional feature)
function showNotificationHistory() {
    debugLog('Notification history requested', { 
        historyLength: notificationHistory.length 
    });
    
    const historyHtml = notificationHistory.map(notif => `
        <div style="padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <small style="color: rgba(255,255,255,0.6);">${new Date(notif.timestamp).toLocaleString()}</small>
            <div><strong>${notif.title}</strong></div>
            <div style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">${notif.message}</div>
        </div>
    `).join('');
    
    showNotification('info', '📜 Notification History', historyHtml, 10000);
}

// Enhanced notification helpers for important events only
function showSuccessNotification(title, message) {
    debugLog('Success notification', { title, message });
    showNotification('success', title, message);
}

function showErrorNotification(title, message) {
    debugLog('Error notification', { title, message });
    showNotification('error', title, message, 7000); // Errors stay longer
}

function showWarningNotification(title, message) {
    debugLog('Warning notification', { title, message });
    showNotification('warning', title, message);
}

// ==================== API KEY MANAGEMENT (PERSISTENT) ====================

// Save API key with validation and logging
async function saveApiKey() {
    debugLog('Save API key function called');
    
    const apiKey = document.getElementById('apiKey').value;
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    debugLog('API key save attempt', { 
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        startsWithSk: apiKey ? apiKey.startsWith('sk-or-v1-') : false
    });
    
    if (!apiKey) {
        showErrorNotification('❌ API Key Required', 'Please enter your OpenRouter API key first');
        return;
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
        showErrorNotification('❌ Invalid API Key', 'API key must start with "sk-or-v1-"');
        return;
    }
    
    apiStatus.className = 'api-status status-testing';
    apiStatusText.innerHTML = '<span class="loading-spinner"></span> Saving API key...';
    
    try {
        debugLog('Sending API key save request');
        
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
        
        debugLog('API key save response received', { 
            success: data.success,
            isChanging: data.isChanging,
            version: data.version
        });
        
        if (data.success) {
            apiStatus.className = 'api-status status-configured';
            apiStatusText.innerHTML = '<i class="fas fa-check-circle"></i> API key configured and saved';
            
            showSuccessNotification('✅ API Key Saved', data.message || 'API key saved successfully');
            
        } else {
            apiStatus.className = 'api-status status-not-configured';
            apiStatusText.textContent = 'Failed to save API key';
            showErrorNotification('❌ Save Failed', data.error);
        }
        
    } catch (error) {
        debugLog('API key save error', { error: error.message });
        apiStatus.className = 'api-status status-not-configured';
        apiStatusText.textContent = 'Failed to save API key';
        showErrorNotification('❌ Connection Error', error.message);
    }
}

// Load saved API key on page load
async function loadSavedApiKey() {
    debugLog('Loading saved API key on page load');
    
    try {
        const response = await fetch('/api/get-api-key');
        const data = await response.json();
        
        debugLog('API key load response received', { 
            success: data.success,
            hasKey: !!data.apiKey,
            lastUpdated: data.lastUpdated,
            version: data.version
        });
        
        if (data.success && data.apiKey) {
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) {
                apiKeyInput.value = data.apiKey;
                
                const apiStatus = document.getElementById('apiStatus');
                const apiStatusText = document.getElementById('apiStatusText');
                
                apiStatus.className = 'api-status status-configured';
                apiStatusText.innerHTML = '<i class="fas fa-check-circle"></i> API key loaded from server';
                
                showSuccessNotification('✅ API Key Loaded', 'Your saved API key has been loaded');
            }
        } else {
            debugLog('No saved API key found');
        }
    } catch (error) {
        debugLog('API key load error', { error: error.message });
    }
}

// ==================== PC MANAGEMENT (SEPARATED) ====================

// Create new PC
async function createPC() {
    debugLog('Create PC function called');
    
    const pcName = document.getElementById('pcName')?.value;
    const pcLocation = document.getElementById('pcLocation')?.value;
    const pcOwner = document.getElementById('pcOwner')?.value;
    const pcType = document.getElementById('pcType')?.value;
    const pcDescription = document.getElementById('pcDescription')?.value;
    
    debugLog('PC creation attempt', { 
        pcName,
        pcLocation,
        pcOwner,
        pcType,
        hasDescription: !!pcDescription
    });
    
    if (!pcName || !pcLocation || !pcOwner) {
        showErrorNotification('❌ Missing Information', 'PC Name, Location, and Owner are required');
        return;
    }
    
    const createBtn = document.getElementById('createPcBtn');
    const originalText = createBtn ? createBtn.innerHTML : '';
    
    try {
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating PC...';
        }
        
        debugLog('Sending PC creation request');
        
        const response = await fetch('/api/create-pc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pcName,
                pcLocation,
                pcOwner,
                pcType,
                pcDescription
            })
        });
        
        const data = await response.json();
        
        debugLog('PC creation response received', { 
            success: data.success,
            pcId: data.pc?.pcId,
            agentCommand: data.agentCommand
        });
        
        if (data.success) {
            showSuccessNotification('✅ PC Created', `PC ${data.pc.pcName} created successfully`);
            
            // Show PC creation instructions in UI (not notification)
            showPCInstructions(data);
            
            // Clear form
            clearPCForm();
            
            // Switch to Registered PCs tab after 2 seconds
            setTimeout(() => {
                const registeredPcsTab = document.querySelector('button[onclick*="registered-pcs"]');
                if (registeredPcsTab) {
                    registeredPcsTab.click();
                }
            }, 2000);
            
        } else {
            showErrorNotification('❌ PC Creation Failed', data.error);
        }
        
    } catch (error) {
        debugLog('PC creation error', { error: error.message });
        showErrorNotification('❌ Connection Error', error.message);
    } finally {
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = originalText;
        }
    }
}

// Connect agent to latest waiting PC
async function connectAgent() {
    debugLog('Connect agent function called');
    
    const connectBtn = document.getElementById('connectAgentBtn');
    const originalText = connectBtn ? connectBtn.innerHTML : '';
    
    try {
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        }
        
        debugLog('Sending agent connection request');
        
        const response = await fetch('/api/connect-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        debugLog('Agent connection response received', { 
            success: data.success,
            pcId: data.pc?.pcId,
            pcName: data.pc?.pcName,
            hasApiKey: !!data.apiKey
        });
        
        if (data.success) {
            showSuccessNotification('🔗 Agent Connection', `Connecting to PC: ${data.pc.pcName}`);
            
            // Show connection instructions in UI (not notification)
            showAgentInstructions(data);
            
            // Switch to Registered PCs tab after 2 seconds
            setTimeout(() => {
                const registeredPcsTab = document.querySelector('button[onclick*="registered-pcs"]');
                if (registeredPcsTab) {
                    registeredPcsTab.click();
                }
            }, 2000);
            
        } else {
            showErrorNotification('❌ Connection Failed', data.error);
        }
        
    } catch (error) {
        debugLog('Agent connection error', { error: error.message });
        showErrorNotification('❌ Connection Error', error.message);
    } finally {
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.innerHTML = originalText;
        }
    }
}

// Clear PC form
function clearPCForm() {
    debugLog('Clearing PC form');
    
    if (document.getElementById('pcName')) document.getElementById('pcName').value = '';
    if (document.getElementById('pcLocation')) document.getElementById('pcLocation').value = '';
    if (document.getElementById('pcOwner')) document.getElementById('pcOwner').value = '';
    if (document.getElementById('pcType')) document.getElementById('pcType').value = '';
    if (document.getElementById('pcDescription')) document.getElementById('pcDescription').value = '';
}

// Show PC creation instructions in UI (not notification)
function showPCInstructions(data) {
    debugLog('Showing PC creation instructions', { 
        pcId: data.pc?.pcId,
        hasAgentCommand: !!data.agentCommand
    });
    
    const command = data.agentCommand;
    
    // Copy command to clipboard
    navigator.clipboard.writeText(command).then(() => {
        debugLog('Agent command copied to clipboard');
    }).catch(() => {
        debugLog('Failed to copy command to clipboard');
    });
    
    // Show instructions in Create PC tab
    const instructionsDiv = document.getElementById('pcInstructions');
    if (instructionsDiv) {
        instructionsDiv.innerHTML = `
            <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid #00ff88; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                <h4 style="color: #00ff88; margin-bottom: 1rem;">🖥️ PC Created Successfully!</h4>
                <p><strong>PC ID:</strong> ${data.pc.pcId}</p>
                <p><strong>Agent Command:</strong></p>
                <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 4px; font-family: monospace; margin: 0.5rem 0;">
                    ${command}
                </div>
                <div style="margin-top: 1rem;">
                    <button onclick="downloadAgent()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-download"></i> Download agent.js
                    </button>
                </div>
                <ol style="margin-top: 1rem; padding-left: 20px; color: rgba(255, 255, 255, 0.9);">
                    <li>Save agent.js to any folder</li>
                    <li>Open CMD/PowerShell in that folder</li>
                    <li>Run the command above</li>
                    <li>PC will appear as "ONLINE" in Registered PCs tab</li>
                </ol>
            </div>
        `;
        instructionsDiv.style.display = 'block';
    }
}

// Show agent connection instructions in UI (not notification)
function showAgentInstructions(data) {
    debugLog('Showing agent connection instructions', { 
        pcId: data.pc?.pcId,
        pcName: data.pc?.pcName
    });
    
    const command = data.agentCommand;
    
    // Copy command to clipboard
    navigator.clipboard.writeText(command).then(() => {
        debugLog('Agent command copied to clipboard');
    }).catch(() => {
        debugLog('Failed to copy command to clipboard');
    });
    
    // Show instructions in Create PC tab
    const instructionsDiv = document.getElementById('pcInstructions');
    if (instructionsDiv) {
        instructionsDiv.innerHTML = `
            <div style="background: rgba(0, 123, 255, 0.1); border: 1px solid #007bff; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                <h4 style="color: #007bff; margin-bottom: 1rem;">🔗 Connecting Agent to PC</h4>
                <p><strong>PC:</strong> ${data.pc.pcName} (${data.pc.pcId})</p>
                <p><strong>Agent Command:</strong></p>
                <div style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 4px; font-family: monospace; margin: 0.5rem 0;">
                    ${command}
                </div>
                <div style="margin-top: 1rem;">
                    <button onclick="downloadAgent()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-download"></i> Download agent.js
                    </button>
                </div>
                <ol style="margin-top: 1rem; padding-left: 20px; color: rgba(255, 255, 255, 0.9);">
                    <li>Save agent.js to any folder</li>
                    <li>Open CMD/PowerShell in that folder</li>
                    <li>Run the command above</li>
                    <li>PC status will change to "ONLINE" in Registered PCs tab</li>
                </ol>
            </div>
        `;
        instructionsDiv.style.display = 'block';
    }
}

// ==================== DOWNLOAD AGENT ====================

function downloadAgent() {
    debugLog('Agent download requested');
    
    const link = document.createElement('a');
    link.href = '/download-agent';
    link.download = 'agent.js';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccessNotification('📥 Download Started', 'agent.js download started - check your downloads folder');
}

// ==================== AUTO-REFRESH REGISTERED PCS ====================

function startAutoRefresh() {
    debugLog('Starting auto-refresh for Registered PCs');
    
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        if (!isRefreshing) {
            fetchRegisteredPCs();
        }
    }, 5000);
    
    debugLog('Auto-refresh started', { interval: 5000 });
}

function stopAutoRefresh() {
    debugLog('Stopping auto-refresh');
    
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

async function fetchRegisteredPCs() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    debugLog('Fetching registered PCs');
    
    try {
        const response = await fetch('/api/registered-pcs');
        const data = await response.json();
        
        debugLog('Registered PCs response received', { 
            success: data.success,
            count: data.pcs?.length || 0
        });
        
        if (data.success) {
            updatePcTable(data.pcs);
            updatePcStatusCards(data.pcs);
        } else {
            console.error('Failed to fetch registered PCs:', data.error);
        }
    } catch (error) {
        debugLog('Error fetching registered PCs', { error: error.message });
    } finally {
        isRefreshing = false;
    }
}

function updatePcTable(pcs) {
    debugLog('Updating PC table', { count: pcs.length });
    
    const pcListDiv = document.getElementById('pcList');
    if (!pcListDiv) return;
    
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

function updatePcStatusCards(pcs) {
    debugLog('Updating PC status cards', { count: pcs.length });
    
    const statusCards = document.getElementById('pcStatusCards');
    if (!statusCards) return;
    
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

// ==================== TAB SWITCHING WITH AUTO-REFRESH ====================

function setupTabSwitching() {
    debugLog('Setting up tab switching');
    
    // Override existing switchTab function if it exists
    if (typeof switchTab === 'function') {
        const originalSwitchTab = switchTab;
        switchTab = function(tabName, event) {
            debugLog('Tab switch requested', { tabName });
            originalSwitchTab(tabName, event);
            switchTabWithAutoRefresh(tabName, event);
        };
    } else {
        // If switchTab doesn't exist, create it
        window.switchTab = switchTabWithAutoRefresh;
    }
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', function() {
        debugLog('Visibility changed', { hidden: document.hidden });
        
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            // Check if we're on registered-pcs tab
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'registered-pcs-tab') {
                startAutoRefresh();
            }
        }
    });
    
    // Add window focus/blur listeners
    window.addEventListener('focus', function() {
        debugLog('Window focused');
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'registered-pcs-tab') {
            startAutoRefresh();
        }
    });
    
    window.addEventListener('blur', function() {
        debugLog('Window blurred');
        stopAutoRefresh();
    });
    
    debugLog('Tab switching setup completed');
}

function switchTabWithAutoRefresh(tabName, event) {
    debugLog('Switching tab', { tabName });
    
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

// ==================== EXPORT FUNCTIONS ====================

window.saveApiKey = saveApiKey;
window.createPC = createPC;
window.connectAgent = connectAgent;
window.downloadAgent = downloadAgent;
window.fetchRegisteredPCs = fetchRegisteredPCs;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;
window.switchTabWithAutoRefresh = switchTabWithAutoRefresh;
window.showNotificationHistory = showNotificationHistory;
window.debugLog = debugLog;
