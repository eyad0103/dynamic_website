// Debug-Enabled API Key System - Persistent storage with comprehensive logging
const fs = require('fs');
const path = require('path');

// File path for API key storage
const API_KEY_FILE = path.join(__dirname, 'data', 'api-keys.json');
const DEBUG_LOG_FILE = path.join(__dirname, 'data', 'debug-api.log');

// Ensure data directory exists
function ensureDataDirectory() {
    const dataDir = path.dirname(API_KEY_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Debug logging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? ' | Data: ' + JSON.stringify(data) : ''}\n`;
    
    console.log(`🔑 API-DEBUG: ${message}`, data || '');
    
    try {
        fs.appendFileSync(DEBUG_LOG_FILE, logEntry);
    } catch (error) {
        console.error('❌ Failed to write debug log:', error);
    }
}

// Load API keys from file
function loadApiKeys() {
    try {
        ensureDataDirectory();
        
        if (fs.existsSync(API_KEY_FILE)) {
            const data = fs.readFileSync(API_KEY_FILE, 'utf8');
            const keys = JSON.parse(data);
            debugLog('API keys loaded from persistent storage', { 
                hasKey: !!keys.openrouter, 
                lastUpdated: keys.lastUpdated,
                version: keys.version || 0 
            });
            return keys;
        } else {
            debugLog('No API key file found, creating new one');
            return {};
        }
    } catch (error) {
        debugLog('Error loading API keys', { error: error.message });
        return {};
    }
}

// Save API keys to file with backup
function saveApiKeys(keys) {
    try {
        ensureDataDirectory();
        
        // Create backup of existing file
        if (fs.existsSync(API_KEY_FILE)) {
            const backupPath = API_KEY_FILE + '.backup';
            fs.copyFileSync(API_KEY_FILE, backupPath);
            debugLog('API key backup created', { backupPath });
        }
        
        // Write new keys
        const data = JSON.stringify(keys, null, 2);
        fs.writeFileSync(API_KEY_FILE, data, 'utf8');
        
        debugLog('API keys saved to persistent storage', { 
            hasKey: !!keys.openrouter,
            lastUpdated: keys.lastUpdated,
            version: keys.version || 0 
        });
        
        return true;
    } catch (error) {
        debugLog('Error saving API keys', { error: error.message });
        return false;
    }
}

// Validate API key format
function validateApiKey(apiKey) {
    debugLog('Validating API key', { 
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        startsWithSk: apiKey ? apiKey.startsWith('sk-or-v1-') : false
    });
    
    if (!apiKey || typeof apiKey !== 'string') {
        return { valid: false, error: 'API key is required' };
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
        return { valid: false, error: 'Invalid API key format. Must start with sk-or-v1-' };
    }
    
    if (apiKey.length < 20) {
        return { valid: false, error: 'API key is too short' };
    }
    
    debugLog('API key validation passed', { keyLength: apiKey.length });
    return { valid: true };
}

// Express routes for persistent API key management
function createApiKeyRoutes() {
    const express = require('express');
    const router = express.Router();
    
    // Save API key with persistence and validation
    router.post('/api/save-api-key', (req, res) => {
        debugLog('API key save request received', { 
            hasApiKey: !!req.body.apiKey,
            keyLength: req.body.apiKey ? req.body.apiKey.length : 0
        });
        
        try {
            const { apiKey } = req.body;
            
            // Validate API key
            const validation = validateApiKey(apiKey);
            if (!validation.valid) {
                debugLog('API key validation failed', { error: validation.error });
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }
            
            // Load existing keys
            const keys = loadApiKeys();
            
            // Check if key is changing
            const isChanging = keys.openrouter && keys.openrouter !== apiKey;
            debugLog('API key change detected', { 
                isChanging,
                hadPreviousKey: !!keys.openrouter,
                previousVersion: keys.version || 0
            });
            
            // Save new key
            keys.openrouter = apiKey;
            keys.lastUpdated = new Date().toISOString();
            keys.version = (keys.version || 0) + 1;
            
            const saved = saveApiKeys(keys);
            
            if (saved) {
                debugLog('API key save successful', { 
                    version: keys.version,
                    isChanging
                });
                
                res.json({
                    success: true,
                    message: isChanging ? 'API key updated successfully' : 'API key saved successfully',
                    isChanging: isChanging,
                    version: keys.version
                });
            } else {
                debugLog('API key save failed', { error: 'File system error' });
                res.status(500).json({
                    success: false,
                    error: 'Failed to save API key'
                });
            }
            
        } catch (error) {
            debugLog('API key save exception', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Server error: ' + error.message
            });
        }
    });
    
    // Get saved API key
    router.get('/api/get-api-key', (req, res) => {
        debugLog('API key fetch request received');
        
        try {
            const keys = loadApiKeys();
            
            if (keys.openrouter) {
                debugLog('API key fetch successful', { 
                    hasKey: true,
                    lastUpdated: keys.lastUpdated,
                    version: keys.version || 0
                });
                
                res.json({
                    success: true,
                    apiKey: keys.openrouter,
                    lastUpdated: keys.lastUpdated,
                    version: keys.version || 0
                });
            } else {
                debugLog('API key fetch failed - no key found');
                res.json({
                    success: false,
                    error: 'No API key found'
                });
            }
            
        } catch (error) {
            debugLog('API key fetch exception', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve API key: ' + error.message
            });
        }
    });
    
    // Validate API key for agent connection
    router.post('/api/validate-api-key', (req, res) => {
        debugLog('API key validation request received');
        
        try {
            const keys = loadApiKeys();
            
            if (!keys.openrouter) {
                debugLog('API key validation failed - no key configured');
                return res.status(400).json({
                    success: false,
                    error: 'No API key configured. Please save an API key first.'
                });
            }
            
            // Additional validation could be added here (e.g., test API call)
            const validation = validateApiKey(keys.openrouter);
            
            if (validation.valid) {
                debugLog('API key validation successful', { 
                    keyLength: keys.openrouter.length,
                    lastUpdated: keys.lastUpdated
                });
                
                res.json({
                    success: true,
                    message: 'API key is valid and ready for use',
                    lastUpdated: keys.lastUpdated,
                    version: keys.version || 0
                });
            } else {
                debugLog('API key validation failed', { error: validation.error });
                res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }
            
        } catch (error) {
            debugLog('API key validation exception', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Failed to validate API key: ' + error.message
            });
        }
    });
    
    // Check API key status
    router.get('/api/api-key-status', (req, res) => {
        debugLog('API key status request received');
        
        try {
            const keys = loadApiKeys();
            
            if (keys.openrouter) {
                const maskedKey = keys.openrouter.substring(0, 7) + '...' + keys.openrouter.substring(keys.openrouter.length - 4);
                
                debugLog('API key status retrieved', { 
                    hasKey: true,
                    maskedKey,
                    lastUpdated: keys.lastUpdated
                });
                
                res.json({
                    success: true,
                    configured: true,
                    maskedKey: maskedKey,
                    lastUpdated: keys.lastUpdated,
                    version: keys.version || 0
                });
            } else {
                debugLog('API key status - not configured');
                res.json({
                    success: true,
                    configured: false
                });
            }
            
        } catch (error) {
            debugLog('API key status exception', { error: error.message, stack: error.stack });
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
    debugLog
};
