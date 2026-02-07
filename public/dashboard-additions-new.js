// Dashboard Additional Functions - PC Management and UI Updates

function updatePCList() {
    // Refresh the registered PCs list
    loadPcList();
}

function refreshPcList() {
    // Force refresh PC list with loading state
    const container = document.getElementById('registeredPcsContainer');
    if (container) {
        container.innerHTML = '<div class="loading">Refreshing PC list...</div>';
    }
    loadPcList();
}

function showNotification(type, title, message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function loadPcList() {
    // Load PC list from server
    fetch('/api/registered-pcs')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayPCs(data.pcs);
            } else {
                showNotification('error', 'Failed to Load PCs', data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Error loading PC list:', error);
            showNotification('error', 'Connection Error', 'Failed to load PC list');
        });
}

function displayPCs(pcs) {
    const container = document.getElementById('registeredPcsContainer');
    if (!container) return;
    
    if (!pcs || pcs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.6);">
                <i class="fas fa-desktop" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                <h3>No PCs Registered</h3>
                <p>Use the "Run Credentials" button to add PCs to your dashboard.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="pc-list">';
    pcs.forEach(pc => {
        const statusClass = pc.status === 'ONLINE' ? 'status-online' : 'status-offline';
        const statusIcon = pc.status === 'ONLINE' ? 'fa-circle' : 'fa-circle';
        const statusColor = pc.status === 'ONLINE' ? '#00ff88' : '#ff6b6b';
        
        html += `
            <div class="pc-item" data-pc-id="${pc.pcId}">
                <div class="pc-header">
                    <div class="pc-info">
                        <h4><i class="fas fa-desktop"></i> ${pc.pcName || pc.pcId}</h4>
                        <span class="pc-location">${pc.location || 'Unknown Location'}</span>
                    </div>
                    <div class="pc-status">
                        <i class="fas ${statusIcon}" style="color: ${statusColor};"></i>
                        <span class="${statusClass}">${pc.status}</span>
                    </div>
                </div>
                <div class="pc-details">
                    <div class="pc-detail">
                        <strong>PC ID:</strong> ${pc.pcId}
                    </div>
                    <div class="pc-detail">
                        <strong>Owner:</strong> ${pc.owner || 'Unknown'}
                    </div>
                    <div class="pc-detail">
                        <strong>Type:</strong> ${pc.pcType || 'Unknown'}
                    </div>
                    <div class="pc-detail">
                        <strong>Last Seen:</strong> ${pc.lastSeen || 'Never'}
                    </div>
                </div>
                <div class="pc-actions">
                    <button class="btn-small btn-primary" onclick="refreshPC('${pc.pcId}')">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                    <button class="btn-small btn-danger" onclick="deletePC('${pc.pcId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function refreshPC(pcId) {
    // Refresh specific PC status
    showNotification('info', 'Refreshing PC', `Updating status for ${pcId}...`);
    loadPcList();
}

function deletePC(pcId) {
    if (confirm(`Are you sure you want to delete PC "${pcId}"?`)) {
        fetch(`/api/pc/${pcId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('success', 'PC Deleted', `PC "${pcId}" has been removed`);
                loadPcList();
            } else {
                showNotification('error', 'Delete Failed', data.error || 'Failed to delete PC');
            }
        })
        .catch(error => {
            console.error('Error deleting PC:', error);
            showNotification('error', 'Connection Error', 'Failed to delete PC');
        });
    }
}
