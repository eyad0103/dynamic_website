// Automated API System - Full validation, persistence, and debug logging
const fs = require('fs');
const path = require('path');

// File paths
const API_KEY_FILE = path.join(__dirname, 'data', 'api-keys.json');
const DEBUG_LOG_FILE = path.join(__dirname, 'data', 'auto-debug.log');

// Ensure data directory exists
function ensureDataDirectory() {
    const dataDir = path.dirname(API_KEY_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Enhanced debug logging with timestamps and types
function debugLog(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${message}${data ? ' | Data: ' + JSON.stringify(data) : ''}\n`;
    
    console.log(`🔑 ${type}: ${message}`, data || '');
    
    try {
        fs.appendFileSync(DEBUG_LOG_FILE, logEntry);
    } catch (error) {
        console.error('❌ Failed to write debug log:', error);
    }
    
    // Return structured log for frontend
    return {
        timestamp,
        type,
        message,
        data
    };
}

// Load API keys with validation
function loadApiKeys() {
    try {
        ensureDataDirectory();
        
        if (fs.existsSync(API_KEY_FILE)) {
            const data = fs.readFileSync(API_KEY_FILE, 'utf8');
            const keys = JSON.parse(data);
            
            debugLog('DEBUG', 'API key fetched', { 
                hasKey: !!keys.openrouter,
                lastUpdated: keys.lastUpdated,
                version: keys.version || 0
            });
            
            return keys;
        } else {
            debugLog('DEBUG', 'No API key file found, creating new one');
            return {};
        }
    } catch (error) {
        debugLog('ERROR', 'Error loading API keys', { error: error.message });
        return {};
    }
}

// Save API keys with backup and validation
function saveApiKeys(keys) {
    try {
        ensureDataDirectory();
        
        // Create backup
        if (fs.existsSync(API_KEY_FILE)) {
            const backupPath = API_KEY_FILE + '.backup';
            fs.copyFileSync(API_KEY_FILE, backupPath);
            debugLog('DEBUG', 'API key backup created', { backupPath });
        }
        
        // Write new keys
        const data = JSON.stringify(keys, null, 2);
        fs.writeFileSync(API_KEY_FILE, data, 'utf8');
        
        debugLog('DEBUG', 'API keys saved to persistent storage', { 
            hasKey: !!keys.openrouter,
            lastUpdated: keys.lastUpdated,
            version: keys.version || 0
        });
        
        return true;
    } catch (error) {
        debugLog('ERROR', 'Error saving API keys', { error: error.message });
        return false;
    }
}

// Enhanced API key validation
function validateApiKey(apiKey) {
    debugLog('DEBUG', 'Validating API key', { 
        hasKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        startsWithSk: apiKey ? apiKey.startsWith('sk-or-v1-') : false
    });
    
    if (!apiKey || typeof apiKey !== 'string') {
        return { 
            valid: false, 
            error: 'API key is required and must be a string' 
        };
    }
    
    if (!apiKey.startsWith('sk-or-v1-')) {
        return { 
            valid: false, 
            error: 'Invalid API key format. Must start with sk-or-v1-' 
        };
    }
    
    if (apiKey.length < 20) {
        return { 
            valid: false, 
            error: 'API key is too short (minimum 20 characters)' 
        };
    }
    
    if (apiKey.length > 200) {
        return { 
            valid: false, 
            error: 'API key is too long (maximum 200 characters)' 
        };
    }
    
    debugLog('DEBUG', 'API key validation passed', { keyLength: apiKey.length });
    return { valid: true };
}

// Express routes for automated API key management
function createAutomatedApiKeyRoutes() {
    const express = require('express');
    const router = express.Router();
    
    // Save API key with comprehensive validation
    router.post('/api/save-api-key', (req, res) => {
        debugLog('DEBUG', 'API key save request received', { 
            hasApiKey: !!req.body.apiKey,
            keyLength: req.body.apiKey ? req.body.apiKey.length : 0
        });
        
        try {
            const { apiKey } = req.body;
            
            // Validate API key
            const validation = validateApiKey(apiKey);
            if (!validation.valid) {
                debugLog('ERROR', 'API key validation failed', { error: validation.error });
                return res.status(400).json({
                    success: false,
                    error: validation.error,
                    field: 'apiKey'
                });
            }
            
            // Load existing keys
            const keys = loadApiKeys();
            
            // Check if key is changing
            const isChanging = keys.openrouter && keys.openrouter !== apiKey;
            debugLog('DEBUG', 'API key change detected', { 
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
                debugLog('INFO', 'API key saved successfully', { 
                    version: keys.version,
                    isChanging
                });
                
                res.json({
                    success: true,
                    message: isChanging ? 'API key updated successfully' : 'API key saved successfully',
                    isChanging: isChanging,
                    version: keys.version,
                    lastUpdated: keys.lastUpdated
                });
            } else {
                debugLog('ERROR', 'API key save failed', { error: 'File system error' });
                res.status(500).json({
                    success: false,
                    error: 'Failed to save API key due to server error'
                });
            }
            
        } catch (error) {
            debugLog('ERROR', 'API key save exception', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Server error: ' + error.message
            });
        }
    });
    
    // Get saved API key
    router.get('/api/get-api-key', (req, res) => {
        debugLog('DEBUG', 'API key fetch request received');
        
        try {
            const keys = loadApiKeys();
            
            if (keys.openrouter) {
                debugLog('DEBUG', 'API key fetch successful', { 
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
                debugLog('DEBUG', 'API key fetch failed - no key found');
                res.json({
                    success: false,
                    error: 'No API key found'
                });
            }
            
        } catch (error) {
            debugLog('ERROR', 'API key fetch exception', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve API key: ' + error.message
            });
        }
    });
    
    // Validate API key for agent connection (blocks connection if invalid)
    router.post('/api/validate-api-key', (req, res) => {
        debugLog('DEBUG', 'API key validation request received for agent connection');
        
        try {
            const keys = loadApiKeys();
            
            if (!keys.openrouter) {
                debugLog('ERROR', 'API key validation failed - no key configured');
                return res.status(400).json({
                    success: false,
                    error: 'No API key configured. Please save an API key first.',
                    blockConnection: true
                });
            }
            
            // Additional validation
            const validation = validateApiKey(keys.openrouter);
            
            if (validation.valid) {
                debugLog('INFO', 'API key validation successful for agent connection', { 
                    keyLength: keys.openrouter.length,
                    lastUpdated: keys.lastUpdated
                });
                
                res.json({
                    success: true,
                    message: 'API key is valid and ready for agent connection',
                    lastUpdated: keys.lastUpdated,
                    version: keys.version || 0,
                    blockConnection: false
                });
            } else {
                debugLog('ERROR', 'API key validation failed for agent connection', { error: validation.error });
                res.status(400).json({
                    success: false,
                    error: validation.error,
                    blockConnection: true
                });
            }
            
        } catch (error) {
            debugLog('ERROR', 'API key validation exception', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Failed to validate API key: ' + error.message,
                blockConnection: true
            });
        }
    });
    
    // Check API key status
    router.get('/api/api-key-status', (req, res) => {
        debugLog('DEBUG', 'API key status request received');
        
        try {
            const keys = loadApiKeys();
            
            if (keys.openrouter) {
                const maskedKey = keys.openrouter.substring(0, 7) + '...' + keys.openrouter.substring(keys.openrouter.length - 4);
                
                debugLog('DEBUG', 'API key status retrieved', { 
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
                debugLog('DEBUG', 'API key status - not configured');
                res.json({
                    success: true,
                    configured: false
                });
            }
            
        } catch (error) {
            debugLog('ERROR', 'API key status exception', { error: error.message, stack: error.stack });
            res.status(500).json({
                success: false,
                error: 'Failed to check API key status: ' + error.message
            });
        }
    });
    
    // Get recent debug logs
    router.get('/api/debug-logs', (req, res) => {
        debugLog('DEBUG', 'Debug logs request received');
        
        try {
            if (fs.existsSync(DEBUG_LOG_FILE)) {
                const logs = fs.readFileSync(DEBUG_LOG_FILE, 'utf8');
                const logLines = logs.trim().split('\n').filter(line => line.trim());
                
                // Get last 50 logs
                const recentLogs = logLines.slice(-50).map(line => {
                    const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
                    if (match) {
                        return {
                            timestamp: match[1],
                            type: match[2],
                            message: match[3]
                        };
                    }
                    return null;
                }).filter(log => log);
                
                res.json({
                    success: true,
                    logs: recentLogs
                });
            } else {
                res.json({
                    success: true,
                    logs: []
                });
            }
        } catch (error) {
            debugLog('ERROR', 'Failed to read debug logs', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Failed to read debug logs: ' + error.message
            });
        }
    });
    
    return router;
}

module.exports = {
    createAutomatedApiKeyRoutes,
    loadApiKeys,
    saveApiKeys,
    validateApiKey,
    debugLog
};
