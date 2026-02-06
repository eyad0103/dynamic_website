const express = require('express');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// System Baseline Object
const systemBaseline = {
    serverStartTime: new Date(),
    uptime: function() {
        return Date.now() - this.serverStartTime.getTime();
    },
    getUptimeFormatted: function() {
        const uptime = this.uptime();
        const seconds = Math.floor(uptime / 1000) % 60;
        const minutes = Math.floor(uptime / (1000 * 60)) % 60;
        const hours = Math.floor(uptime / (1000 * 60 * 60)) % 24;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
};

// Set the API key from the user
process.env.OPENROUTER_API_KEY = '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';

// Agent management system
const agents = new Map(); // pcId -> { ws, token, lastSeen, systemInfo }
const agentPackages = new Map(); // packageId -> { pcId, token, createdAt, downloaded }

// Generate secure token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Create agent package
function createAgentPackage(pcName, pcLocation, pcOwner, pcType, pcDescription) {
    const pcId = `PC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const token = generateToken();
    const packageId = crypto.randomBytes(16).toString('hex');
    
    const agentConfig = {
        pcId,
        token,
        serverUrl: process.env.RENDER_EXTERNAL_URL || 'https://dynamic-website-hzu1.onrender.com'
    };
    
    agentPackages.set(packageId, {
        pcId,
        token,
        pcName,
        pcLocation,
        pcOwner,
        pcType,
        pcDescription,
        createdAt: new Date().toISOString(),
        downloaded: false
    });
    
    return {
        packageId,
        pcId,
        token,
        config: agentConfig
    };
}

// Force redeploy for API key management - v5
console.log('🔑 API Key Management: OpenRouter API key configured');
console.log('🚀 Dashboard v2.0.5 - AI Chat with interactive error analysis');
console.log('🤖 AI Error Analysis Specialist ready for interactive chat');

// Request tracking middleware
app.use((req, res, next) => {
    req.requestCount = (global.requestCount || 0) + 1;
    global.requestCount = req.requestCount;
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sample dynamic data
const posts = [
    {
        id: 1,
        title: "Welcome to My Dynamic Website",
        content: "This is a fully functional dynamic website built with Node.js and Express! The site features server-side rendering with EJS templates, RESTful API endpoints, and a responsive modern design.",
        date: new Date().toLocaleDateString(),
        author: "Admin",
        category: "Announcement"
    },
    {
        id: 2,
        title: "About This Project",
        content: "This website demonstrates a complete full-stack application with dynamic content rendering, RESTful API endpoints, and professional UI/UX design. Built with modern web technologies for optimal performance.",
        date: new Date().toLocaleDateString(),
        author: "Admin",
        category: "Information"
    },
    {
        id: 3,
        title: "Getting Started with Node.js",
        content: "Node.js provides a powerful runtime for building scalable network applications. Combined with Express.js, we can create robust RESTful APIs and dynamic web applications with ease.",
        date: new Date(Date.now() - 86400000).toLocaleDateString(),
        author: "Admin",
        category: "Tutorial"
    }
];

// Routes
app.get('/', (req, res) => {
    res.render('dashboard', { 
        title: 'System Dashboard',
        serverStatus: 'ONLINE',
        serverUptime: systemBaseline.getUptimeFormatted(),
        serverTime: new Date().toISOString(),
        totalRequests: req.requestCount || 0,
        systemInfo: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage(),
            pid: process.pid
        }
    });
});

// Original website route (removed - dashboard is now main)

app.get('/about', (req, res) => {
    res.render('about', { 
        title: 'About',
        message: 'Learn more about this amazing dynamic website!',
        features: [
            'Server-side rendering with EJS',
            'RESTful API endpoints',
            'Responsive modern design',
            'Contact form with validation',
            'Professional UI/UX'
        ]
    });
});

app.get('/contact', (req, res) => {
    res.render('contact', { 
        title: 'Contact',
        message: 'Get in touch with us!'
    });
});

// Dashboard Route
app.get('/dashboard', (req, res) => {
    res.render('dashboard', { 
        title: 'System Dashboard',
        serverStatus: 'ONLINE',
        serverUptime: systemBaseline.getUptimeFormatted(),
        serverTime: new Date().toISOString(),
        totalRequests: req.requestCount || 0,
        systemInfo: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage(),
            pid: process.pid
        }
    });
}); // Dashboard deployed successfully

// API Routes
app.get('/api/posts', (req, res) => {
    res.json({
        success: true,
        count: posts.length,
        data: posts
    });
});

app.get('/api/posts/:id', (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (post) {
        res.json({
            success: true,
            data: post
        });
    } else {
        res.status(404).json({ 
            success: false,
            error: 'Post not found',
            message: `Post with ID ${req.params.id} does not exist`
        });
    }
});

app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    
    // Validation
    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            message: 'Name, email, and message are required'
        });
    }

    if (!email.includes('@')) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email format',
            message: 'Please provide a valid email address'
        });
    }

    // Log the submission (in production, you'd save to database)
    console.log('Contact form submission:', { 
        timestamp: new Date().toISOString(),
        name, 
        email, 
        message 
    });
    
    // Simulate processing time
    setTimeout(() => {
        res.json({ 
            success: true, 
            message: 'Thank you for your message! We\'ll get back to you soon.',
            received: {
                name,
                email,
                timestamp: new Date().toISOString()
            }
        });
    }, 500); // Simulate processing time
});

// System API Routes
app.get('/api/system/status', (req, res) => {
    res.json({
        status: "online",
        uptime: systemBaseline.getUptimeFormatted(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        requests: req.requestCount || 0
    });
});

app.get('/api/system/stats', (req, res) => {
    const memory = process.memoryUsage();
    res.json({
        uptime: systemBaseline.getUptimeFormatted(),
        memory: {
            rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
            external: Math.round(memory.external / 1024 / 1024) + 'MB'
        },
        requests: req.requestCount || 0,
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid,
            uptime: systemBaseline.getUptimeFormatted()
        }
    });
});

// Error Capture API
app.post('/api/errors/capture', async (req, res) => {
    const { appName, error, userInfo } = req.body;
    
    if (!appName || !error) {
        return res.status(400).json({
            success: false,
            error: 'App name and error message are required'
        });
    }
    
    try {
        // Store error with timestamp
        const errorRecord = {
            id: Date.now().toString(),
            appName: appName,
            error: error,
            userInfo: userInfo || 'Anonymous',
            timestamp: new Date().toISOString(),
            status: 'pending_analysis'
        };
        
        // Add to error storage (in-memory for now)
        if (!global.errorDatabase) {
            global.errorDatabase = [];
        }
        global.errorDatabase.push(errorRecord);
        
        // Trigger AI analysis
        analyzeError(errorRecord);
        
        res.json({
            success: true,
            errorId: errorRecord.id,
            message: 'Error captured and queued for analysis'
        });
        
    } catch (err) {
        console.error('Error capturing error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to capture error'
        });
    }
});

// Get all errors for dashboard
app.get('/api/errors', (req, res) => {
    const errors = global.errorDatabase || [];
    res.json({
        success: true,
        errors: errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
});

// Get specific error details
app.get('/api/errors/:id', (req, res) => {
    const errorId = req.params.id;
    const errors = global.errorDatabase || [];
    const error = errors.find(e => e.id === errorId);
    
    if (!error) {
        return res.status(404).json({
            success: false,
            error: 'Error not found'
        });
    }
    
    res.json({
        success: true,
        error: error
    });
});

// API Key Management
app.post('/api/test-api-key', async (req, res) => {
    const { apiKey, testPrompt } = req.body;
    
    if (!apiKey || !testPrompt) {
        return res.status(400).json({
            success: false,
            error: 'API key and test prompt are required'
        });
    }
    
    try {
        console.log('🔑 Testing API key:', apiKey.substring(0, 10) + '...');
        console.log('📝 Test prompt:', testPrompt);
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://dynamic-website-hzu1.onrender.com',
                'X-Title': 'API Key Test'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages: [
                    {
                        role: 'user',
                        content: testPrompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });
        
        console.log('📡 OpenRouter response status:', response.status);
        console.log('📡 OpenRouter response headers:', Object.fromEntries(response.headers));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenRouter API error:', errorText);
            throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ OpenRouter response data:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenRouter API');
        }
        
        const aiResponse = data.choices[0].message.content;
        console.log('🤖 AI response:', aiResponse);
        
        res.json({
            success: true,
            response: aiResponse
        });
        
    } catch (error) {
        console.error('❌ API key test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/save-api-key', async (req, res) => {
    const { apiKey } = req.body;
    
    if (!apiKey) {
        return res.status(400).json({
            success: false,
            error: 'API key is required'
        });
    }
    
    try {
        // Test the API key first
        const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://dynamic-website-hzu1.onrender.com',
                'X-Title': 'API Key Validation'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages: [
                    {
                        role: 'user',
                        content: 'API key validation test'
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        if (!testResponse.ok) {
            throw new Error(`API key validation failed: ${testResponse.statusText}`);
        }
        
        // Store the API key in environment (in production, this would be stored securely)
        process.env.OPENROUTER_API_KEY = apiKey;
        
        res.json({
            success: true,
            message: 'API key saved and validated successfully'
        });
        
    } catch (error) {
        console.error('API key save failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get API key status
app.get('/api/api-key-status', (req, res) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    console.log('🔑 API Key Status Check - Key exists:', !!apiKey);
    
    res.json({
        success: true,
        configured: !!apiKey,
        maskedKey: apiKey ? apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4) : null
    });
});

// Simple test endpoint
app.get('/api/test-endpoint', (req, res) => {
    res.json({
        success: true,
        message: 'API endpoints are working',
        timestamp: new Date().toISOString()
    });
});

// Debug page for testing
app.get('/debug-api', (req, res) => {
    res.sendFile(__dirname + '/debug-api.html');
});

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({
            success: false,
            error: 'Message is required'
        });
    }
    
    try {
        const openrouterApiKey = process.env.OPENROUTER_API_KEY;
        
        if (!openrouterApiKey) {
            return res.status(500).json({
                success: false,
                error: 'OpenRouter API key not configured'
            });
        }
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://dynamic-website-hzu1.onrender.com',
                'X-Title': 'AI Error Analysis Specialist'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert AI Error Analysis Specialist with deep knowledge of application debugging, system architecture, and troubleshooting. Your expertise includes:

**Phase 1 – AI Enhancement & Specialization:**
• Analyze all incoming app errors thoroughly with technical precision
• Provide clear explanations in human-readable form
• Suggest actionable fixes when possible
• Learn and adapt to various apps, systems, and error types
• Maintain clarity and accessibility in all outputs

**Visual/Color Guidance for Responses:**
• **Objective headings** – Use **Bold Blue** formatting with asterisks
• **Key actions/notes** – Use **Green** formatting with asterisks  
• **Warnings/errors** – Use **Red** formatting with asterisks
• **Explanations** – Use standard gray/light text

**Response Format Guidelines:**
1. Start with **Bold Blue** headings for main topics
2. Use **Green** for actionable steps and successful outcomes
3. Use **Red** for warnings, errors, or critical issues
4. Use clear, accessible language for all explanations
5. Provide specific, actionable fixes when possible
6. Adapt responses based on the specific app/system context

**Specialization Areas:**
- JavaScript/Node.js errors
- API and database issues
- Frontend/backend integration problems
- Performance and optimization
- Security vulnerabilities
- System architecture analysis

Always provide structured, helpful responses that empower users to solve their technical problems effectively.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 800,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenRouter API');
        }
        
        const aiResponse = data.choices[0].message.content;
        
        res.json({
            success: true,
            response: aiResponse
        });
        
    } catch (error) {
        console.error('Chat API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Initialize global storage
if (!global.errorReports) {
    global.errorReports = [];
}

if (!global.pcStatus) {
    global.pcStatus = {};
}

// Error Report Endpoint
app.post('/api/error-report', async (req, res) => {
    const { pcName, errorCount, lastError, timestamp, userAgent, url, appVersion, agentVersion } = req.body;
    
    try {
        console.log('📡 Received error report from:', pcName);
        
        // Store error report in memory (in production, this would go to database)
        if (!global.errorReports) {
            global.errorReports = [];
        }
        
        const report = {
            pcName,
            errorCount,
            lastError,
            timestamp,
            userAgent,
            url,
            appVersion,
            agentVersion,
            receivedAt: new Date().toISOString()
        };
        
        global.errorReports.push(report);
        
        // Keep only last 100 reports per PC
        if (global.errorReports.length > 100) {
            global.errorReports = global.errorReports.slice(-100);
        }
        
        // Update PC status
        if (!global.pcStatus) {
            global.pcStatus = {};
        }
        
        global.pcStatus[pcName] = {
            pcName: pcName,
            status: 'online',
            errorCount: errorCount || 0,
            lastError: lastError || null,
            lastReportSent: new Date().toISOString(),
            agentVersion: agentVersion || 'v1.0.0',
            appVersion: appVersion || 'Unknown'
        };
        
        console.log('🔧 Updated PC status for:', pcName, global.pcStatus[pcName]);
        
        // Send to AI for analysis (if API key is configured)
        if (process.env.OPENROUTER_API_KEY) {
            try {
                const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://dynamic-website-hzu1.onrender.com',
                        'X-Title': 'Error Analysis'
                    },
                    body: JSON.stringify({
                        model: 'anthropic/claude-3-haiku',
                        messages: [
                            {
                                role: 'system',
                                content: `Analyze this application error and provide actionable fixes:

**IMPORTANT: Only analyze actual application errors, bugs, or technical issues. Ignore the following:**
- Gaming content, news articles, general text, or non-error information
- Fortnite or other game-related content (unless it's causing actual technical errors)
- Marketing materials or promotional content
- User interface descriptions or design feedback
- General conversation or chat messages

**Focus on:**
1. Root cause analysis of the technical error
2. Step-by-step fix instructions
3. Prevention recommendations
4. Code examples if applicable

**Error Details:**
App: ${lastError.appName || 'Unknown'}
Error: ${lastError.details || 'Unknown'}
User: ${lastError.userAgent || 'Unknown'}
URL: ${lastError.url || 'Unknown'}
Timestamp: ${lastError.timestamp || 'Unknown'}

Please provide:
1. Root cause analysis
2. Step-by-step fix instructions
3. Prevention recommendations
4. Code examples if applicable`
                            }
                        ],
                        max_tokens: 500,
                        temperature: 0.3
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('🤖 AI Analysis completed for:', pcName);
                    
                    // Store AI analysis with the error report
                    if (data.choices && data.choices[0]) {
                        report.aiAnalysis = data.choices[0].message.content;
                    }
                }
                
            } catch (error) {
                console.error('❌ AI Analysis failed for:', pcName, error.message);
            }
        }
        
        res.json({
            success: true,
            message: 'Error report received and processed',
            reportId: report.timestamp
        });
        
    } catch (error) {
        console.error('❌ Error processing error report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PC Management Endpoints
app.get('/api/pc-status', (req, res) => {
    try {
        const pcStats = global.pcStatus || {};
        
        console.log('🔧 PC Status Request - Current PCs:', Object.keys(pcStats));
        
        res.json({
            success: true,
            pcStats: pcStats,
            totalReports: global.errorReports ? global.errorReports.length : 0
        });
        
    } catch (error) {
        console.error('❌ Error getting PC status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all error reports for dashboard
app.get('/api/error-reports', (req, res) => {
    try {
        const reports = global.errorReports || [];
        
        // Sort by timestamp (most recent first)
        const sortedReports = reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            reports: sortedReports
        });
        
    } catch (error) {
        console.error('❌ Error getting error reports:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get error reports by PC name
app.get('/api/pc-reports/:pcName', (req, res) => {
    try {
        const pcName = req.params.pcName;
        const reports = global.errorReports || [];
        const pcReports = reports.filter(r => r.pcName === pcName);
        
        // Sort by timestamp (most recent first)
        const sortedReports = pcReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            pcName: pcName,
            reports: sortedReports,
            totalReports: pcReports.length
        });
        
    } catch (error) {
        console.error('❌ Error getting PC reports:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Serve error tracking agent JavaScript
app.get('/error-tracking-agent.js', (req, res) => {
    res.sendFile(__dirname + '/error-tracking-agent.js');
});

// Test endpoint for error reporting
app.get('/api/test-error-report', (req, res) => {
    res.json({
        success: true,
        message: 'Error reporting endpoint is working',
        test: 'POST /api/error-report'
    });
});

// AI Analysis Function
async function analyzeError(errorRecord) {
    try {
        const openrouterApiKey = process.env.OPENROUTER_API_KEY;
        
        if (!openrouterApiKey) {
            console.warn('OpenRouter API key not found, skipping AI analysis');
            errorRecord.aiExplanation = 'AI analysis disabled - API key not configured';
            errorRecord.status = 'analysis_failed';
            return;
        }
        
        const prompt = `Analyze this app crash error and provide a clear explanation for the app owner:

App Name: ${errorRecord.appName}
Error Message: ${errorRecord.error}

Please explain:
1. What likely caused this error
2. How serious this issue is
3. Recommended fixes or next steps
4. Any potential impact on users

Keep the explanation clear and actionable for a non-technical app owner.`;
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterApiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://dynamic-website-hzu1.onrender.com',
                'X-Title': 'App Error Analysis'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`AI API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        const aiExplanation = data.choices[0].message.content;
        
        // Update error record with AI analysis
        errorRecord.aiExplanation = aiExplanation;
        errorRecord.status = 'analyzed';
        errorRecord.analyzedAt = new Date().toISOString();
        
        console.log(`Error ${errorRecord.id} analyzed successfully`);
        
    } catch (error) {
        console.error('AI analysis failed:', error);
        errorRecord.aiExplanation = `AI analysis failed: ${error.message}`;
        errorRecord.status = 'analysis_failed';
        errorRecord.analyzedAt = new Date().toISOString();
    }
}

// Handle 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Page not found',
        message: 'The page you\'re looking for doesn\'t exist.',
        requestedPath: req.path
    });
});

// Agent management endpoints
app.post('/api/create-agent-package', async (req, res) => {
    try {
        const { pcName, pcLocation, pcOwner, pcType, pcDescription } = req.body;
        
        if (!pcName || !pcLocation || !pcOwner || !pcType) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        const agentPackage = createAgentPackage(pcName, pcLocation, pcOwner, pcType, pcDescription);
        
        console.log(`📦 Agent package created: ${agentPackage.pcId}`);
        
        res.json({ 
            success: true, 
            packageId: agentPackage.packageId,
            pcId: agentPackage.pcId,
            downloadUrl: `/api/agent-package/${agentPackage.packageId}`
        });
    } catch (error) {
        console.error('Failed to create agent package:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/agent-package/:packageId', (req, res) => {
    try {
        const { packageId } = req.params;
        const agentPackage = agentPackages.get(packageId);
        
        if (!agentPackage) {
            return res.status(404).json({ 
                success: false, 
                error: 'Package not found' 
            });
        }
        
        // Mark as downloaded
        agentPackage.downloaded = true;
        agentPackage.downloadedAt = new Date().toISOString();
        
        // Create agent package zip with config
        const packageContent = {
            'agent.js': fs.readFileSync(path.join(__dirname, 'agent', 'agent.js'), 'utf8'),
            'agent-config.json': JSON.stringify(agentPackage.config, null, 2),
            'package.json': fs.readFileSync(path.join(__dirname, 'agent', 'package.json'), 'utf8'),
            'install.bat': '@echo off\necho Installing PC Monitor Agent...\nnode install-service.js\necho Agent installed successfully!\npause',
            'uninstall.bat': '@echo off\necho Uninstalling PC Monitor Agent...\nnode uninstall-service.js\necho Agent uninstalled successfully!\npause'
        };
        
        // Set proper headers for JSON download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="pc-monitor-agent-${agentPackage.pcId}.json"`);
        
        res.json({
            success: true,
            package: agentPackage,
            pcId: agentPackage.pcId,
            downloadUrl: `/api/agent-package/${agentPackage.packageId}`,
            instructions: {
                download: 'Download the agent package file',
                extract: 'Extract all files to a folder on your PC',
                install: 'Run install.bat as Administrator',
                verify: 'Agent will start automatically and connect to dashboard'
            }
        });
        
        console.log(`📥 Agent package downloaded: ${agentPackage.pcId}`);
        
    } catch (error) {
        console.error('Failed to download agent package:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.post('/api/revoke-agent/:pcId', (req, res) => {
    try {
        const { pcId } = req.params;
        const agent = agents.get(pcId);
        
        if (!agent) {
            return res.status(404).json({ 
                success: false, 
                error: 'Agent not found' 
            });
        }
        
        // Send revoke message to agent
        if (agent.ws && agent.ws.readyState === WebSocket.OPEN) {
            agent.ws.send(JSON.stringify({
                type: 'revoke',
                timestamp: new Date().toISOString()
            }));
        }
        
        // Remove from agents
        agents.delete(pcId);
        
        console.log(`🚫 Agent revoked: ${pcId}`);
        
        res.json({ 
            success: true, 
            message: 'Agent revoked successfully' 
        });
        
    } catch (error) {
        console.error('Failed to revoke agent:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.get('/api/agents-status', (req, res) => {
    try {
        console.log('🔧 Debug: /api/agents-status called');
        
        const agentsStatus = Array.from(agents.entries()).map(([pcId, agent]) => ({
            pcId,
            status: agent.status,
            lastSeen: agent.lastSeen,
            systemInfo: agent.systemInfo,
            errorCount: global.errorReports?.filter(e => e.pcId === pcId).length || 0
        }));
        
        console.log('🔧 Debug: agentsStatus array:', agentsStatus);
        console.log('🔧 Debug: agents Map size:', agents.size);
        
        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: true,
            agents: agentsStatus,
            totalAgents: agentsStatus.length
        });
        
        console.log('🔧 Debug: Sent JSON response');
        
    } catch (error) {
        console.error('Failed to get agents status:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).render('404', { 
        title: 'Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Dynamic Website Server Started Successfully!');
    console.log(`📍 Server running on port ${PORT}`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`⏰ Server started at: ${systemBaseline.serverStartTime.toISOString()}`);
    console.log(`📊 Request counter initialized`);
    console.log(`📡 API Endpoints:`);
    console.log(`   GET  /api/posts - Get all posts`);
    console.log(`   GET  /api/posts/:id - Get single post`);
    console.log(`   POST /api/contact - Submit contact form`);
    console.log(`   GET  /api/system/status - System status API`);
    console.log(`   GET  /api/system/stats - System statistics API`);
    console.log(`   POST /api/errors/capture - Capture app errors for AI analysis`);
    console.log(`   GET  /api/errors - Get all error records`);
    console.log(`   GET  /api/errors/:id - Get specific error details`);
    console.log(`   POST /api/test-api-key - Test OpenRouter API key`);
    console.log(`   POST /api/save-api-key - Save OpenRouter API key`);
    console.log(`   GET  /api/api-key-status - Get API key status`);
    console.log(`   GET  /api/agent-package/:packageId - Download agent package`);
    console.log(`   POST  /api/create-agent-package - Create new agent package`);
    console.log(`   POST  /api/revoke-agent/:pcId - Revoke agent access`);
    console.log(`🎨 Pages:`);
    console.log(`   GET  / - System dashboard (main)`);
    console.log(`   GET  /about - About page`);
    console.log(`   GET  /contact - Contact page`);
    console.log(`   GET  /dashboard - System dashboard (alias)`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
});

// WebSocket server for real-time agent communication
const wss = new WebSocket.Server({ 
    port: process.env.WS_PORT || 3001,
    verifyClient: (info) => {
        // Verify client authentication
        const url = new URL(info.req.url, `http://${info.req.headers.host}`);
        const pcId = url.searchParams.get('pcId');
        const token = url.searchParams.get('token');
        
        const agent = agents.get(pcId);
        if (agent && agent.token === token) {
            return true;
        }
        
        console.log(`❌ WebSocket authentication failed for PC: ${pcId}`);
        return false;
    }
});

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pcId = url.searchParams.get('pcId');
    const token = url.searchParams.get('token');
    
    console.log(`🔗 Agent connected: ${pcId}`);
    
    const agent = agents.get(pcId);
    if (agent) {
        agent.ws = ws;
        agent.lastSeen = new Date();
    } else {
        // New agent registration
        agents.set(pcId, {
            ws,
            token,
            lastSeen: new Date(),
            systemInfo: null,
            status: 'online'
        });
    }
    
    // Handle messages from agent
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleAgentMessage(pcId, message);
        } catch (error) {
            console.error(`❌ Invalid message from ${pcId}:`, error);
        }
    });
    
    // Handle disconnection
    ws.on('close', () => {
        console.log(`🔌 Agent disconnected: ${pcId}`);
        const agent = agents.get(pcId);
        if (agent) {
            agent.status = 'offline';
            agent.ws = null;
        }
        
        // Notify dashboard of disconnection
        broadcastToDashboard({
            type: 'agent_disconnected',
            pcId,
            timestamp: new Date().toISOString()
        });
    });
    
    // Send initial configuration
    ws.send(JSON.stringify({
        type: 'config',
        config: {
            heartbeatInterval: 30000,
            errorQueueSize: 100
        }
    }));
});

// Handle messages from agents
function handleAgentMessage(pcId, message) {
    const agent = agents.get(pcId);
    if (!agent) return;
    
    agent.lastSeen = new Date();
    
    switch (message.type) {
        case 'heartbeat':
            agent.status = 'online';
            broadcastToDashboard({
                type: 'agent_heartbeat',
                pcId,
                timestamp: message.timestamp
            });
            break;
            
        case 'error':
            // Store error in global error reports
            if (!global.errorReports) global.errorReports = [];
            
            const errorReport = {
                id: Date.now(),
                pcId,
                errorType: message.errorType,
                details: message.details,
                timestamp: message.timestamp,
                stack: message.stack,
                status: 'pending'
            };
            
            global.errorReports.push(errorReport);
            
            // Notify dashboard
            broadcastToDashboard({
                type: 'error_reported',
                pcId,
                error: errorReport
            });
            break;
            
        case 'system_info':
            agent.systemInfo = message.systemInfo;
            broadcastToDashboard({
                type: 'agent_system_info',
                pcId,
                systemInfo: message.systemInfo
            });
            break;
            
        case 'pong':
            // Handle ping response
            break;
            
        default:
            console.log(`📨 Unknown message type from ${pcId}:`, message.type);
    }
}

// Broadcast messages to all dashboard clients
function broadcastToDashboard(message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

module.exports = app;
