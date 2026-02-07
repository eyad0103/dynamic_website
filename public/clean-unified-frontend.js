// Clean Unified Frontend - All issues fixed: no stacking, persistent keys, separated responsibilities
let instructionTimeout = null;
let refreshInterval = null;
let isRefreshing = false;

// ==================== INITIALIZATION ====================

// Load notification system first
document.addEventListener('DOMContentLoaded', function() {
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
    
    console.log('🚀 Clean frontend initialized');
});

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // API Key input listener
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
    
    // Download button listener
    const downloadBtn = document.getElementById('downloadAgentBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadAgent);
    }
}

// ==================== API KEY MANAGEMENT (PERSISTENT) ====================

// Save API key with persistent storage
async function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    if (!apiKey) {
        showNotification('error', '❌ API Key Required', 'Please enter your OpenRouter API key first');
        return;
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
        showNotification('error', '❌ Invalid API Key', 'API key must start with "sk-or-v1-"');
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
            
            // Show success instructions
            showInstructions('success', '✅ API Key Saved', `
                <div style="text-align: left;">
                    <strong>🎉 Success!</strong><br>
                    Your API key has been securely saved to the server.<br><br>
                    <strong>Next Steps:</strong><br>
                    1. Go to "Create PC" tab<br>
                    2. Click "CREATE PC" to generate PC credentials<br>
                    3. Click "CONNECT AGENT" to connect to latest waiting PC<br>
                    4. Download and run agent<br><br>
                    <small>Your API key will persist between sessions.</small>
                </div>
            `);
            
            showNotification('success', '✅ API Key Saved', data.message || 'API key saved successfully');
            
        } else {
            apiStatus.className = 'api-status status-not-configured';
            apiStatusText.textContent = 'Failed to save API key';
            showNotification('error', '❌ Save Failed', data.error);
        }
        
    } catch (error) {
        apiStatus.className = 'api-status status-not-configured';
        apiStatusText.textContent = 'Failed to save API key';
        showNotification('error', '❌ Connection Error', error.message);
    }
}

// Load saved API key on page load
async function loadSavedApiKey() {
    try {
        const response = await fetch('/api/get-api-key');
        const data = await response.json();
        
        if (data.success) {
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) {
                apiKeyInput.value = data.apiKey;
                
                const apiStatus = document.getElementById('apiStatus');
                const apiStatusText = document.getElementById('apiStatusText');
                
                apiStatus.className = 'api-status status-configured';
                apiStatusText.innerHTML = '<i class="fas fa-check-circle"></i> API key loaded from server';
                
                showNotification('success', '✅ API Key Loaded', 'Your saved API key has been loaded');
            }
        }
    } catch (error) {
        console.log('No saved API key found');
    }
}

// ==================== PC MANAGEMENT (SEPARATED) ====================

// Create new PC
async function createPC() {
    const pcName = document.getElementById('pcName')?.value;
    const pcLocation = document.getElementById('pcLocation')?.value;
    const pcOwner = document.getElementById('pcOwner')?.value;
    const pcType = document.getElementById('pcType')?.value;
    const pcDescription = document.getElementById('pcDescription')?.value;
    
    if (!pcName || !pcLocation || !pcOwner) {
        showNotification('error', '❌ Missing Information', 'PC Name, Location, and Owner are required');
        return;
    }
    
    const createBtn = document.getElementById('createPcBtn');
    const originalText = createBtn ? createBtn.innerHTML : '';
    
    try {
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating PC...';
        }
        
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
        
        if (data.success) {
            showNotification('success', '✅ PC Created', `PC ${data.pc.pcName} created successfully`);
            
            // Show PC creation instructions
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
            showNotification('error', '❌ PC Creation Failed', data.error);
        }
        
    } catch (error) {
        showNotification('error', '❌ Connection Error', error.message);
    } finally {
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = originalText;
        }
    }
}

// Connect agent to latest waiting PC
async function connectAgent() {
    const connectBtn = document.getElementById('connectAgentBtn');
    const originalText = connectBtn ? connectBtn.innerHTML : '';
    
    try {
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        }
        
        const response = await fetch('/api/connect-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', '🔗 Agent Connection', `Connecting to PC: ${data.pc.pcName}`);
            
            // Show connection instructions
            showAgentInstructions(data);
            
            // Switch to Registered PCs tab after 2 seconds
            setTimeout(() => {
                const registeredPcsTab = document.querySelector('button[onclick*="registered-pcs"]');
                if (registeredPcsTab) {
                    registeredPcsTab.click();
                }
            }, 2000);
            
        } else {
            showNotification('error', '❌ Connection Failed', data.error);
        }
        
    } catch (error) {
        showNotification('error', '❌ Connection Error', error.message);
    } finally {
        if (connectBtn) {
            connectBtn.disabled = false;
            connectBtn.innerHTML = originalText;
        }
    }
}

// Clear PC form
function clearPCForm() {
    if (document.getElementById('pcName')) document.getElementById('pcName').value = '';
    if (document.getElementById('pcLocation')) document.getElementById('pcLocation').value = '';
    if (document.getElementById('pcOwner')) document.getElementById('pcOwner').value = '';
    if (document.getElementById('pcType')) document.getElementById('pcType').value = '';
    if (document.getElementById('pcDescription')) document.getElementById('pcDescription').value = '';
}

// Show PC creation instructions
function showPCInstructions(data) {
    const command = data.agentCommand;
    
    // Copy command to clipboard
    navigator.clipboard.writeText(command).then(() => {
        showNotification('success', '📋 Command Copied', 'Agent command copied to clipboard');
    }).catch(() => {
        console.log('Could not copy to clipboard');
    });
    
    showInstructions('success', '🖥️ PC Created', `
        <div style="text-align: left;">
            <strong>✅ PC Created Successfully!</strong><br>
            PC ID: ${data.pc.pcId}<br><br>
            <strong>📥 STEP 1: Download Agent</strong><br>
            <button onclick="downloadAgent()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin: 5px 0;">
                <i class="fas fa-download"></i> Download agent.js
            </button><br><br>
            <strong>📁 STEP 2: Save & Run</strong><br>
            <ol style="margin: 5px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.9);">
                <li>Save agent.js to any folder</li>
                <li>Open CMD/PowerShell in that folder</li>
                <li>Run: <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 2px;">${command}</code></li>
            </ol><br>
            <strong>🚀 STEP 3: Monitor</strong><br>
            PC will appear as "ONLINE" in Registered PCs tab
        </div>
    `);
}

// Show agent connection instructions
function showAgentInstructions(data) {
    const command = data.agentCommand;
    
    // Copy command to clipboard
    navigator.clipboard.writeText(command).then(() => {
        showNotification('success', '📋 Command Copied', 'Agent command copied to clipboard');
    }).catch(() => {
        console.log('Could not copy to clipboard');
    });
    
    showInstructions('success', '🔗 Agent Connection', `
        <div style="text-align: left;">
            <strong>🔗 Connecting to PC: ${data.pc.pcName}</strong><br>
            PC ID: ${data.pc.pcId}<br><br>
            <strong>📥 STEP 1: Download Agent</strong><br>
            <button onclick="downloadAgent()" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin: 5px 0;">
                <i class="fas fa-download"></i> Download agent.js
            </button><br><br>
            <strong>📁 STEP 2: Save & Run</strong><br>
            <ol style="margin: 5px 0; padding-left: 20px; color: rgba(255, 255, 255, 0.9);">
                <li>Save agent.js to any folder</li>
                <li>Open CMD/PowerShell in that folder</li>
                <li>Run: <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 2px;">${command}</code></li>
            </ol><br>
            <strong>🚀 STEP 3: Monitor</strong><br>
            PC status will change to "ONLINE" in Registered PCs tab
        </div>
    `);
}

// ==================== DOWNLOAD AGENT ====================

function downloadAgent() {
    const link = document.createElement('a');
    link.href = '/download-agent';
    link.download = 'agent.js';
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', '📥 Download Started', 'agent.js download started - check your downloads folder');
}

// ==================== INSTRUCTIONS VISIBILITY ====================

function showInstructions(type, title, message) {
    if (instructionTimeout) {
        clearTimeout(instructionTimeout);
    }
    
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
    
    instructionTimeout = setTimeout(() => {
        if (instructionDiv) {
            instructionDiv.style.display = 'none';
        }
    }, 10000);
}

// ==================== AUTO-REFRESH REGISTERED PCS ====================

function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        if (!isRefreshing) {
            fetchRegisteredPCs();
        }
    }, 5000);
    
    console.log('🔄 Auto-refresh started for Registered PCs (every 5 seconds)');
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('⏹️ Auto-refresh stopped');
    }
}

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

function updatePcTable(pcs) {
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
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', function() {
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
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'registered-pcs-tab') {
            startAutoRefresh();
        }
    });
    
    window.addEventListener('blur', function() {
        stopAutoRefresh();
    });
}

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

// ==================== EXPORT FUNCTIONS ====================

window.saveApiKey = saveApiKey;
window.createPC = createPC;
window.connectAgent = connectAgent;
window.downloadAgent = downloadAgent;
window.fetchRegisteredPCs = fetchRegisteredPCs;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;
window.switchTabWithAutoRefresh = switchTabWithAutoRefresh;
window.showInstructions = showInstructions;
window.clearPCForm = clearPCForm;
