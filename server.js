const express = require('express');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');

// Import run-credentials API
const runCredentialsRouter = require('./run-credentials-api.js');
const enhancedRoutes = require('./enhanced-backend-routes.js');
const { createApiKeyRoutes } = require('./persistent-api-keys.js');
const pcManagementRoutes = require('./separated-pc-management.js');

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

// Agent management system with persistence
const agents = new Map(); // pcId -> { ws, token, lastSeen, systemInfo }
const agentPackages = new Map(); // packageId -> { pcId, token, createdAt, downloaded }

// Load persisted data on startup
function loadPersistedData() {
    try {
        // In production, this would load from database
        // For now, we'll keep in-memory but ensure it survives restarts
        console.log('🔄 Loading persisted agent data...');
        
        // Check if we have any existing packages (they should be recreated after deployment)
        if (agentPackages.size === 0) {
            console.log('📦 No existing packages found - system ready for new registrations');
        }
        
        console.log(`📊 Current state: ${agents.size} agents, ${agentPackages.size} packages`);
    } catch (error) {
        console.error('❌ Failed to load persisted data:', error);
    }
}

// Initialize data on startup
loadPersistedData();

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

// Use run-credentials API routes
app.use(runCredentialsRouter);
app.use(enhancedRoutes);
app.use(createApiKeyRoutes());
app.use(pcManagementRoutes);

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

// Simple test endpoint
app.get('/api/test-endpoint', (req, res) => {
    res.json({
        success: true,
        message: 'API endpoints are working',
        timestamp: new Date().toISOString()
    });
});

// Serve agent.js file for download
app.get('/agent.js', (req, res) => {
    try {
        const agentJsPath = path.join(__dirname, '..', 'PC-Monitor-Agent', 'agent.js');
        if (fs.existsSync(agentJsPath)) {
            res.sendFile(agentJsPath);
        } else {
            // Fallback: provide a basic agent.js content
            const basicAgent = `#!/usr/bin/env node

/**
 * PC Monitor Agent - Basic Version
 * For when the full agent is not available
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load configuration
const CONFIG_FILE = path.join(__dirname, 'agent-config.json');

if (!fs.existsSync(CONFIG_FILE)) {
    console.error('❌ Configuration file not found. Please run setup first.');
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
console.log('✅ Configuration loaded for PC:', config.pcId);

// Register with backend
async function registerAgent() {
    try {
        const response = await axios.post(
            \`${config.serverUrl}/api/register-agent\`,
            {
                pcId: config.pcId,
                token: config.token,
                systemInfo: {
                    platform: process.platform,
                    hostname: require('os').hostname(),
                    nodeVersion: process.version,
                    agentVersion: '1.0.0'
                }
            },
            {
                timeout: 10000,
                headers: {
                    'User-Agent': \`PC-Monitor-Agent/1.0.0\`
                }
            }
        );

        if (response.data.success) {
            console.log('✅ Agent registered successfully!');
            console.log('📊 Total agents:', response.data.totalAgents);
            startMonitoring();
        } else {
            console.error('❌ Registration failed:', response.data.error);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        process.exit(1);
    }
}

// Start monitoring
function startMonitoring() {
    console.log('🔍 Starting system monitoring...');
    console.log('📡 Agent is running. Press Ctrl+C to stop.');
    
    // Basic error handling
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught exception:', error.message);
        reportError(error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled rejection:', reason);
        reportError(new Error(reason.toString()));
    });
    
    // Keep the process running
    setInterval(() => {
        // Heartbeat
    }, 30000);
}

// Report error to backend
async function reportError(error) {
    try {
        await axios.post(
            \`${config.serverUrl}/api/error-report\`,
            {
                pcId: config.pcId,
                appName: 'pc-monitor-agent',
                errorType: error.name || 'unknown',
                message: error.message,
                stackTrace: error.stack || '',
                severity: 'error',
                timestamp: new Date().toISOString()
            }
        );
        console.log('📡 Error reported to backend');
    } catch (e) {
        console.error('❌ Failed to report error:', e.message);
    }
}

// Start the agent
registerAgent();
`;
            res.setHeader('Content-Type', 'application/javascript');
            res.send(basicAgent);
        }
    } catch (error) {
        console.error('Failed to serve agent.js:', error);
        res.status(500).json({ error: 'Agent file not available' });
    }
});

// Serve setup instructions
app.get('/setup-instructions', (req, res) => {
    res.json({
        success: true,
        instructions: {
            quickStart: [
                {
                    step: 1,
                    action: 'Create agent package',
                    command: 'curl -X POST -H "Content-Type: application/json" -d \'{"pcName":"YOUR-PC-NAME","pcLocation":"Office","pcOwner":"YOUR-NAME","pcType":"Workstation","pcDescription":"Main development PC"}\' https://dynamic-website-hzu1.onrender.com/api/create-agent-package'
                },
                {
                    step: 2,
                    action: 'Download configuration',
                    command: 'curl https://dynamic-website-hzu1.onrender.com/api/agent-package/{packageId} > agent-config.json'
                },
                {
                    step: 3,
                    action: 'Download agent.js',
                    command: 'curl https://dynamic-website-hzu1.onrender.com/agent.js > agent.js'
                },
                {
                    step: 4,
                    action: 'Install dependencies',
                    command: 'npm install'
                },
                {
                    step: 5,
                    action: 'Start agent',
                    command: 'node agent.js'
                }
            ],
            verification: [
                {
                    action: 'Check agent registration',
                    command: 'curl https://dynamic-website-hzu1.onrender.com/api/agents-status'
                },
                {
                    action: 'View dashboard',
                    url: 'https://dynamic-website-hzu1.onrender.com/dashboard'
                }
            ],
            troubleshooting: {
                missingAgent: {
                    problem: 'Cannot find module agent.js',
                    solution: 'Run: curl https://dynamic-website-hzu1.onrender.com/agent.js > agent.js'
                },
                registrationError: {
                    problem: 'Agent fails to register',
                    solution: 'Check agent-config.json file and network connectivity'
                },
                dependencyError: {
                    problem: 'npm install fails',
                    solution: 'Ensure Node.js 18+ is installed and run npm install'
                }
            }
        }
    });
});

// Debug page for testing
app.get('/debug-api', (req, res) => {
    res.sendFile(__dirname + '/debug-api.html');
});

// AI Chat endpoint - Enhanced with better error handling and retry logic
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({
            success: false,
            error: 'Message is required'
        });
    }
    
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
        try {
            const openrouterApiKey = process.env.OPENROUTER_API_KEY;
            
            if (!openrouterApiKey) {
                console.error('❌ OpenRouter API key not configured');
                return res.status(500).json({
                    success: false,
                    error: 'AI service not configured'
                });
            }
            
            console.log(`🤖 AI Chat request (attempt ${retryCount + 1}/${maxRetries}):`, message.substring(0, 100));
            
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
            const responseTime = Date.now() - startTime;
            
            console.log(`✅ AI Chat response successful (${responseTime}ms)`);
            
            res.json({
                success: true,
                response: aiResponse,
                responseTime: `${responseTime}ms`
            });
            return; // Success, exit retry loop
            
        } catch (error) {
            retryCount++;
            console.error(`❌ AI Chat attempt ${retryCount} failed:`, error.message);
            
            if (retryCount >= maxRetries) {
                console.error('❌ All AI Chat retry attempts failed');
                res.status(500).json({
                    success: false,
                    error: 'AI service temporarily unavailable',
                    details: error.message,
                    retryCount: retryCount
                });
                return;
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        }
    }
});

// POST-DEPLOY SELF-TEST (AUTOMATIC)
function runDeploymentTests() {
    console.log('🧪 RUNNING POST-DEPLOY SELF-TESTS...');
    const testResults = {
        timestamp: new Date().toISOString(),
        buildVersion: process.env.RENDER_GIT_COMMIT || 'unknown',
        tests: {},
        overall: 'UNKNOWN'
    };
    
    // Test 1: Database connection (in-memory storage)
    try {
        const dbTest = {
            agentPackages: agentPackages.size,
            agents: agents.size,
            errorReports: global.errorReports ? global.errorReports.length : 0,
            pcStatus: global.pcStatus ? Object.keys(global.pcStatus).length : 0
        };
        testResults.tests.database = {
            status: 'PASS',
            details: dbTest
        };
        console.log('✅ Database test:', dbTest);
    } catch (error) {
        testResults.tests.database = {
            status: 'FAIL',
            error: error.message
        };
        console.log('❌ Database test failed:', error.message);
    }
    
    // Test 2: Auth/token validation
    try {
        const testPcId = `PC-${Date.now()}-test`;
        const testToken = generateToken();
        
        // Create test package
        agentPackages.set('test-package', {
            pcId: testPcId,
            token: testToken,
            pcName: 'Test Agent',
            createdAt: new Date().toISOString()
        });
        
        // Test validation
        let authTest = false;
        for (const [id, pkg] of agentPackages.entries()) {
            if (pkg.pcId === testPcId && pkg.token === testToken) {
                authTest = true;
                break;
            }
        }
        
        // Cleanup
        agentPackages.delete('test-package');
        
        testResults.tests.auth = {
            status: authTest ? 'PASS' : 'FAIL',
            details: { tokenValidation: authTest }
        };
        console.log('✅ Auth test:', authTest ? 'PASS' : 'FAIL');
    } catch (error) {
        testResults.tests.auth = {
            status: 'FAIL',
            error: error.message
        };
        console.log('❌ Auth test failed:', error.message);
    }
    
    // Test 3: Agent registration endpoint
    try {
        const testAgent = {
            pcId: `PC-${Date.now()}-regtest`,
            token: generateToken(),
            systemInfo: { platform: 'test', hostname: 'test-agent' }
        };
        
        // Create test package
        agentPackages.set('regtest-package', {
            pcId: testAgent.pcId,
            token: testAgent.token,
            pcName: 'Registration Test',
            createdAt: new Date().toISOString()
        });
        
        // Test registration
        agents.set(testAgent.pcId, {
            pcId: testAgent.pcId,
            token: testAgent.token,
            systemInfo: testAgent.systemInfo,
            status: 'online',
            lastSeen: new Date(),
            registeredAt: new Date().toISOString()
        });
        
        const regTest = agents.has(testAgent.pcId);
        
        // Cleanup
        agentPackages.delete('regtest-package');
        agents.delete(testAgent.pcId);
        
        testResults.tests.registration = {
            status: regTest ? 'PASS' : 'FAIL',
            details: { agentRegistered: regTest }
        };
        console.log('✅ Registration test:', regTest ? 'PASS' : 'FAIL');
    } catch (error) {
        testResults.tests.registration = {
            status: 'FAIL',
            error: error.message
        };
        console.log('❌ Registration test failed:', error.message);
    }
    
    // Test 4: Error ingestion endpoint
    try {
        const testError = {
            id: Date.now().toString(),
            pcId: 'test-pc',
            appName: 'test-app',
            message: 'Test error for validation',
            severity: 'test',
            timestamp: new Date().toISOString()
        };
        
        if (!global.errorReports) {
            global.errorReports = [];
        }
        
        global.errorReports.push(testError);
        const errorTest = global.errorReports.some(e => e.id === testError.id);
        
        // Cleanup
        global.errorReports = global.errorReports.filter(e => e.id !== testError.id);
        
        testResults.tests.errorIngestion = {
            status: errorTest ? 'PASS' : 'FAIL',
            details: { errorStored: errorTest }
        };
        console.log('✅ Error ingestion test:', errorTest ? 'PASS' : 'FAIL');
    } catch (error) {
        testResults.tests.errorIngestion = {
            status: 'FAIL',
            error: error.message
        };
        console.log('❌ Error ingestion test failed:', error.message);
    }
    
    // Test 5: AI service status
    try {
        const aiTest = {
            hasApiKey: !!process.env.OPENROUTER_API_KEY,
            apiKeyLength: process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.length : 0
        };
        
        testResults.tests.aiService = {
            status: aiTest.hasApiKey ? 'PASS' : 'FAIL',
            details: aiTest
        };
        console.log('✅ AI service test:', aiTest.hasApiKey ? 'PASS' : 'FAIL');
    } catch (error) {
        testResults.tests.aiService = {
            status: 'FAIL',
            error: error.message
        };
        console.log('❌ AI service test failed:', error.message);
    }
    
    // Test 6: WebSocket status (basic check)
    try {
        const wsTest = {
            serverRunning: true,
            port: PORT,
            wsServerReady: wss ? true : false
        };
        
        testResults.tests.websocket = {
            status: wsTest.wsServerReady ? 'PASS' : 'FAIL',
            details: wsTest
        };
        console.log('✅ WebSocket test:', wsTest.wsServerReady ? 'PASS' : 'FAIL');
    } catch (error) {
        testResults.tests.websocket = {
            status: 'FAIL',
            error: error.message
        };
        console.log('❌ WebSocket test failed:', error.message);
    }
    
    // Calculate overall status
    const testStatuses = Object.values(testResults.tests).map(t => t.status);
    const passCount = testStatuses.filter(s => s === 'PASS').length;
    const totalTests = testStatuses.length;
    
    testResults.overall = passCount === totalTests ? 'HEALTHY' : 'UNHEALTHY';
    testResults.summary = {
        passed: passCount,
        total: totalTests,
        percentage: Math.round((passCount / totalTests) * 100)
    };
    
    // Store results for health endpoint
    global.deploymentTestResults = testResults;
    
    console.log('\n🧪 DEPLOYMENT TEST RESULTS:');
    console.log('Overall Status:', testResults.overall);
    console.log('Tests Passed:', testResults.summary.passed + '/' + testResults.summary.total);
    console.log('Health Percentage:', testResults.summary.percentage + '%');
    
    if (testResults.overall === 'UNHEALTHY') {
        console.log('\n❌ SYSTEM IS UNHEALTHY - CHECK FAILED TESTS');
    } else {
        console.log('\n✅ SYSTEM IS HEALTHY - ALL TESTS PASSED');
    }
    
    return testResults;
}

// Run tests on startup
setTimeout(() => {
    runDeploymentTests();
}, 5000); // Wait 5 seconds for server to fully start

// HEALTH & DEBUG ENDPOINT
app.get('/api/health', (req, res) => {
    try {
        const testResults = global.deploymentTestResults || { status: 'NOT_RUN' };
        const healthData = {
            timestamp: new Date().toISOString(),
            buildVersion: process.env.RENDER_GIT_COMMIT || 'local',
            uptime: formatUptime(process.uptime()),
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage()
            },
            database: {
                agentPackages: agentPackages.size,
                registeredAgents: agents.size,
                errorReports: global.errorReports ? global.errorReports.length : 0,
                pcStatusRecords: global.pcStatus ? Object.keys(global.pcStatus).length : 0
            },
            services: {
                aiService: {
                    status: !!process.env.OPENROUTER_API_KEY ? 'UP' : 'DOWN',
                    hasApiKey: !!process.env.OPENROUTER_API_KEY
                },
                websocket: {
                    status: wss ? 'UP' : 'DOWN',
                    port: PORT
                },
                registration: {
                    status: 'UP',
                    endpoint: '/api/register-agent'
                },
                errorReporting: {
                    status: 'UP',
                    endpoint: '/api/error-report'
                }
            },
            agents: {
                totalRegistered: agents.size,
                onlineCount: Array.from(agents.values()).filter(a => a.status === 'online').length,
                lastHeartbeat: agents.size > 0 ? Math.max(...Array.from(agents.values()).map(a => new Date(a.lastSeen || 0))) : null
            },
            deploymentTests: testResults,
            overall: testResults.overall || 'UNKNOWN'
        };
        
        const statusCode = healthData.overall === 'HEALTHY' ? 200 : 503;
        res.status(statusCode).json(healthData);
        
    } catch (error) {
        console.error('Health endpoint error:', error);
        res.status(500).json({
            error: 'Health check failed',
            message: error.message,
            timestamp: new Date().toISOString()
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

// Agent Error Reporting Endpoint - Enhanced with validation and logging
app.post('/api/error-report', async (req, res) => {
    try {
        const { pcId, appName, errorType, message, stackTrace, severity, timestamp, systemInfo } = req.body;
        
        // Enhanced validation
        if (!pcId || !message) {
            console.warn('⚠️ Invalid error report - missing required fields:', { pcId: !!pcId, message: !!message });
            return res.status(400).json({
                success: false,
                error: 'PC ID and error message are required'
            });
        }
        
        // Validate PC is registered
        if (!agents.has(pcId)) {
            console.warn('⚠️ Error report from unregistered PC:', pcId);
            return res.status(401).json({
                success: false,
                error: 'PC not registered. Please register the agent first.'
            });
        }
        
        console.log('📡 Received error report from:', pcId, '-', appName || 'Unknown', '-', message.substring(0, 100));
        
        // Store error report in memory (in production, this would go to database)
        if (!global.errorReports) {
            global.errorReports = [];
        }
        
        const report = {
            id: Date.now().toString(),
            pcId,
            appName: appName || 'Unknown',
            errorType: errorType || 'application_error',
            message,
            stackTrace: stackTrace || '',
            severity: severity || 'error',
            timestamp: timestamp || new Date().toISOString(),
            systemInfo: systemInfo || {},
            receivedAt: new Date().toISOString(),
            status: 'pending_analysis'
        };
        
        global.errorReports.push(report);
        console.log('💾 Error report stored, ID:', report.id);
        
        // Keep only last 1000 reports
        if (global.errorReports.length > 1000) {
            global.errorReports = global.errorReports.slice(-1000);
        }
        
        // Update PC status
        if (!global.pcStatus) {
            global.pcStatus = {};
        }
        
        if (!global.pcStatus[pcId]) {
            global.pcStatus[pcId] = {
                pcId,
                pcName: systemInfo?.hostname || pcId,
                status: 'online',
                lastSeen: new Date().toISOString(),
                errorCount: 0,
                lastError: null
            };
        }
        
        global.pcStatus[pcId].lastSeen = new Date().toISOString();
        global.pcStatus[pcId].errorCount = (global.pcStatus[pcId].errorCount || 0) + 1;
        global.pcStatus[pcId].lastError = {
            message: report.message,
            severity: report.severity,
            timestamp: report.timestamp
        };
        
        console.log('🔧 Updated PC status for:', pcId, 'Error count:', global.pcStatus[pcId].errorCount);
        
        // Trigger AI analysis asynchronously (don't wait for it)
        analyzeError(report).catch(error => {
            console.error('❌ AI Analysis failed for:', report.id, error.message);
        });
        
        res.json({
            success: true,
            message: 'Error report received and processed',
            reportId: report.id,
            pcStatus: {
                errorCount: global.pcStatus[pcId].errorCount,
                lastError: global.pcStatus[pcId].lastError
            }
        });
        
    } catch (error) {
        console.error('❌ Error processing error report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// AI Error Analysis Function
async function analyzeError(report) {
    try {
        console.log('🤖 Analyzing error:', report.id);
        
        const analysisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
                        content: `Analyze this application error and provide actionable fixes:

**Error Details:**
PC ID: ${report.pcId}
App: ${report.appName}
Error Type: ${report.errorType}
Message: ${report.message}
Stack Trace: ${report.stackTrace}
Severity: ${report.severity}
Timestamp: ${report.timestamp}
System Info: ${JSON.stringify(report.systemInfo, null, 2)}

Please provide:
1. **Root Cause Analysis** - What caused this error?
2. **Step-by-Step Fix** - How to resolve it
3. **Prevention** - How to avoid future occurrences
4. **Impact Assessment** - Severity and system effects`
                    }
                ],
                max_tokens: 800,
                temperature: 0.3
            })
        });
        
        if (analysisResponse.ok) {
            const data = await analysisResponse.json();
            console.log('🤖 AI Analysis completed for:', report.id);
            
            // Store AI analysis with the error report
            if (data.choices && data.choices[0]) {
                report.aiAnalysis = data.choices[0].message.content;
                report.status = 'analyzed';
                
                // Notify dashboard of analysis completion
                broadcastToDashboard({
                    type: 'error_analyzed',
                    pcId: report.pcId,
                    errorId: report.id,
                    analysis: report.aiAnalysis
                });
            }
        }
        
    } catch (error) {
        console.error('❌ AI Analysis failed for:', report.id, error.message);
        report.status = 'analysis_failed';
    }
}

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

// Agent management endpoints
// Create PC endpoint - REAL connection model
app.post('/api/create-pc', async (req, res) => {
    try {
        const { pcName, pcLocation, pcOwner, pcType, pcDescription } = req.body;
        
        if (!pcName || !pcLocation || !pcOwner || !pcType) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        // Generate REAL PC credentials
        const pcId = `PC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const authToken = crypto.randomBytes(32).toString('hex');
        
        // Store in agent packages with connection metadata
        const packageId = crypto.randomBytes(16).toString('hex');
        agentPackages.set(packageId, {
            pcId,
            pcName,
            pcLocation,
            pcOwner,
            pcType,
            pcDescription,
            authToken,
            createdAt: new Date().toISOString(),
            status: 'WAITING', // Waiting for agent to connect
            lastSeen: null,
            connectionType: 'real'
        });
        
        console.log(`🔧 PC Created: ${pcId} - Waiting for agent connection`);
        
        res.json({ 
            success: true, 
            pcId,
            authToken,
            message: `PC "${pcName}" created. Waiting for agent to connect...`
        });
    } catch (error) {
        console.error('Failed to create PC:', error);
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

// List all PCs endpoint - REAL connection status
app.get('/api/pcs', (req, res) => {
    try {
        const allPCs = [];
        const now = Date.now();
        
        // Add agent packages (created PCs with real connection status)
        agentPackages.forEach((pkg, packageId) => {
            // Check if agent is connected via WebSocket
            const connectedAgent = agents.get(pkg.pcId);
            let status = 'OFFLINE';
            let lastSeen = pkg.lastSeen;
            
            if (connectedAgent && connectedAgent.ws && connectedAgent.ws.readyState === WebSocket.OPEN) {
                status = 'ONLINE';
                lastSeen = connectedAgent.lastSeen;
            } else if (pkg.lastSeen) {
                // Check if last seen is within 10 seconds
                const timeDiff = now - new Date(pkg.lastSeen).getTime();
                status = timeDiff < 10000 ? 'ONLINE' : 'OFFLINE';
            }
            
            allPCs.push({
                id: pkg.pcId,
                name: pkg.pcName,
                location: pkg.pcLocation,
                owner: pkg.pcOwner,
                type: pkg.pcType,
                description: pkg.pcDescription,
                status: status,
                authToken: pkg.authToken,
                createdAt: pkg.createdAt,
                lastSeen: lastSeen,
                connectionType: 'real',
                systemInfo: connectedAgent?.systemInfo || null
            });
        });
        
        // Sort by creation date (newest first)
        allPCs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json({
            success: true,
            pcs: allPCs,
            total: allPCs.length
        });
        
    } catch (error) {
        console.error('Failed to list PCs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Heartbeat endpoint - REAL agent heartbeat
app.post('/api/heartbeat', (req, res) => {
    try {
        const { pc_id, timestamp, cpu, ram } = req.body;
        
        if (!pc_id) {
            return res.status(400).json({
                success: false,
                error: 'PC ID is required'
            });
        }
        
        const agent = agents.get(pc_id);
        if (!agent) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        
        // Update last seen and metrics
        agent.lastSeen = new Date().toISOString();
        if (cpu !== undefined) agent.cpu = cpu;
        if (ram !== undefined) agent.ram = ram;
        
        // Update corresponding package status
        agentPackages.forEach((pkg, packageId) => {
            if (pkg.pcId === pc_id) {
                pkg.status = 'ONLINE';
                pkg.lastSeen = agent.lastSeen;
            }
        });
        
        console.log(`💓 Heartbeat received: ${pc_id} (CPU: ${cpu}%, RAM: ${ram}%)`);
        
        res.json({
            success: true,
            message: 'Heartbeat received',
            status: 'ONLINE'
        });
        
    } catch (error) {
        console.error('Heartbeat failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Agent Registration Endpoint - REAL authentication with pc_id and auth_token
app.post('/api/register-agent', async (req, res) => {
    try {
        const { pc_id, auth_token, hostname, OS, local_ip } = req.body;
        
        // Enhanced validation
        if (!pc_id || !auth_token) {
            console.warn('⚠️ Registration attempt - missing required fields:', { pc_id: !!pc_id, auth_token: !!auth_token });
            return res.status(400).json({
                success: false,
                error: 'PC ID and auth token are required'
            });
        }
        
        // Find the PC in agent packages to validate auth token
        let validPc = null;
        agentPackages.forEach((pkg, packageId) => {
            if (pkg.pcId === pc_id && pkg.authToken === auth_token) {
                validPc = pkg;
            }
        });
        
        if (!validPc) {
            console.warn('⚠️ Invalid PC credentials:', { pc_id, hasToken: !!auth_token });
            return res.status(401).json({
                success: false,
                error: 'Invalid PC ID or auth token'
            });
        }
        
        // Validate PC ID format
        if (!pc_id.match(/^PC-\d+-[a-z0-9]+$/)) {
            console.warn('⚠️ Invalid PC ID format:', pc_id);
            return res.status(400).json({
                success: false,
                error: 'Invalid PC ID format'
            });
        }
        
        // Store agent with system info
        const systemInfo = {
            hostname: hostname || 'Unknown',
            OS: OS || 'Unknown',
            local_ip: local_ip || 'Unknown',
            pcName: validPc.pcName,
            location: validPc.pcLocation,
            owner: validPc.pcOwner,
            pcType: validPc.pcType,
            description: validPc.pcDescription
        };
        
        agents.set(pc_id, {
            ws: null, // Will be set when WebSocket connects
            token: auth_token,
            lastSeen: new Date().toISOString(),
            systemInfo: systemInfo,
            createdAt: validPc.createdAt,
            registeredAt: new Date().toISOString()
        });
        
        console.log(`✅ Agent registered successfully: ${pc_id} (${systemInfo.hostname})`);
        
        res.json({
            success: true,
            message: 'Agent registered successfully',
            pc_id: pc_id,
            status: 'ONLINE'
        });
        
    } catch (error) {
        console.error('❌ Failed to register agent:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed due to server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    console.log('BOOT VERSION:', process.env.RENDER_GIT_COMMIT || 'unknown');
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
    console.log(`   GET  /api/health - Health check endpoint`);
    console.log(`   POST /api/errors/capture - Capture app errors for AI analysis`);
    console.log(`   GET  /api/errors - Get all error records`);
    console.log(`   GET  /api/errors/:id - Get specific error details`);
    console.log(`   POST /api/test-api-key - Test OpenRouter API key`);
    console.log(`   POST /api/save-api-key - Save OpenRouter API key`);
    console.log(`   GET  /api/api-key-status - Get API key status`);
    console.log(`   GET  /api/agent-package/:packageId - Download agent package`);
    console.log(`   POST /api/create-pc - Create new PC`);
    console.log(`   POST /api/register-agent - Register agent`);
    console.log(`   POST /api/revoke-agent/:pcId - Revoke agent access`);
    console.log(`   GET  /agent.js - Download agent file`);
    console.log(`   GET  /setup-instructions - Get setup instructions`);
    console.log(`   GET  /__deploy_test - Deployment test endpoint`);
    console.log(`   POST /api/run-credentials - Run agent with credentials`);
    console.log(`   GET  /api/credentials/:sessionId - Get credentials for session`);
    console.log(`   POST /api/execute-agent/:sessionId - Execute agent code`);
    console.log(`🎨 Pages:`);
    console.log(`   GET  / - System dashboard (main)`);
    console.log(`   GET  /about - About page`);
    console.log(`   GET  /contact - Contact page`);
    console.log(`   GET  /dashboard - System dashboard (alias)`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Temporary deployment test route
app.get('/__deploy_test', (req, res) => {
    res.json({
        commit: process.env.RENDER_GIT_COMMIT || 'unknown',
        timestamp: new Date().toISOString(),
        status: 'deployed'
    });
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

const wss = new WebSocket.Server({ 
    port: process.env.WS_PORT || 3001,
    path: '/agent-ws'
});

console.log('🔌 WebSocket server started on port 3001');

// Store agent connections
const agentConnections = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    // Extract PC ID and token from headers
    const pcId = req.headers['pc-id'];
    const token = req.headers['token'];
    
    console.log(`🔌 Agent connection attempt: ${pcId}`);
    
    // Validate agent
    const agent = agents.get(pcId);
    if (!agent || agent.token !== token) {
        console.log(`❌ Invalid agent credentials: ${pcId}`);
        ws.close(4001, 'Invalid credentials');
        return;
    }
    
    // Store connection
    agentConnections.set(pcId, ws);
    agent.ws = ws;
    agent.status = 'online';
    agent.lastSeen = new Date();
    
    console.log(`✅ Agent connected: ${pcId}`);
    
    // Handle messages from agent
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleAgentMessage(pcId, message);
        } catch (error) {}
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
