// Enhanced notification system - prevents stacking
let currentNotification = null;
let notificationQueue = [];
let isShowingNotification = false;

// Single notification system - prevents stacking
function showNotification(type, title, message, duration = 5000) {
    // If there's already a notification showing, add to queue
    if (isShowingNotification) {
        notificationQueue.push({ type, title, message, duration });
        console.log('📝 Notification queued:', title);
        return;
    }
    
    // Remove existing notification if any
    if (currentNotification) {
        currentNotification.remove();
    }
    
    // Create new notification
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.error('Notification container not found');
        return;
    }
    
    isShowingNotification = true;
    
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
    currentNotification = notification;
    
    // Auto-dismiss after specified duration
    setTimeout(() => {
        removeNotification(notification.querySelector('.notification-close'));
    }, duration);
    
    console.log('📢 Notification shown:', title);
}

// Remove notification and show next in queue
function removeNotification(closeBtn) {
    if (!currentNotification) return;
    
    const notification = closeBtn.closest('.notification');
    if (notification) {
        notification.remove();
    }
    
    currentNotification = null;
    isShowingNotification = false;
    
    // Show next notification in queue if any
    if (notificationQueue.length > 0) {
        const next = notificationQueue.shift();
        setTimeout(() => {
            showNotification(next.type, next.title, next.message, next.duration);
        }, 100);
    }
}

// Clear all notifications
function clearAllNotifications() {
    const container = document.getElementById('notificationContainer');
    if (container) {
        container.innerHTML = '';
    }
    currentNotification = null;
    isShowingNotification = false;
    notificationQueue = [];
}

// Enhanced notification with different types
function showSuccessNotification(title, message) {
    showNotification('success', title, message);
}

function showErrorNotification(title, message) {
    showNotification('error', title, message, 7000); // Errors stay longer
}

function showWarningNotification(title, message) {
    showNotification('warning', title, message);
}

function showInfoNotification(title, message) {
    showNotification('info', title, message);
}

// Export functions
window.showNotification = showNotification;
window.removeNotification = removeNotification;
window.clearAllNotifications = clearAllNotifications;
window.showSuccessNotification = showSuccessNotification;
window.showErrorNotification = showErrorNotification;
window.showWarningNotification = showWarningNotification;
window.showInfoNotification = showInfoNotification;
