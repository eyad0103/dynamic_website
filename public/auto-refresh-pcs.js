// Auto-refresh functionality for Registered PCs dashboard
let refreshInterval = null;
let isRefreshing = false;

// Start auto-refresh for registered PCs
function startAutoRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Refresh every 5 seconds
    refreshInterval = setInterval(() => {
        if (!isRefreshing) {
            refreshPcList();
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

// Enhanced refreshPcList with error handling
async function refreshPcList() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    
    try {
        const response = await fetch('/api/registered-pcs');
        const data = await response.json();
        
        if (data.success) {
            updatePcTable(data.pcs);
            updatePcStatusCards(data.pcs);
        } else {
            console.error('Failed to refresh PC list:', data.error);
        }
    } catch (error) {
        console.error('Error refreshing PC list:', error);
    } finally {
        isRefreshing = false;
    }
}

// Update PC table with new data
function updatePcTable(pcs) {
    const tableBody = document.getElementById('pcTableBody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    if (pcs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.6);">
                    No PCs registered yet. Create your first PC agent to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    // Add PC rows
    pcs.forEach(pc => {
        const row = document.createElement('tr');
        row.style.cssText = `
            border-bottom: 1px solid rgba(0, 255, 136, 0.1);
            transition: background-color 0.3s ease;
        `;
        
        // Status styling
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
        
        row.innerHTML = `
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
                ${pc.location}
            </td>
            <td style="padding: 0.75rem; color: rgba(255, 255, 255, 0.8);">
                ${pc.owner}
            </td>
            <td style="padding: 0.75rem; color: rgba(255, 255, 255, 0.6);">
                ${new Date(pc.registeredAt).toLocaleString()}
            </td>
        `;
        
        // Add hover effect
        row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = 'rgba(0, 255, 136, 0.05)';
        });
        
        row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = 'transparent';
        });
        
        tableBody.appendChild(row);
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
            refreshPcList();
        }, 100);
    } else {
        stopAutoRefresh();
    }
}

// Initialize auto-refresh when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the registered-pcs tab by default
    const registeredPcsTab = document.getElementById('registered-pcs-tab');
    if (registeredPcsTab && registeredPcsTab.style.display !== 'none') {
        startAutoRefresh();
    }
    
    // Override the existing switchTab function if it exists
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
});

// Export functions for global access
window.refreshPcList = refreshPcList;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;
window.switchTabWithAutoRefresh = switchTabWithAutoRefresh;
