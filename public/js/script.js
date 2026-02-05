// Dynamic Website JavaScript
// Handles all interactive functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dynamic Website Loaded Successfully!');
    initNavigation();
    initContactForm();
    initAnimations();
    initScrollEffects();
    initAPIButtons();
});

// Navigation functionality
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            
            // Animate hamburger menu
            const icon = navToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (navMenu && !navMenu.contains(event.target) && !navToggle.contains(event.target)) {
            navMenu.classList.remove('active');
            
            const icon = navToggle.querySelector('i');
            if (icon && icon.classList.contains('fa-times')) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
    
    // Handle active navigation state
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath || 
            (currentPath === '/' && link.getAttribute('href') === '/')) {
            link.classList.add('active');
        }
    });
}

// Contact form functionality
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    const formMessage = document.getElementById('formMessage');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                subject: formData.get('subject'),
                priority: formData.get('priority'),
                message: formData.get('message')
            };
            
            // Validate form
            if (!validateForm(data)) {
                return;
            }
            
            // Show loading state
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            showLoading(submitBtn, 'Sending...');
            
            // Send form data to backend
            fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showFormMessage(result.message, 'success');
                    contactForm.reset();
                    showToast('Message sent successfully!', 'success');
                } else {
                    showFormMessage(result.message || 'Failed to send message. Please try again.', 'error');
                    showToast('Failed to send message', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showFormMessage('Failed to send message. Please try again.', 'error');
                showToast('Network error occurred', 'error');
            })
            .finally(() => {
                // Reset button state
                hideLoading(submitBtn, originalText);
            });
        });
    }
}

function validateForm(data) {
    if (!data.name || data.name.trim() === '') {
        showFormMessage('Please enter your name.', 'error');
        return false;
    }
    
    if (!data.email || data.email.trim() === '') {
        showFormMessage('Please enter your email address.', 'error');
        return false;
    }
    
    if (!isValidEmail(data.email)) {
        showFormMessage('Please enter a valid email address.', 'error');
        return false;
    }
    
    if (!data.message || data.message.trim() === '') {
        showFormMessage('Please enter your message.', 'error');
        return false;
    }
    
    if (data.message.length < 10) {
        showFormMessage('Message must be at least 10 characters long.', 'error');
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFormMessage(message, type) {
    const formMessage = document.getElementById('formMessage');
    if (formMessage) {
        formMessage.textContent = message;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 5000);
    }
}

function resetForm() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.reset();
        showFormMessage('', '');
    }
}

// Animation functionality
function initAnimations() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.post-card, .feature-card, .sidebar-card, .info-card, .api-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Scroll effects
function initScrollEffects() {
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Hide/show navbar on scroll
        if (navbar) {
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }
        
        lastScrollTop = scrollTop;
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// API testing functionality
function initAPIButtons() {
    // Add click handlers to API test buttons
    const testButtons = document.querySelectorAll('[onclick*="testAPI"]');
    testButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const endpoint = this.getAttribute('onclick').match(/testAPI\('([^']+)'\)/)[1];
            testAPI(endpoint);
        });
    });
}

function testAPI(endpoint) {
    console.log(`🧪 Testing API endpoint: ${endpoint}`);
    showLoading(this, 'Testing...');
    
    fetch(endpoint)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ API Response:', data);
            showToast(`API test successful! Check console for details.`, 'success');
            
            // Show response in a modal or alert
            if (data.success) {
                alert(`API Test Successful!\n\nEndpoint: ${endpoint}\nResponse: ${JSON.stringify(data, null, 2)}`);
            } else {
                alert(`API Test Failed!\n\nEndpoint: ${endpoint}\nError: ${data.error || 'Unknown error'}`);
            }
        })
        .catch(error => {
            console.error('❌ API Error:', error);
            showToast('API test failed. Check console for details.', 'error');
            alert(`API Test Failed!\n\nEndpoint: ${endpoint}\nError: ${error.message}`);
        })
        .finally(() => {
            hideLoading(this, 'Test');
        });
}

function viewPost(postId) {
    console.log(`📖 Viewing post ${postId}`);
    // In a real application, this would navigate to post detail page
    // For now, fetch and display post data
    fetch(`/api/posts/${postId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Post Details:\n\nTitle: ${data.data.title}\nAuthor: ${data.data.author}\nDate: ${data.data.date}\n\n${data.data.content}`);
            } else {
                showToast('Post not found', 'error');
            }
        })
        .catch(error => {
            console.error('Error fetching post:', error);
            showToast('Error fetching post', 'error');
        });
}

function showContactForm() {
    // Scroll to contact form
    const contactSection = document.querySelector('.contact-form');
    if (contactSection) {
        contactSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Highlight the form
        const formCard = contactSection.closest('.form-card');
        if (formCard) {
            formCard.style.boxShadow = '0 0 20px rgba(37, 99, 235, 0.3)';
            setTimeout(() => {
                formCard.style.boxShadow = '';
            }, 2000);
        }
    }
}

// Utility functions
function showLoading(element, text = 'Loading...') {
    if (element) {
        element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        element.disabled = true;
    }
}

function hideLoading(element, originalText) {
    if (element) {
        element.innerHTML = originalText;
        element.disabled = false;
    }
}

// Toast notifications
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add toast styles if not already present
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                max-width: 350px;
                word-wrap: break-word;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .toast-success {
                background: linear-gradient(135deg, #10b981, #059669);
            }
            
            .toast-error {
                background: linear-gradient(135deg, #ef4444, #dc2626);
            }
            
            .toast-info {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
            }
            
            .toast.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .toast-content i {
                font-size: 18px;
            }
            
            .toast-content span {
                flex: 1;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Form validation enhancements
function enhanceFormValidation() {
    const inputs = document.querySelectorAll('.form-input, .form-textarea, .form-select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error styling
    field.classList.remove('error');
    
    // Validation based on field type
    if (field.type === 'email') {
        if (!value || !isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
    } else if (field.hasAttribute('required')) {
        if (!value) {
            isValid = false;
            errorMessage = 'This field is required';
        } else if (value.length < 2) {
            isValid = false;
            errorMessage = 'Please enter at least 2 characters';
        }
    }
    
    // Show error if invalid
    if (!isValid) {
        field.classList.add('error');
        showFieldError(field, errorMessage);
    } else {
        hideFieldError(field);
    }
    
    return isValid;
}

function showFieldError(field, message) {
    let errorElement = field.parentNode.querySelector('.field-error');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.cssText = `
            color: var(--error-color);
            font-size: 0.875rem;
            margin-top: 0.5rem;
        `;
        field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

function hideFieldError(field) {
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

// Initialize form validation enhancement
document.addEventListener('DOMContentLoaded', function() {
    enhanceFormValidation();
});

// Performance monitoring
function trackPagePerformance() {
    if ('performance' in window) {
        window.addEventListener('load', function() {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`📊 Page load time: ${loadTime}ms`);
            
            // Track slow pages
            if (loadTime > 3000) {
                console.warn('⚠️ Slow page load detected');
            }
        });
    }
}

// Initialize performance tracking
trackPagePerformance();

// Add error styling to form elements
const errorStyles = document.createElement('style');
errorStyles.textContent = `
    .form-input.error,
    .form-textarea.error,
    .form-select.error {
        border-color: var(--error-color);
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
`;
document.head.appendChild(errorStyles);

// Console welcome message
console.log('%c🚀 Dynamic Website', 'font-size: 16px; font-weight: bold; color: #2563eb;');
console.log('%cBuilt with Node.js + Express + EJS', 'font-size: 12px; color: #10b981;');
console.log('%cAPI Endpoints:', 'font-size: 12px; color: #f59e0b;');
console.log('  GET /api/posts - Get all posts');
console.log('  GET /api/posts/:id - Get single post');
console.log('  POST /api/contact - Submit contact form');
console.log('%cReady for production! 🎉', 'font-size: 12px; color: #10b981;');
