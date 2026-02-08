// API Key Functions - Missing Functions for dashboard.ejs

// Load saved API key on page load
async function loadApiKey() {
    try {
        console.log('🔑 Loading saved API key...');
        const response = await fetch('/api/get-api-key');
        const data = await response.json();
        
        if (data.success && data.apiKey) {
            console.log('✅ API key loaded successfully');
            document.getElementById('apiKey').value = data.apiKey;
            showNotification('success', 'API Key Loaded', 'Your saved API key has been restored');
        } else {
            console.log('ℹ️ No saved API key found');
        }
    } catch (error) {
        console.error('❌ Failed to load API key:', error);
    }
}

async function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value;
    const apiStatus = document.getElementById('apiStatus');
    const apiStatusText = document.getElementById('apiStatusText');
    
    if (!apiKey) {
        showNotification('error', 'Validation Error', 'Please enter an API key');
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
            showNotification('success', 'API Key Saved', 'Your API key has been permanently stored');
            apiStatus.className = 'api-status status-configured';
            apiStatusText.innerHTML = '<i class="fas fa-check-circle"></i> API key configured and saved';
            
            // Re-check status to update UI
            setTimeout(checkApiStatus, 1000);
        } else {
            showNotification('error', 'Save Failed', 'Failed to save API key: ' + data.error);
            apiStatus.className = 'api-status status-not-configured';
            apiStatusText.innerHTML = '<i class="fas fa-times-circle"></i> Failed to save API key';
        }
        
    } catch (error) {
        showNotification('error', 'Save Failed', 'Failed to save API key: ' + error.message);
        apiStatus.className = 'api-status status-not-configured';
        apiStatusText.innerHTML = '<i class="fas fa-times-circle"></i> Failed to save API key';
    }
}

function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleBtn = document.getElementById('toggleApiKeyBtn');
    
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        apiKeyInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function copyApiKey() {
    const apiKeyInput = document.getElementById('apiKey');
    const apiKey = apiKeyInput.value;
    
    if (!apiKey) {
        showNotification('error', 'Copy Failed', 'No API key to copy');
        return;
    }
    
    navigator.clipboard.writeText(apiKey).then(() => {
        showNotification('success', 'API Key Copied', 'API key copied to clipboard');
    }).catch(err => {
        // Fallback for older browsers
        apiKeyInput.select();
        document.execCommand('copy');
        showNotification('success', 'API Key Copied', 'API key copied to clipboard');
    });
}
