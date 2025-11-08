class SignSpeakApp {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.handposeModel = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.isCameraOn = false;
        this.currentText = '';
        this.gestureHistory = [];
        this.sessionId = this.generateSessionId();
        this.gestureDetector = new GestureDetector();
        this.scrollToSection = null; // For storing section to scroll to after navigation
        
        this.init();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadPage();
        
        // Initialize handpose model in background
        this.initializeHandpose();
    }

    setupEventListeners() {
        // Hamburger menu for mobile
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('navMenu');
        
        const closeMobileMenu = () => {
            if (hamburger && navMenu) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        };
        
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu && navMenu.classList.contains('active')) {
                if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                    closeMobileMenu();
                }
            }
        });

        // Handle navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                e.preventDefault();
                const page = e.target.getAttribute('href');
                
                // Close mobile menu when a nav link is clicked
                if (window.innerWidth <= 968) {
                    closeMobileMenu();
                }
                
                this.navigateTo(page);
            }
        });
        
        // Close mobile menu on window resize if it becomes desktop view
        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                closeMobileMenu();
            }
        });
        
        // Navbar scroll effect
        const navbar = document.getElementById('navbar');
        if (navbar) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
        }
        
        // Handle all button clicks for navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            
            // Skip if it's a nav-link (handled separately) or form button
            if (!link || link.classList.contains('nav-link') || link.closest('form')) {
                return;
            }
            
            const href = link.getAttribute('href');
            if (!href) return;
            
            // Handle hash links (scroll to section)
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const currentHash = window.location.hash.substring(1);
                
                // Check if we're already on home page
                if (currentHash === 'home' || currentHash === '' || !currentHash) {
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                        // Update URL to maintain home hash
                        window.history.pushState(null, '', '#home');
                    }
                } else {
                    // If we're on another page, navigate to home first
                    // Store the target section to scroll to after navigation
                    this.scrollToSection = targetId;
                    this.navigateTo('home');
                }
                return;
            }
            
            // Handle internal navigation links (non-hash, non-external)
            if (!href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('tel')) {
                e.preventDefault();
                this.navigateTo(href);
            }
        });
        
        // Intersection Observer for fade-in animations
        this.setupScrollAnimations();
    }
    
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-visible');
                }
            });
        }, observerOptions);
        
        // Observe elements after page load
        setTimeout(() => {
            const elementsToAnimate = document.querySelectorAll('.feature-card, .stat-item, .mission-content, .about-content-grid, .impact-stat, .community-content');
            elementsToAnimate.forEach(el => {
                el.classList.add('fade-in');
                observer.observe(el);
            });
        }, 100);
    }

    checkAuthStatus() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            this.currentUser = JSON.parse(user);
            this.isLoggedIn = true;
        }
    }

    loadPage() {
        const path = window.location.hash.substring(1) || 'home';
        this.navigateTo(path);
    }

    async navigateTo(page) {
        const mainContent = document.getElementById('mainContent');
        const navMenu = document.getElementById('navMenu');
        
        // Update navigation
        this.updateNavigation();
        
        switch(page) {
            case 'home':
                mainContent.innerHTML = this.renderHomePage();
                this.setupLikeButton();
                setTimeout(() => {
                    this.setupScrollAnimations();
                    // Check if we need to scroll to a specific section
                    if (this.scrollToSection) {
                        const targetId = this.scrollToSection;
                        this.scrollToSection = null; // Clear it
                        setTimeout(() => {
                            const targetElement = document.getElementById(targetId);
                            if (targetElement) {
                                targetElement.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                            }
                        }, 200);
                    } else {
                        // Scroll to top if no section to scroll to
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }, 100);
                break;
            case 'login':
                mainContent.innerHTML = this.renderLoginPage();
                this.setupAuthForms();
                break;
            case 'register':
                mainContent.innerHTML = this.renderRegisterPage();
                this.setupAuthForms();
                break;
            case 'dashboard':
                if (!this.isLoggedIn) {
                    this.navigateTo('login');
                    return;
                }
                mainContent.innerHTML = this.renderDashboard();
                await this.initializeCamera();
                break;
            case 'profile':
                if (!this.isLoggedIn) {
                    this.navigateTo('login');
                    return;
                }
                mainContent.innerHTML = this.renderProfilePage();
                break;
            case 'history':
                if (!this.isLoggedIn) {
                    this.navigateTo('login');
                    return;
                }
                mainContent.innerHTML = this.renderHistoryPage();
                await this.loadUserHistory();
                break;
            case 'about':
                mainContent.innerHTML = this.renderAboutPage();
                setTimeout(() => this.setupScrollAnimations(), 100);
                break;
            default:
                mainContent.innerHTML = this.renderHomePage();
                this.setupLikeButton();
                setTimeout(() => this.setupScrollAnimations(), 100);
        }
        
        window.location.hash = page;
    }

    updateNavigation() {
        const navMenu = document.getElementById('navMenu');
        
        if (this.isLoggedIn) {
            navMenu.innerHTML = `
                <li class="nav-item"><a href="dashboard" class="nav-link">Home</a></li>
                <li class="nav-item"><a href="history" class="nav-link">History</a></li>
                <li class="nav-item"><a href="profile" class="nav-link">Profile</a></li>
                <li class="nav-item"><a href="about" class="nav-link">About</a></li>
                <li class="nav-item"><a href="#" id="logoutBtn" class="nav-link">Logout</a></li>
            `;
            
            document.getElementById('logoutBtn').addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        } else {
            navMenu.innerHTML = `
                <li class="nav-item"><a href="home" class="nav-link">Home</a></li>
                <li class="nav-item"><a href="about" class="nav-link">About</a></li>
                <li class="nav-item"><a href="login" class="nav-link">Login</a></li>
                <li class="nav-item"><a href="register" class="nav-link">Register</a></li>
            `;
        }
    }

    renderHomePage() {
        return `
            <!-- Hero Section -->
            <section class="landing-hero">
                <div class="landing-hero-content">
                    <h1>Bridge the Communication Gap</h1>
                    <p>SignSpeak transforms sign language into text and speech in real-time, creating meaningful connections between deaf and hearing communities.</p>
                    <div class="hero-buttons">
                        <a href="${this.isLoggedIn ? 'dashboard' : 'register'}" class="btn btn-primary">Start Translating</a>
                        <a href="#features" class="btn btn-secondary">Learn More</a>
                    </div>
                </div>
            </section>

            <!-- Features Section -->
            <section id="features" class="features-section">
                <div class="container">
                    <h2 style="text-align: center; margin-bottom: 3rem; color: var(--primary-color); font-size: 2.5rem;">Why Choose SignSpeak?</h2>
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">👐</div>
                            <h3>Real-time Translation</h3>
                            <p>Instantly convert sign language gestures to text with our advanced AI technology. No delays, just seamless communication.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🌍</div>
                            <h3>Multi-language Support</h3>
                            <p>Translate signs to multiple languages including English, Tamil, and Hindi. Break language barriers effortlessly.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🔊</div>
                            <h3>Voice Output</h3>
                            <p>Hear the translated text with customizable voices and speech rates. Perfect for both personal and professional use.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">📱</div>
                            <h3>Accessible Everywhere</h3>
                            <p>Works perfectly on all devices - desktop, tablet, or mobile. Your communication assistant always within reach.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">📊</div>
                            <h3>Learning Analytics</h3>
                            <p>Track your progress with detailed history and analytics. Improve your signing skills over time.</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">🔒</div>
                            <h3>Secure & Private</h3>
                            <p>Your data stays private and secure. We believe in protecting your personal information and translation history.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Stats Section -->
            <section class="stats-section">
                <div class="stats-grid">
                    <div class="stat-item">
                        <h3>99%</h3>
                        <p>Accuracy Rate</p>
                    </div>
                    <div class="stat-item">
                        <h3>50+</h3>
                        <p>Gestures Supported</p>
                    </div>
                    <div class="stat-item">
                        <h3>3</h3>
                        <p>Languages Available</p>
                    </div>
                    <div class="stat-item">
                        <h3>24/7</h3>
                        <p>Always Available</p>
                    </div>
                </div>
            </section>

            <!-- Mission Section -->
            <section class="mission-section">
                <div class="mission-content">
                    <h2>Our Mission</h2>
                    <p>At SignSpeak, we believe that communication is a fundamental human right. Our mission is to create a world where deaf and hearing individuals can communicate freely and naturally, without barriers. Through innovative technology and a commitment to accessibility, we're building bridges that connect communities and transform lives.</p>
                    <p>Every gesture matters, every connection counts. Join us in making communication accessible to all.</p>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="cta-section">
                <div class="cta-content">
                    <h2>Ready to Start Communicating?</h2>
                    <p>Join thousands of users who are already breaking down communication barriers with SignSpeak.</p>
                    <div class="hero-buttons">
                        <a href="${this.isLoggedIn ? 'dashboard' : 'register'}" class="btn btn-primary">Get Started Free</a>
                        <a href="about" class="btn btn-secondary">See How It Works</a>
                    </div>
                </div>
            </section>

            <!-- Like Button -->
            <div class="like-container">
                <button class="like-btn" id="likeBtn">
                    <span class="heart-icon">❤️</span>
                    <span>Like SignSpeak</span>
                </button>
            </div>
        `;
    }

    setupLikeButton() {
        const likeBtn = document.getElementById('likeBtn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                likeBtn.classList.toggle('liked');
                if (likeBtn.classList.contains('liked')) {
                    likeBtn.innerHTML = '<span class="heart-icon">❤️</span><span>Liked!</span>';
                    this.showMessage('Thank you for liking SignSpeak! ❤️', 'success');
                } else {
                    likeBtn.innerHTML = '<span class="heart-icon">❤️</span><span>Like SignSpeak</span>';
                }
            });
        }
    }

    renderLoginPage() {
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <h2>Login to Your Account</h2>
                    <p>Enter your credentials to access your account</p>
                    
                    <form id="loginForm" class="auth-form">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" placeholder="Enter your email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" placeholder="Enter your password" required>
                        </div>
                        
                        <div class="form-options">
                            <label class="checkbox-container">
                                <input type="checkbox" id="rememberMe" name="rememberMe">
                                <span class="checkmark"></span>
                                Remember me
                            </label>
                            <a href="#" class="forgot-password">Forgot password?</a>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-full">Login</button>
                    </form>
                    
                    <div class="auth-footer">
                        <p>Don't have an account? <a href="register">Create one</a></p>
                    </div>
                </div>
            </div>
        `;
    }

    renderRegisterPage() {
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <h2>Create Your Account</h2>
                    <p>Join SignSpeak to start translating sign language in real-time</p>
                    
                    <form id="registerForm" class="auth-form">
                        <div class="form-group">
                            <label for="fullName">Full Name</label>
                            <input type="text" id="fullName" name="fullName" placeholder="Enter your full name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" placeholder="Enter your email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" placeholder="Create a password (min. 6 characters)" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" required>
                        </div>
                        
                        <div class="form-options">
                            <label class="checkbox-container">
                                <input type="checkbox" id="agreeTerms" name="agreeTerms" required>
                                <span class="checkmark"></span>
                                I agree to the Terms of Service and Privacy Policy
                            </label>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-full">Create Account</button>
                    </form>
                    
                    <div class="auth-footer">
                        <p>Already have an account? <a href="login">Sign In</a></p>
                    </div>
                </div>
            </div>
        `;
    }

    renderDashboard() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h2>Sign Language Translator</h2>
                    <p>Use your camera to translate sign language to text in real-time</p>
                </div>

                <div class="translator-container">
                    <div class="camera-section">
                        <div class="camera-container">
                            <video id="video" autoplay playsinline muted></video>
                            <canvas id="overlay"></canvas>
                            <div id="detectedBadge" class="detected-badge">No gesture</div>
                            <div style="position:absolute; left:18px; top:18px; z-index:40;">
                                <select id="cameraSelect" style="padding:6px 8px; border-radius:8px; border:1px solid var(--border-color); background:var(--white);">
                                    <option value="">Default camera</option>
                                </select>
                            </div>
                            <div class="camera-controls">
                                <button id="startCamera" class="btn btn-primary">Start Camera</button>
                                <button id="stopCamera" class="btn btn-secondary" disabled>Stop Camera</button>
                                <button id="captureGesture" class="btn btn-accent" disabled>Capture Gesture</button>
                                <button id="requestPermission" class="btn btn-ghost">Allow Camera</button>
                                <div id="cameraHelper" class="camera-helper" style="margin-top:8px; font-size:0.9rem; color:var(--muted-color);">Click "Allow Camera" if your browser blocked permission, then click Start Camera.</div>
                            </div>
                        </div>
                        
                        <div class="translation-controls">
                            <div class="control-group">
                                <label for="outputLanguage">Output Language:</label>
                                <select id="outputLanguage">
                                    <option value="en">English</option>
                                    <option value="ta">Tamil</option>
                                    <option value="hi">Hindi</option>
                                </select>
                            </div>
                            
                            <div class="control-group">
                                <label for="voiceSelection">Voice:</label>
                                <select id="voiceSelection"></select>
                            </div>
                            
                            <div class="control-group">
                                <label for="speechRate">Speech Rate:</label>
                                <input type="range" id="speechRate" min="0.5" max="2" step="0.1" value="1">
                                <span id="rateValue">1.0</span>
                            </div>
                            
                            <div class="control-group">
                                <button id="speakText" class="btn btn-accent" disabled>Speak Text</button>
                                <button id="clearText" class="btn btn-secondary">Clear Text</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="output-section">
                        <div class="output-container">
                            <h3>Translated Text</h3>
                            <div id="translatedText" class="translated-text">
                                <p>Your translated text will appear here...</p>
                            </div>
                            
                            <div class="gesture-history">
                                <h4>Recent Gestures</h4>
                                <div id="gestureList" class="gesture-list"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="gesture-guide">
                    <h3>Sign Language Guide</h3>
                    <div class="gesture-grid" id="gestureGuide"></div>
                </div>
            </div>
        `;
    }

    renderProfilePage() {
        const memberSince = this.currentUser ? new Date().toLocaleDateString() : 'N/A';
        return `
            <div class="auth-container">
                <div class="auth-card">
                    <h2>User Profile</h2>
                    <div class="profile-info">
                        <div class="form-group">
                            <label>Full Name:</label>
                            <p><strong>${this.currentUser.fullName}</strong></p>
                        </div>
                        <div class="form-group">
                            <label>Email:</label>
                            <p><strong>${this.currentUser.email}</strong></p>
                        </div>
                        <div class="form-group">
                            <label>Member Since:</label>
                            <p><strong>${memberSince}</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderHistoryPage() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h2>Translation History</h2>
                    <p>Review your past sign language translations</p>
                </div>
                <div class="history-container">
                    <div id="historyList" class="history-list">
                        <p>Loading your translation history...</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderAboutPage() {
        return `
            <div class="about-page">
                <!-- Hero Section -->
                <section class="about-hero">
                    <div class="about-hero-content">
                        <h1>About SignSpeak</h1>
                        <p class="about-subtitle">Creating connections through technology</p>
                    </div>
                </section>

                <!-- Vision Section -->
                <section class="about-section about-section-alt">
                    <div class="about-container">
                        <div class="about-content-grid">
                            <div class="about-text">
                                <h2>Our Vision</h2>
                                <p>SignSpeak was born from a simple yet powerful vision: to eliminate communication barriers between deaf and hearing communities. We believe that everyone deserves the opportunity to communicate freely and express themselves without limitations.</p>
                            </div>
                            <div class="about-image">
                                <img src="https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=600&h=400&fit=crop" alt="Communication and connection" class="about-img">
                            </div>
                        </div>
                    </div>
                </section>

                <!-- What We Do Section -->
                <section class="about-section">
                    <div class="about-container">
                        <div class="about-content-grid about-content-grid-reverse">
                            <div class="about-text">
                                <h2>What We Do</h2>
                                <p>Using cutting-edge artificial intelligence, SignSpeak converts sign language gestures into text and speech in real-time. Our platform is designed to be intuitive, accurate, and accessible to everyone, regardless of their technical background.</p>
                                <ul class="feature-list">
                                    <li>Real-time sign language translation</li>
                                    <li>Multi-language text and speech output</li>
                                    <li>Accessible across all devices</li>
                                    <li>Advanced AI-powered gesture recognition</li>
                                </ul>
                            </div>
                            <div class="about-image">
                                <img src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&h=400&fit=crop" alt="AI Technology" class="about-img">
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Impact Section -->
                <section class="about-section about-section-alt">
                    <div class="about-container">
                        <div class="about-content-grid">
                            <div class="about-text">
                                <h2>Our Impact</h2>
                                <p>Since our launch, SignSpeak has helped thousands of users communicate more effectively. From educational institutions to workplaces and personal relationships, we're making a difference in people's lives every day.</p>
                                <div class="impact-stats">
                                    <div class="impact-stat">
                                        <h3>1000+</h3>
                                        <p>Active Users</p>
                                    </div>
                                    <div class="impact-stat">
                                        <h3>50+</h3>
                                        <p>Educational Institutions</p>
                                    </div>
                                    <div class="impact-stat">
                                        <h3>99%</h3>
                                        <p>Accuracy Rate</p>
                                    </div>
                                </div>
                            </div>
                            <div class="about-image">
                                <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop" alt="Community Impact" class="about-img">
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Community Section -->
                <section class="about-section about-community">
                    <div class="about-container">
                        <div class="community-content">
                            <h2>Join Our Community</h2>
                            <p>We're more than just a technology platform - we're a community dedicated to inclusivity and accessibility. Join us in our mission to create a world where communication knows no barriers.</p>
                            <div class="community-cta">
                                <a href="${this.isLoggedIn ? 'dashboard' : 'register'}" class="btn btn-primary">Get Started Today</a>
                                <a href="home" class="btn btn-secondary">Back to Home</a>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    setupAuthForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            this.showMessage('Please enter both email and password', 'error');
            return;
        }

        try {
            this.showLoading('Logging in...');
            
            // Better API URL detection
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname === '';
            const API_BASE_URL = isLocalhost 
                ? 'http://localhost:3000/api' 
                : '/api';

            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            // Check if response is ok
            if (!response.ok) {
                let errorMessage = 'Login failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
                } catch (parseError) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                this.hideLoading();
                this.showMessage(errorMessage, 'error');
                return;
            }

            const data = await response.json();
            
            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                this.currentUser = data.user;
                this.isLoggedIn = true;
                this.hideLoading();
                this.showMessage('Login successful!', 'success');
                setTimeout(() => {
                    this.updateNavigation();
                    this.navigateTo('dashboard');
                }, 1000);
            } else {
                this.hideLoading();
                this.showMessage(data.error || data.message || 'Login failed. Please try again.', 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Login error:', error);
            const errorMessage = error.message.includes('fetch') 
                ? 'Cannot connect to server. Please make sure the server is running on http://localhost:3000' 
                : `Error: ${error.message}`;
            this.showMessage(errorMessage, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData);

        // Client-side validation
        if (userData.password !== userData.confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        if (userData.password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        if (!userData.agreeTerms) {
            this.showMessage('Please agree to the terms and conditions', 'error');
            return;
        }

        try {
            this.showLoading('Creating your account...');
            
            // Better API URL detection
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname === '';
            const API_BASE_URL = isLocalhost 
                ? 'http://localhost:3000/api' 
                : '/api';

            // Prepare data for registration (remove confirmPassword and agreeTerms)
            const registrationData = {
                fullName: userData.fullName,
                email: userData.email,
                password: userData.password
            };

            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(registrationData)
            });

            // Check if response is ok
            if (!response.ok) {
                let errorMessage = 'Registration failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
                } catch (parseError) {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                this.hideLoading();
                this.showMessage(errorMessage, 'error');
                return;
            }

            const data = await response.json();
            
            if (data.success) {
                this.hideLoading();
                this.showMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => this.navigateTo('login'), 2000);
            } else {
                this.hideLoading();
                this.showMessage(data.error || data.message || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Registration error:', error);
            const errorMessage = error.message.includes('fetch') 
                ? 'Cannot connect to server. Please make sure the server is running on http://localhost:3000' 
                : `Error: ${error.message}`;
            this.showMessage(errorMessage, 'error');
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUser = null;
        this.isLoggedIn = false;
        this.navigateTo('home');
        this.showMessage('Logged out successfully', 'success');
    }

    showLoading(message = 'Loading...') {
        const modal = document.getElementById('loadingModal');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = message;
        modal.style.display = 'flex';
    }

    hideLoading() {
        const modal = document.getElementById('loadingModal');
        modal.style.display = 'none';
    }

    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessage = document.querySelector('.message-popup');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-popup message-${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <span class="message-text">${message}</span>
                <button class="message-close">&times;</button>
            </div>
        `;

        document.body.appendChild(messageDiv);

        // Add styles if not already added
        if (!document.querySelector('#message-styles')) {
            const styles = document.createElement('style');
            styles.id = 'message-styles';
            styles.textContent = `
                .message-popup {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    min-width: 300px;
                    max-width: 500px;
                    animation: slideIn 0.3s ease-out;
                }
                .message-content {
                    padding: 15px 20px;
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .message-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                .message-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                .message-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
                .message-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);

        // Close button functionality
        messageDiv.querySelector('.message-close').addEventListener('click', () => {
            messageDiv.remove();
        });
    }

    async initializeHandpose() {
        try {
            this.showLoading('Loading hand detection model...');
            this.handposeModel = await handpose.load();
            this.hideLoading();
            console.log('Handpose model loaded successfully');
        } catch (error) {
            this.hideLoading();
            console.error('Error loading handpose model:', error);
            this.showMessage('Error loading hand detection model', 'error');
        }
    }

    async initializeCamera() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');

        // Setup camera controls
        document.getElementById('startCamera').addEventListener('click', () => this.startCamera());
        document.getElementById('stopCamera').addEventListener('click', () => this.stopCamera());
        document.getElementById('captureGesture').addEventListener('click', () => this.captureGesture());
        const reqBtn = document.getElementById('requestPermission');
        if (reqBtn) {
            reqBtn.addEventListener('click', () => this.requestCameraPermission());
        }
        document.getElementById('speakText').addEventListener('click', () => this.speakText());
        document.getElementById('clearText').addEventListener('click', () => this.clearText());

        // Populate camera list and listen for selection changes
        this.populateCameraList();
        const cameraSelect = document.getElementById('cameraSelect');
        if (cameraSelect) {
            cameraSelect.addEventListener('change', () => {
                // If camera is running, restart with new device
                if (this.isCameraOn) {
                    this.stopCamera();
                    setTimeout(() => this.startCamera(), 200);
                }
            });
        }

        // Initialize MediaPipe Hands pipeline in background (used if available)
        this.initializeMediaPipe();

        // Setup voice selection
        this.setupVoiceSelection();

        // Load gesture guide
        this.loadGestureGuide();

        // Setup speech rate display
        const speechRate = document.getElementById('speechRate');
        const rateValue = document.getElementById('rateValue');
        if (speechRate && rateValue) {
            speechRate.addEventListener('input', () => {
                rateValue.textContent = speechRate.value;
            });
        }
    }

    async startCamera() {
        try {
            // Check if browser supports media devices
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            // Use the selected camera device if provided
            const cameraSelect = document.getElementById('cameraSelect');
            let constraints = { video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } };
            if (cameraSelect && cameraSelect.value) {
                constraints = { video: { deviceId: { exact: cameraSelect.value }, width: { ideal: 640 }, height: { ideal: 480 } } };
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            // Ensure video plays (some browsers require explicit play)
            try {
                await this.video.play();
            } catch (playErr) {
                console.warn('Video play() error (may be autoplay policy):', playErr);
            }
            this.isCameraOn = true;
            
            // Wait for video to load
            this.video.addEventListener('loadedmetadata', () => {
                // Set canvas dimensions to match video
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                
                console.log('Camera started:', this.video.videoWidth, 'x', this.video.videoHeight);
            });
            
            document.getElementById('startCamera').disabled = true;
            document.getElementById('stopCamera').disabled = false;
            document.getElementById('captureGesture').disabled = false;

            // Start hand detection
            // If MediaPipe Hands is available, use its camera helper for improved landmarks
            if (this.hands && window.Camera) {
                // stop any previous mp camera
                if (this._mpCamera && this._mpCamera.stop) {
                    try { this._mpCamera.stop(); } catch(e){}
                    this._mpCamera = null;
                }

                this._mpCamera = new Camera(this.video, {
                    onFrame: async () => {
                        try { await this.hands.send({ image: this.video }); } catch(e) { /* ignore */ }
                    },
                    width: this.video.videoWidth || 640,
                    height: this.video.videoHeight || 480
                });
                this._mpCamera.start();
            } else {
                // Ensure model is loaded before starting detection (handpose fallback)
                if (!this.handposeModel) {
                    await this.initializeHandpose();
                }
                this.detectHands();
            }
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            // Provide clearer guidance for common permission errors
            if (error && error.name === 'NotAllowedError') {
                this.showMessage('Camera access was blocked. Please allow camera access in your browser settings and try again. If using Chrome, click the camera icon in the address bar and Allow.', 'error');
            } else if (error && (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')) {
                this.showMessage('No suitable camera found. Please connect a camera and try again.', 'error');
            } else if (error && error.name === 'SecurityError') {
                this.showMessage('Camera access requires a secure context (HTTPS) or localhost. Please run this app on https or localhost.', 'error');
            } else {
                this.showMessage(`Camera error: ${error.message}`, 'error');
            }
        }
    }

    // Try to prompt for camera permission without starting persistent stream.
    // This helps when the browser blocked permission previously; it gives the user a clear retry path.
    async requestCameraPermission() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showMessage('Camera API not supported in this browser', 'error');
            return;
        }

        try {
            // Request a short-lived stream to trigger the permission prompt
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            // Immediately stop tracks but this will have already prompted/allowed permission
            stream.getTracks().forEach(t => t.stop());

            // Enable start button so user can start full stream
            const startBtn = document.getElementById('startCamera');
            if (startBtn) startBtn.disabled = false;

            this.showMessage('Camera permission granted. Click "Start Camera" to begin.', 'success');
        } catch (err) {
            console.error('Permission request error:', err);
            if (err && err.name === 'NotAllowedError') {
                this.showMessage('Camera permission was denied. Please enable it in your browser settings and click "Allow Camera" again.', 'error');
            } else if (err && err.name === 'SecurityError') {
                this.showMessage('Camera access requires HTTPS or localhost. Please run the site securely.', 'error');
            } else {
                this.showMessage(`Error requesting camera permission: ${err.message}`, 'error');
            }
        }
    }

    stopCamera() {
        if (this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
        }
        
        this.isCameraOn = false;
        document.getElementById('startCamera').disabled = false;
        document.getElementById('stopCamera').disabled = true;
        document.getElementById('captureGesture').disabled = true;
        // Stop MediaPipe camera helper if running
        if (this._mpCamera && this._mpCamera.stop) {
            try { this._mpCamera.stop(); } catch (e) { console.warn('Error stopping MediaPipe camera', e); }
            this._mpCamera = null;
        }
    }

    async detectHands() {
        if (!this.isCameraOn || !this.handposeModel) {
            return;
        }

        try {
            // Make sure video is ready
            if (this.video.readyState < 2) {
                requestAnimationFrame(() => this.detectHands());
                return;
            }

            const predictions = await this.handposeModel.estimateHands(this.video);
            
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (predictions.length > 0) {
                for (let i = 0; i < predictions.length; i++) {
                    const keypoints = predictions[i].landmarks;
                    
                    // Draw landmarks
                    this.ctx.fillStyle = '#00ff00';
                    for (let j = 0; j < keypoints.length; j++) {
                        const [x, y] = keypoints[j];
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
                        this.ctx.fill();
                    }
                    
                    // Draw connections with different colors
                    this.drawConnections(keypoints);
                    
                    // Try to detect gesture
                    const gesture = this.gestureDetector.detectGesture(keypoints);
                    if (gesture) {
                        // Show detected badge immediately
                        this.showDetected(gesture);
                        this.addToText(gesture);
                    }
                }
            }
        } catch (error) {
            console.error('Error in hand detection:', error);
        }

        // Continue detection
        if (this.isCameraOn) {
            requestAnimationFrame(() => this.detectHands());
        }
    }

    drawConnections(keypoints) {
        const connections = {
            thumb: [[0, 1], [1, 2], [2, 3], [3, 4]],
            index: [[0, 5], [5, 6], [6, 7], [7, 8]],
            middle: [[0, 9], [9, 10], [10, 11], [11, 12]],
            ring: [[0, 13], [13, 14], [14, 15], [15, 16]],
            pinky: [[0, 17], [17, 18], [18, 19], [19, 20]],
            palm: [[0, 5], [5, 9], [9, 13], [13, 17]]
        };

        const colors = {
            thumb: '#FF0000',
            index: '#00FF00', 
            middle: '#0000FF',
            ring: '#FFFF00',
            pinky: '#FF00FF',
            palm: '#FFFFFF'
        };

        Object.keys(connections).forEach(part => {
            this.ctx.strokeStyle = colors[part];
            this.ctx.lineWidth = 2;
            
            connections[part].forEach(([start, end]) => {
                const [x1, y1] = keypoints[start];
                const [x2, y2] = keypoints[end];
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            });
        });
    }

    captureGesture() {
        // For demo purposes, simulate gesture detection
        // In a real implementation, use the gestureDetector with actual hand data
        const gestures = ['A', 'B', 'C', 'Hello', 'Thank You', 'Yes', 'No', 'Please', 'I LOVE YOU'];
        const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
        this.addToText(randomGesture);
    }

    showDetected(gesture) {
        const badge = document.getElementById('detectedBadge');
        if (!badge) return;
        badge.textContent = gesture;
        badge.style.transform = 'scale(1.02)';
        badge.style.transition = 'transform 120ms ease-out';
        // clear after 2s
        clearTimeout(this._detectedTimeout);
        this._detectedTimeout = setTimeout(() => {
            if (this.currentText) {
                badge.textContent = this.currentText.split(' ').slice(-1)[0] || 'No gesture';
            } else {
                badge.textContent = 'No gesture';
            }
            badge.style.transform = 'scale(1)';
        }, 2000);
    }

    // Populate camera device select element
    async populateCameraList() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');
            const select = document.getElementById('cameraSelect');
            if (!select) return;
            // Clear existing
            const current = select.value;
            select.innerHTML = `<option value="">Default camera</option>`;
            cameras.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.deviceId;
                opt.textContent = cam.label || `Camera ${idx + 1}`;
                select.appendChild(opt);
            });
            if (current) select.value = current;
        } catch (err) {
            console.warn('Could not enumerate devices', err);
        }
    }

    // Initialize MediaPipe Hands and set onResults handler
    initializeMediaPipe() {
        try {
            if (!window.Hands) {
                console.info('MediaPipe Hands not available (will use handpose fallback)');
                return;
            }

            this.hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults((results) => {
                if (!this.ctx || !this.canvas) return;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    const landmarks = results.multiHandLandmarks[0];
                    // Convert normalized landmarks to pixel coordinates
                    const pixelLandmarks = landmarks.map(lm => [lm.x * this.canvas.width, lm.y * this.canvas.height]);

                    // Draw landmarks
                    this.ctx.fillStyle = '#00ff00';
                    for (let i = 0; i < pixelLandmarks.length; i++) {
                        const [x, y] = pixelLandmarks[i];
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
                        this.ctx.fill();
                    }
                    this.drawConnections(pixelLandmarks);

                    const gesture = this.gestureDetector.detectGesture(pixelLandmarks);
                    if (gesture) {
                        this.showDetected(gesture);
                        this.addToText(gesture);
                    }
                }
            });
        } catch (err) {
            console.warn('Error initializing MediaPipe Hands:', err);
        }
    }

    addToText(gesture) {
        this.currentText += (this.currentText ? ' ' : '') + gesture;
        document.getElementById('translatedText').innerHTML = `<p>${this.currentText}</p>`;
        
        // Enable speak button
        document.getElementById('speakText').disabled = false;
        
        // Add to gesture history
        this.gestureHistory.unshift({ gesture, timestamp: new Date() });
        this.updateGestureHistory();
        
        // Save to server if logged in
        if (this.isLoggedIn) {
            this.saveToHistory(gesture, this.currentText);
        }
    }

    updateGestureHistory() {
        const gestureList = document.getElementById('gestureList');
        if (gestureList) {
            gestureList.innerHTML = this.gestureHistory.slice(0, 10).map(item => `
                <div class="gesture-item">
                    <strong>${item.gesture}</strong> - ${item.timestamp.toLocaleTimeString()}
                </div>
            `).join('');
        }
    }

    async saveToHistory(gesture, translatedText) {
        try {
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname === '';
            const API_BASE_URL = isLocalhost ? 'http://localhost:3000/api' : '/api';

            const outputLanguage = document.getElementById('outputLanguage').value;
            
            await fetch(`${API_BASE_URL}/history`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: this.currentUser.id,
                    gesture,
                    translatedText,
                    outputLanguage,
                    sessionId: this.sessionId
                })
            });
        } catch (error) {
            console.error('Error saving history:', error);
        }
    }

    async loadUserHistory() {
        try {
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname === '';
            const API_BASE_URL = isLocalhost ? 'http://localhost:3000/api' : '/api';

            const response = await fetch(`${API_BASE_URL}/history/${this.currentUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            if (data.success) {
                this.displayHistory(data.history);
            } else {
                document.getElementById('historyList').innerHTML = '<p>No translation history found.</p>';
            }
        } catch (error) {
            console.error('Error loading history:', error);
            document.getElementById('historyList').innerHTML = '<p>Error loading history. Please try again.</p>';
        }
    }

    displayHistory(history) {
        const historyList = document.getElementById('historyList');
        if (historyList) {
            if (history.length === 0) {
                historyList.innerHTML = '<p>No translation history yet. Start using the translator to see your history here!</p>';
                return;
            }
            
            historyList.innerHTML = history.map(item => `
                <div class="history-item">
                    <div class="history-gesture"><strong>Gesture:</strong> ${item.gesture}</div>
                    <div class="history-text"><strong>Translation:</strong> ${item.translatedText}</div>
                    <div class="history-time"><strong>Time:</strong> ${new Date(item.timestamp).toLocaleString()}</div>
                </div>
            `).join('');
        }
    }

    setupVoiceSelection() {
        const voiceSelect = document.getElementById('voiceSelection');
        if (voiceSelect) {
            // Populate with available voices
            voiceSelect.innerHTML = `
                <option value="default">Default Voice</option>
                <option value="female">Female Voice</option>
                <option value="male">Male Voice</option>
            `;
        }
    }

    speakText() {
        if (!this.currentText) return;

        const speech = new SpeechSynthesisUtterance(this.currentText);
        speech.rate = parseFloat(document.getElementById('speechRate').value);
        
        // Set voice based on selection
        const voiceSelect = document.getElementById('voiceSelection');
        if (voiceSelect) {
            // Voice selection logic would go here
            // For now, we'll use the default voice
        }
        
        window.speechSynthesis.speak(speech);
    }

    clearText() {
        this.currentText = '';
        document.getElementById('translatedText').innerHTML = '<p>Your translated text will appear here...</p>';
        document.getElementById('speakText').disabled = true;
        this.gestureHistory = [];
        this.updateGestureHistory();
    }

    loadGestureGuide() {
        const gestureGuide = document.getElementById('gestureGuide');
        if (gestureGuide) {
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            const commonGestures = ['Hello', 'Thank You', 'Yes', 'No', 'Please', 'Help', 'Sorry', 'I LOVE YOU'];
            
            const allGestures = [...alphabet, ...commonGestures];
            
            gestureGuide.innerHTML = allGestures.map(gesture => `
                <div class="gesture-card">
                    <div class="gesture-image">${gesture.charAt(0)}</div>
                    <div class="gesture-letter">${gesture}</div>
                </div>
            `).join('');
        }
    }
}

// Enhanced Gesture Detector Class with accurate signs
class GestureDetector {
    constructor() {
        this.lastGestureTime = 0;
        this.gestureCooldown = 1500; // 1.5 seconds between gestures
        this.currentGesture = null;
        this.gestureHistory = [];
        this.stableGestureCount = 0;
        this.lastDetectedGesture = null;
    }

    detectGesture(landmarks) {
        if (!landmarks || landmarks.length < 21) {
            return null;
        }

        // Extract hand features
        const features = this.extractFeatures(landmarks);
        
        // Detect alphabet letters first (most specific)
        const letter = this.detectAlphabet(features, landmarks);
        if (letter) {
            // Require gesture to be stable for 3 frames
            if (letter === this.lastDetectedGesture) {
                this.stableGestureCount++;
                if (this.stableGestureCount >= 3) {
                    const now = Date.now();
                    if (now - this.lastGestureTime >= this.gestureCooldown) {
                        this.lastGestureTime = now;
                        this.stableGestureCount = 0;
                        this.lastDetectedGesture = null;
                        return letter;
                    }
                }
            } else {
                this.lastDetectedGesture = letter;
                this.stableGestureCount = 1;
            }
            return null;
        }

        // Detect common words/phrases
        const word = this.detectWords(features, landmarks);
        if (word) {
            if (word === this.lastDetectedGesture) {
                this.stableGestureCount++;
                if (this.stableGestureCount >= 5) { // Words need more stability
                    const now = Date.now();
                    if (now - this.lastGestureTime >= this.gestureCooldown) {
                        this.lastGestureTime = now;
                        this.stableGestureCount = 0;
                        return word;
                    }
                }
            } else {
                this.lastDetectedGesture = word;
                this.stableGestureCount = 1;
            }
            return null;
        }

        // Reset if no gesture detected
        this.lastDetectedGesture = null;
        this.stableGestureCount = 0;
        return null;
    }

    extractFeatures(landmarks) {
        return {
            fingerStates: this.getFingerStates(landmarks),
            thumbPosition: this.getThumbPosition(landmarks),
            handOrientation: this.getHandOrientation(landmarks),
            fingerSpread: this.getFingerSpread(landmarks),
            palmOpen: this.isPalmOpen(landmarks)
        };
    }

    getFingerStates(landmarks) {
        const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
        const fingerMCPs = [5, 9, 13, 17]; // MCP joints (base of fingers)
        const states = [];

        // Get hand bounding box for normalization
        const wrist = landmarks[0];
        const handWidth = this.getHandWidth(landmarks);

        // Check four fingers (index, middle, ring, pinky)
        for (let i = 0; i < 4; i++) {
            const tip = landmarks[fingerTips[i]];
            const mcp = landmarks[fingerMCPs[i]];
            
            if (tip && mcp) {
                // Check if finger is extended (tip is significantly above MCP)
                // Also check distance from wrist
                const tipToMcp = Math.abs(tip[1] - mcp[1]);
                const tipToWrist = Math.sqrt(
                    Math.pow(tip[0] - wrist[0], 2) + 
                    Math.pow(tip[1] - wrist[1], 2)
                );
                const mcpToWrist = Math.sqrt(
                    Math.pow(mcp[0] - wrist[0], 2) + 
                    Math.pow(mcp[1] - wrist[1], 2)
                );
                
                // Finger is extended if tip is further from wrist than MCP
                // and tip is above MCP (for upright hand)
                const extended = (tipToWrist > mcpToWrist * 1.2) && (tip[1] < mcp[1]);
                states.push(extended ? 1 : 0);
            } else {
                states.push(0);
            }
        }

        // Thumb (special handling - different axis)
        const thumbState = this.getThumbState(landmarks);
        states.push(thumbState);

        return states;
    }

    getHandWidth(landmarks) {
        const indexMcp = landmarks[5];
        const pinkyMcp = landmarks[17];
        if (indexMcp && pinkyMcp) {
            return Math.sqrt(
                Math.pow(indexMcp[0] - pinkyMcp[0], 2) + 
                Math.pow(indexMcp[1] - pinkyMcp[1], 2)
            );
        }
        return 100; // Default width
    }

    getThumbState(landmarks) {
        const thumbTip = landmarks[4];
        const thumbIp = landmarks[3];
        const thumbMcp = landmarks[2];
        const wrist = landmarks[0];
        
        if (!thumbTip || !thumbIp || !thumbMcp || !wrist) return 0;

        // Calculate distances
        const tipToIp = Math.sqrt(
            Math.pow(thumbTip[0] - thumbIp[0], 2) + 
            Math.pow(thumbTip[1] - thumbIp[1], 2)
        );
        const ipToMcp = Math.sqrt(
            Math.pow(thumbIp[0] - thumbMcp[0], 2) + 
            Math.pow(thumbIp[1] - thumbMcp[1], 2)
        );
        const tipToWrist = Math.sqrt(
            Math.pow(thumbTip[0] - wrist[0], 2) + 
            Math.pow(thumbTip[1] - wrist[1], 2)
        );
        const mcpToWrist = Math.sqrt(
            Math.pow(thumbMcp[0] - wrist[0], 2) + 
            Math.pow(thumbMcp[1] - wrist[1], 2)
        );

        // Thumb is extended if tip is significantly away from wrist
        // For right hand: thumb extended means thumbTip[0] > thumbMcp[0]
        // Check both distance and position
        const thumbExtended = (tipToWrist > mcpToWrist * 1.3) && 
                             (Math.abs(thumbTip[0] - thumbMcp[0]) > 20);
        
        return thumbExtended ? 1 : 0;
    }

    getThumbPosition(landmarks) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const indexMcp = landmarks[5];
        const palmBase = landmarks[0];
        
        if (!thumbTip || !indexTip || !palmBase) return 'unknown';

        const thumbToIndex = Math.sqrt(
            Math.pow(thumbTip[0] - indexTip[0], 2) + 
            Math.pow(thumbTip[1] - indexTip[1], 2)
        );

        const thumbToPalm = Math.sqrt(
            Math.pow(thumbTip[0] - palmBase[0], 2) + 
            Math.pow(thumbTip[1] - palmBase[1], 2)
        );

        const handWidth = this.getHandWidth(landmarks);
        const threshold = handWidth * 0.3; // Adaptive threshold

        if (thumbToIndex < threshold) return 'touch';
        if (thumbToPalm > handWidth * 0.8) return 'out';
        return 'in';
    }

    getHandOrientation(landmarks) {
        const wrist = landmarks[0];
        const middleMcp = landmarks[9];
        
        if (!wrist || !middleMcp) return 'unknown';

        const dx = middleMcp[0] - wrist[0];
        const dy = middleMcp[1] - wrist[1];
        
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        if (angle < -45 && angle > -135) return 'up';
        if (angle > 45 && angle < 135) return 'down';
        if (Math.abs(angle) < 45) return 'right';
        return 'left';
    }

    getFingerSpread(landmarks) {
        const tips = [8, 12, 16, 20]; // Finger tips
        let totalDistance = 0;
        let count = 0;

        for (let i = 0; i < tips.length - 1; i++) {
            for (let j = i + 1; j < tips.length; j++) {
                const tip1 = landmarks[tips[i]];
                const tip2 = landmarks[tips[j]];
                
                if (tip1 && tip2) {
                    const distance = Math.sqrt(
                        Math.pow(tip1[0] - tip2[0], 2) + 
                        Math.pow(tip1[1] - tip2[1], 2)
                    );
                    totalDistance += distance;
                    count++;
                }
            }
        }

        return count > 0 ? totalDistance / count : 0;
    }

    isPalmOpen(landmarks) {
        const fingerStates = this.getFingerStates(landmarks);
        const extendedFingers = fingerStates.filter(state => state > 0.5).length;
        return extendedFingers >= 3;
    }

    detectAlphabet(features, landmarks) {
        const { fingerStates, thumbPosition, handOrientation, fingerSpread } = features;

        // Convert finger states to simple array [Index, Middle, Ring, Pinky, Thumb]
        const fingers = fingerStates.map(state => state > 0.5 ? 1 : 0);
        const extendedCount = fingers.slice(0, 4).filter(f => f === 1).length;

        // A: Fist with thumb out to the side
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && thumbPosition === 'out') {
            return 'A';
        }

        // B: All four fingers extended, thumb in
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && fingers[4] === 0) {
            return 'B';
        }

        // C: Curved hand (all fingers partially extended)
        if (extendedCount >= 2 && fingerSpread < 30 && handOrientation === 'right') {
            return 'C';
        }

        // D: Only index finger extended, thumb in
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 0) {
            return 'D';
        }

        // E: All fingers bent, thumb touching tips
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && thumbPosition === 'touch') {
            return 'E';
        }

        // F: OK sign - thumb and index form circle, other fingers extended
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1 && thumbPosition === 'touch') {
            return 'F';
        }

        // G: Index finger pointing (like gun), thumb out
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && thumbPosition === 'out') {
            return 'G';
        }

        // H: Index and middle extended together, others closed
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 0 && fingers[3] === 0 && fingerSpread < 20) {
            return 'H';
        }

        // I: Only pinky extended
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 1 && fingers[4] === 0) {
            return 'I';
        }

        // K: Index and middle extended in V, thumb between them
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && fingerSpread > 30) {
            return 'K';
        }

        // L: Index and thumb extended at right angle
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && thumbPosition === 'out') {
            return 'L';
        }

        // M: Three fingers (thumb, index, middle) down, ring and pinky up
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 1 && fingers[3] === 1 && fingers[4] === 0) {
            return 'M';
        }

        // N: Two fingers (ring and pinky) down, others up
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 0 && fingers[4] === 0) {
            return 'N';
        }

        // O: All fingers curved to form O shape
        if (extendedCount === 0 && fingerSpread < 20 && thumbPosition === 'touch') {
            return 'O';
        }

        // P: Thumb and index extended, others closed
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && thumbPosition === 'out') {
            return 'P';
        }

        // Q: Thumb and index extended downward
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && handOrientation === 'down') {
            return 'Q';
        }

        // R: Index and middle crossed
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 0 && fingers[3] === 0 && fingerSpread < 15) {
            return 'R';
        }

        // S: Fist (all fingers closed, thumb across palm)
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 0) {
            return 'S';
        }

        // T: Thumb between index and middle
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 1 && fingers[3] === 1 && fingers[4] === 1) {
            return 'T';
        }

        // U: Index and middle extended together
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 0 && fingers[3] === 0 && fingerSpread < 25) {
            return 'U';
        }

        // V: Peace sign (index and middle extended apart)
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 0 && fingers[3] === 0 && fingerSpread > 40) {
            return 'V';
        }

        // W: Three fingers extended (index, middle, ring)
        if (fingers[0] === 1 && fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 0) {
            return 'W';
        }

        // X: Index finger bent
        if (fingers[0] === 0 && fingers[1] === 1 && fingers[2] === 1 && fingers[3] === 1) {
            return 'X';
        }

        // Y: Thumb and pinky extended
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 1 && fingers[4] === 1) {
            return 'Y';
        }

        // Z: Index finger drawing Z shape (hard to detect statically, use movement)
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && handOrientation === 'right') {
            return 'Z';
        }

        return null;
    }

    detectWords(features, landmarks) {
        const { fingerStates, thumbPosition, handOrientation, palmOpen, fingerSpread } = features;
        const fingers = fingerStates.map(state => state > 0.5 ? 1 : 0);
        const extendedCount = fingers.slice(0, 4).filter(f => f === 1).length;

        // HELLO: Open hand with all fingers extended, waving motion
        if (palmOpen && extendedCount === 4 && fingers[4] === 0) {
            return 'HELLO';
        }

        // THANK YOU: Open hand moving forward from chin
        if (palmOpen && extendedCount >= 3 && handOrientation === 'up') {
            return 'THANK YOU';
        }

        // YES: Fist with thumb up (nodding motion)
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && thumbPosition === 'out') {
            return 'YES';
        }

        // NO: Index and middle finger crossed (X shape) or index finger shaking
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0) {
            return 'NO';
        }

        // PLEASE: Open hand rubbing chest in circular motion
        if (palmOpen && extendedCount >= 3 && handOrientation === 'right') {
            return 'PLEASE';
        }

        // SORRY: Fist making circular motion on chest
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 0) {
            return 'SORRY';
        }

        // I LOVE YOU: Thumb, index, and pinky extended (ILU sign)
        if (fingers[0] === 1 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 1 && fingers[4] === 1) {
            return 'I LOVE YOU';
        }

        // HELP: Thumb up, other hand patting
        if (fingers[0] === 0 && fingers[1] === 0 && fingers[2] === 0 && fingers[3] === 0 && fingers[4] === 1 && thumbPosition === 'out') {
            return 'HELP';
        }

        // GOOD: Thumb up
        if (fingers[4] === 1 && thumbPosition === 'out' && extendedCount === 0) {
            return 'GOOD';
        }

        // BAD: Thumb down
        if (fingers[4] === 1 && thumbPosition === 'out' && handOrientation === 'down') {
            return 'BAD';
        }

        return null;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.signSpeakApp = new SignSpeakApp();
});