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

// Request Count Middleware
let requestCount = 0;
const requestCounter = (req, res, next) => {
    requestCount++;
    req.requestCount = requestCount;
    next();
};

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

// Original website route
app.get('/website', (req, res) => {
    res.render('index', { 
        title: 'Dynamic Website',
        posts: posts,
        message: 'Welcome to your new dynamic website!'
    });
});

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
    
    // Simulate processing
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
    console.log(`🎨 Pages:`);
    console.log(`   GET  / - System dashboard (main)`);
    console.log(`   GET  /website - Original website`);
    console.log(`   GET  /about - About page`);
    console.log(`   GET  /contact - Contact page`);
    console.log(`   GET  /dashboard - System dashboard (alias)`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
