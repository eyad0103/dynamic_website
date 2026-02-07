// Persistent API Key Management - File-based storage
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// File path for API key storage
const API_KEY_FILE = path.join(__dirname, 'data', 'api-keys.json');

// Ensure data directory exists
function ensureDataDirectory() {
    const dataDir = path.dirname(API_KEY_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Load API keys from file
function loadApiKeys() {
    try {
        ensureDataDirectory();
        
        if (fs.existsSync(API_KEY_FILE)) {
            const data = fs.readFileSync(API_KEY_FILE, 'utf8');
            const keys = JSON.parse(data);
            console.log('🔑 API keys loaded from file');
            return keys;
        } else {
            console.log('📝 No API key file found, creating new one');
            return {};
        }
    } catch (error) {
        console.error('❌ Error loading API keys:', error);
        return {};
    }
}

// Save API keys to file
function saveApiKeys(keys) {
    try {
        ensureDataDirectory();
        
        // Create backup of existing file
        if (fs.existsSync(API_KEY_FILE)) {
            const backupPath = API_KEY_FILE + '.backup';
            fs.copyFileSync(API_KEY_FILE, backupPath);
        }
        
        // Write new keys
        const data = JSON.stringify(keys, null, 2);
        fs.writeFileSync(API_KEY_FILE, data, 'utf8');
        
        console.log('✅ API keys saved to file');
        return true;
    } catch (error) {
        console.error('❌ Error saving API keys:', error);
        return false;
    }
}

// Validate API key format
function validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
        return { valid: false, error: 'API key is required' };
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
        return { valid: false, error: 'Invalid API key format. Must start with sk-or-v1-' };
    }
    
    if (apiKey.length < 20) {
        return { valid: false, error: 'API key is too short' };
    }
    
    return { valid: true };
}

// Encrypt API key for storage (optional extra security)
function encryptApiKey(apiKey) {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, secretKey);
    cipher.setAAD(Buffer.from('api-key', 'utf8'));
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm
    };
}

// Decrypt API key (if encrypted)
function decryptApiKey(encryptedData) {
    // For now, return plain text - encryption can be added later
    return encryptedData;
}

// Express routes for persistent API key management
function createApiKeyRoutes() {
    const express = require('express');
    const router = express.Router();
    
    // Save API key with persistence
    router.post('/api/save-api-key', (req, res) => {
        try {
            const { apiKey } = req.body;
            
            // Validate API key
            const validation = validateApiKey(apiKey);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }
            
            // Load existing keys
            const keys = loadApiKeys();
            
            // Check if key is changing
            const isChanging = keys.openrouter && keys.openrouter !== apiKey;
            
            // Save new key
            keys.openrouter = apiKey;
            keys.lastUpdated = new Date().toISOString();
            keys.version = (keys.version || 0) + 1;
            
            const saved = saveApiKeys(keys);
            
            if (saved) {
                console.log('✅ API key saved successfully');
                
                res.json({
                    success: true,
                    message: isChanging ? 'API key updated successfully' : 'API key saved successfully',
                    isChanging: isChanging,
                    version: keys.version
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to save API key'
                });
            }
            
        } catch (error) {
            console.error('❌ Error saving API key:', error);
            res.status(500).json({
                success: false,
                error: 'Server error: ' + error.message
            });
        }
    });
    
    // Get saved API key
    router.get('/api/get-api-key', (req, res) => {
        try {
            const keys = loadApiKeys();
            
            if (keys.openrouter) {
                console.log('🔑 API key retrieved from file');
                
                res.json({
                    success: true,
                    apiKey: keys.openrouter,
                    lastUpdated: keys.lastUpdated,
                    version: keys.version || 0
                });
            } else {
                res.json({
                    success: false,
                    error: 'No API key found'
                });
            }
            
        } catch (error) {
            console.error('❌ Error retrieving API key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve API key: ' + error.message
            });
        }
    });
    
    // Delete API key (for security)
    router.delete('/api/delete-api-key', (req, res) => {
        try {
            const keys = loadApiKeys();
            
            if (keys.openrouter) {
                delete keys.openrouter;
                delete keys.lastUpdated;
                keys.version = (keys.version || 0) + 1;
                
                const saved = saveApiKeys(keys);
                
                if (saved) {
                    console.log('🗑️ API key deleted successfully');
                    res.json({
                        success: true,
                        message: 'API key deleted successfully'
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: 'Failed to delete API key'
                    });
                }
            } else {
                res.json({
                    success: false,
                    error: 'No API key to delete'
                });
            }
            
        } catch (error) {
            console.error('❌ Error deleting API key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete API key: ' + error.message
            });
        }
    });
    
    // Check API key status
    router.get('/api/api-key-status', (req, res) => {
        try {
            const keys = loadApiKeys();
            
            if (keys.openrouter) {
                const maskedKey = keys.openrouter.substring(0, 7) + '...' + keys.openrouter.substring(keys.openrouter.length - 4);
                
                res.json({
                    success: true,
                    configured: true,
                    maskedKey: maskedKey,
                    lastUpdated: keys.lastUpdated,
                    version: keys.version || 0
                });
            } else {
                res.json({
                    success: true,
                    configured: false
                });
            }
            
        } catch (error) {
            console.error('❌ Error checking API key status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check API key status: ' + error.message
            });
        }
    });
    
    return router;
}

module.exports = {
    createApiKeyRoutes,
    loadApiKeys,
    saveApiKeys,
    validateApiKey,
    encryptApiKey,
    decryptApiKey
};
