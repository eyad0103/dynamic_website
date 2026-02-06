const express = require('express');
const path = require('path');
const cors = require('cors');

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

// Force redeploy for API key management - v2
console.log('🔑 API Key Management: OpenRouter API key configured');

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
app.use(requestCounter); // Add request counting middleware

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
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        res.json({
            success: true,
            response: aiResponse
        });
        
    } catch (error) {
        console.error('API key test failed:', error);
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
    res.status(404).render('404', { 
        title: 'Page Not Found',
        message: 'The page you\'re looking for doesn\'t exist.',
        requestedPath: req.path
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
    console.log(`🎨 Pages:`);
    console.log(`   GET  / - System dashboard (main)`);
    console.log(`   GET  /about - About page`);
    console.log(`   GET  /contact - Contact page`);
    console.log(`   GET  /dashboard - System dashboard (alias)`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
