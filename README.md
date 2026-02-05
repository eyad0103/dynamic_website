# Dynamic Website

A modern, fully-functional dynamic website built with Node.js, Express, and EJS templating.

## 🚀 Features

- **Dynamic Content**: Server-side rendering with EJS templates
- **RESTful API**: Complete API endpoints for data interaction
- **Responsive Design**: Works perfectly on all devices
- **Contact Form**: Functional form with validation and feedback
- **Modern UI**: Professional design with smooth animations
- **SEO Friendly**: Optimized meta tags and structure
- **Error Handling**: Custom 404 page with helpful information
- **Performance**: Fast loading and smooth interactions

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Templating**: EJS for dynamic content
- **Styling**: Modern CSS with animations and transitions
- **Deployment**: GitHub + Render

## 📁 Project Structure

```
dynamic-website/
├── package.json          # Dependencies and scripts
├── server.js            # Express server with routes
├── views/              # EJS templates
│   ├── index.ejs       # Home page with posts
│   ├── about.ejs       # About page with features
│   ├── contact.ejs     # Contact page with form
│   └── 404.ejs        # 404 error page
├── public/             # Static assets
│   ├── css/
│   │   └── style.css  # Complete stylesheet
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
- Render account

### Local Development

1. **Clone the repository**
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

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Deployment

#### Deploy to Render (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy dynamic website"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure build settings:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Node Version**: `14` or higher
     - **Root Directory**: `/`

3. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your site
   - Your site will be live at `https://your-app-name.onrender.com`

## 📡 API Endpoints

### GET Endpoints
- `GET /` - Home page with dynamic posts
- `GET /about` - About page with features
- `GET /contact` - Contact page with form
- `GET /api/posts` - Get all posts as JSON
- `GET /api/posts/:id` - Get specific post by ID

### POST Endpoints
- `POST /api/contact` - Submit contact form
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Project Inquiry",
    "priority": "medium",
    "message": "I'd like to discuss a project..."
  }
  ```

## 🎨 Customization

### Adding New Pages

1. Create new EJS template in `views/` folder
2. Add route in `server.js`:
   ```javascript
   app.get('/your-page', (req, res) => {
       res.render('your-page', { 
           title: 'Your Page',
           message: 'Your message here'
       });
   });
   ```

### Styling

- Edit `public/css/style.css` for custom styles
- Uses CSS variables for easy theming
- Responsive design with mobile-first approach
- Modern animations and transitions

### JavaScript

- Edit `public/js/script.js` for client-side functionality
- Modular structure with clear functions
- Includes form validation, animations, and API calls

## 🔧 Configuration

### Environment Variables

Create a `.env` file in root directory (optional):
```env
PORT=3000
NODE_ENV=production
```

### Package.json Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

## 📱 Responsive Design

The website is fully responsive and works on:
- **Desktop computers** (1200px+)
- **Tablets** (768px - 1199px)
- **Mobile devices** (320px - 767px)

## 🚀 Performance Features

- **Lazy Loading**: Animations trigger on scroll
- **Form Validation**: Real-time client-side validation
- **API Testing**: Built-in API testing functionality
- **Error Handling**: Comprehensive error pages
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
