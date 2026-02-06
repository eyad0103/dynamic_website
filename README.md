# Dynamic Website

A modern, fully-functional dynamic website built with Node.js, Express, and EJS templating.

## 🚀 Features

### **Dynamic Content**
- **Server-side rendering** with EJS templates
- **RESTful API** for data management and client-server communication
- **Responsive design** that works perfectly on all devices
- **Contact form** with validation and feedback
- **Modern UI** with smooth animations and professional aesthetics
- **Error handling** with custom 404 page
- **Performance optimized** for fast loading and smooth interactions

### **🛠️ Technology Stack**

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + JavaScript (ES6+)
- **Templating**: EJS for dynamic content rendering
- **Styling**: Modern CSS with animations and transitions
- **Deployment**: GitHub + Render (24/7 operation)

## 📁 Project Structure

```
dynamic-website/
├── package.json          # Dependencies and scripts
├── server.js            # Express server with routes
├── views/              # EJS templates
│   ├── index.ejs       # Home page (now redirects to dashboard)
│   ├── about.ejs       # About page with features
│   ├── contact.ejs     # Contact page with form
│   ├── 404.ejs        # Error page
│   └── dashboard.ejs   # Cyber system dashboard (main page)
├── public/             # Static assets
│   ├── css/
│   │   └── style.css  # Complete stylesheet with cyber theme
│   └── js/
│       └── script.js   # Client-side JavaScript
├── .gitignore          # Git ignore file
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ installed
- Git installed
- GitHub account
- Render account (for deployment)

### Local Development
1. **Clone repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/dynamic-website.git
   cd dynamic-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open browser**
   Navigate to `http://localhost:3000`

### Production Deployment
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Deploy to Render**
   - Connect your GitHub repository to Render
   - Configure build settings
   - Deploy automatically on push to main branch

## 📡 API Endpoints

### Pages
- `GET /` → **Cyber Dashboard** (main page)
- `GET /dashboard` → **Cyber Dashboard** (alias)
- `GET /about` → About page with project information
- `GET /contact` → Contact page with form
- `GET /api/posts` → All posts as JSON
- `GET /api/posts/:id` → Single post by ID as JSON
- `POST /api/contact` → Contact form submission

### System APIs
- `GET /api/system/status` → System status and metrics
  ```json
  {
    "status": "online",
    "uptime": "...",
    "timestamp": "...",
    "memory": {...},
    "requests": N
  }
  ```
- `GET /api/system/stats` → Detailed system statistics
  ```json
  {
    "uptime": "...",
    "memory": {
      "rss": "XXMB",
      "heapTotal": "XXMB", 
      "heapUsed": "XXMB",
      "external": "XXMB"
    },
    "requests": N,
    "system": {
      "nodeVersion": "vXX.X.X",
      "platform": "linux",
      "pid": XXX,
      "uptime": "..."
    }
  }
  ```

## 🎨 Cyber Dashboard Features

The main page (`/`) now displays a **fully immersive cyber system dashboard** with:

### **Terminal Interface**
- **Real-time system logs** with animated typing effect
- **Live metrics display** (uptime, memory, requests, server time)
- **Streaming console output** with timestamped messages
- **System boot sequence** with professional animations
- **Periodic status updates** (scanning, monitoring, syncing)
- **Memory usage warnings** when thresholds are exceeded

### **Visual Design**
- **Cyberpunk/dark theme** with neon accents
- **Terminal-style layout** with monospace fonts
- **Grid background effects** for authentic hacker aesthetic
- **Smooth animations** and transitions throughout
- **Responsive design** that adapts to all screen sizes
- **No static labels** - all data integrated into the interface

### **Interactive Elements**
- **Real-time data updates** from system APIs
- **Live request counter** simulation
- **Memory monitoring** with visual warnings
- **Professional animations** and hover effects
- **Mobile-optimized** terminal interface

## � Customization

### Easy Theming
- **CSS variables** for consistent color scheme
- **Modular components** for easy customization
- **Responsive grid system** that adapts to content
- **Animation presets** for different cyber effects

### Performance Features
- **Lazy loading** for optimal performance
- **Efficient animations** using CSS transforms
- **Optimized API calls** with proper error handling
- **Memory-efficient** JavaScript implementation

## 🚀 Deployment

The application is designed for **immediate deployment** to Render with zero configuration required:

- **Automatic builds** on every push to main branch
- **Zero-downtime deployment** with proper health checks
- **Environment variables** handled securely
- **Static asset optimization** for fast loading

**Ready for production with enterprise-grade performance and reliability!**
- **Optimized Assets**: Efficient CSS and JavaScript
- **Smooth Animations**: 60fps transitions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the browser console for error messages
2. Ensure all dependencies are installed
3. Verify Node.js version is 14+
4. Check the Render deployment logs
5. Test API endpoints individually

## 🌟 Live Demo

Visit your deployed site at: `https://your-app-name.onrender.com`

### Test the Features

1. **Home Page**: Visit `/` - See dynamic posts and features
2. **About Page**: Visit `/about` - View project information
3. **Contact Form**: Visit `/contact` - Submit a test message
4. **API Test**: Visit `/api/posts` - See JSON data
5. **Mobile View**: Test on phone/tablet
6. **404 Page**: Visit `/nonexistent-page` - See error handling

## 🔄 Updates & Redeployment

### Automatic Updates
Render automatically redeploys when you:
1. Push changes to the main branch
2. Merge pull requests to main branch

### Manual Updates
1. Make changes to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```
3. Render will automatically detect changes and redeploy

## 🎯 Next Steps

### Advanced Features
- Add database integration (MongoDB/PostgreSQL)
- Implement user authentication system
- Add file upload functionality
- Create admin dashboard
- Add email notifications
- Implement caching (Redis)
- Add analytics tracking

### Performance Optimizations
- Add CDN for static assets
- Implement image optimization
- Add service worker for PWA
- Enable Gzip compression
- Add performance monitoring

---

**🎉 Congratulations! Your dynamic website is now ready for production!**

Built with ❤️ using Node.js, Express, and EJS
