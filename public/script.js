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
        
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });
        }

        // Handle navigation
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                e.preventDefault();
                const page = e.target.getAttribute('href');
                this.navigateTo(page);
            }
        });
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
                break;
            default:
                mainContent.innerHTML = this.renderHomePage();
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
            <section class="hero">
                <div class="hero-content">
                    <h1>Real-time Sign Language to Text Converter</h1>
                    <p>Breaking communication barriers between the hearing and deaf communities with cutting-edge AI technology.</p>
                    <div class="hero-features">
                        <div class="feature-item">
                            <span class="checkmark">✓</span>
                            <span>Real-time sign language recognition</span>
                        </div>
                        <div class="feature-item">
                            <span class="checkmark">✓</span>
                            <span>Accurate translation to text</span>
                        </div>
                        <div class="feature-item">
                            <span class="checkmark">✓</span>
                            <span>User-friendly interface</span>
                        </div>
                        <div class="feature-item">
                            <span class="checkmark">✓</span>
                            <span>Accessible for everyone</span>
                        </div>
                    </div>
                    <div class="hero-buttons">
                        <a href="${this.isLoggedIn ? 'dashboard' : 'register'}" class="btn btn-primary">Get Started</a>
                        <a href="about" class="btn btn-secondary">Learn More</a>
                    </div>
                </div>
                <div class="hero-image">
                    <div class="placeholder-image">
                        Sign Language AI
                    </div>
                </div>
            </section>
        `;
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
                            <input type="text" id="fullName" name="fullName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="confirmPassword">Confirm Password</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" required>
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
                            <video id="video" autoplay playsinline></video>
                            <canvas id="overlay"></canvas>
                            <div class="camera-controls">
                                <button id="startCamera" class="btn btn-primary">Start Camera</button>
                                <button id="stopCamera" class="btn btn-secondary" disabled>Stop Camera</button>
                                <button id="captureGesture" class="btn btn-accent" disabled>Capture Gesture</button>
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
                            <p><strong>${new Date().toLocaleDateString()}</strong></p>
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
                    <div id="historyList" class="history-list"></div>
                </div>
            </div>
        `;
    }

    renderAboutPage() {
        return `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h2>About SignSpeak</h2>
                    <p>Learn more about our mission and technology</p>
                </div>
                <div class="about-content">
                    <p>SignSpeak is an innovative AI-powered platform that converts sign language to text in real-time, 
                    breaking down communication barriers between the hearing and deaf communities.</p>
                    
                    <h3>Features</h3>
                    <ul>
                        <li>Real-time sign language recognition</li>
                        <li>Multi-language translation support</li>
                        <li>Text-to-speech functionality</li>
                        <li>User history and analytics</li>
                        <li>Mobile-responsive design</li>
                    </ul>
                </div>
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
            const API_BASE_URL = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api' 
                : '/.netlify/functions/api';

            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                this.currentUser = data.user;
                this.isLoggedIn = true;
                this.hideLoading();
                this.showMessage('Login successful!', 'success');
                setTimeout(() => this.navigateTo('dashboard'), 1000);
            } else {
                this.hideLoading();
                this.showMessage(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showMessage('Network error. Please check your connection.', 'error');
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
            const API_BASE_URL = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api' 
                : '/.netlify/functions/api';

            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.hideLoading();
                this.showMessage('Registration successful! Please login.', 'success');
                setTimeout(() => this.navigateTo('login'), 2000);
            } else {
                this.hideLoading();
                this.showMessage(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showMessage('Registration failed. Please try again.', 'error');
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
        document.getElementById('speakText').addEventListener('click', () => this.speakText());
        document.getElementById('clearText').addEventListener('click', () => this.clearText());

        // Setup voice selection
        this.setupVoiceSelection();

        // Load gesture guide
        this.loadGestureGuide();
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            this.video.srcObject = stream;
            this.isCameraOn = true;
            
            // Set canvas dimensions to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            document.getElementById('startCamera').disabled = true;
            document.getElementById('stopCamera').disabled = false;
            document.getElementById('captureGesture').disabled = false;

            // Start hand detection
            this.detectHands();
        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showMessage('Cannot access camera. Please check permissions.', 'error');
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
    }

    async detectHands() {
        if (!this.isCameraOn || !this.handposeModel) return;

        try {
            const predictions = await this.handposeModel.estimateHands(this.video);
            
            // Draw hand landmarks
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (predictions.length > 0) {
                for (let i = 0; i < predictions.length; i++) {
                    const keypoints = predictions[i].landmarks;
                    
                    // Draw landmarks
                    this.ctx.fillStyle = 'red';
                    for (let j = 0; j < keypoints.length; j++) {
                        const [x, y] = keypoints[j];
                        this.ctx.beginPath();
                        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
                        this.ctx.fill();
                    }
                    
                    // Draw connections
                    this.ctx.strokeStyle = 'white';
                    this.ctx.lineWidth = 2;
                    this.drawConnections(keypoints);
                }
            }
        } catch (error) {
            console.error('Error detecting hands:', error);
        }

        // Continue detection
        if (this.isCameraOn) {
            requestAnimationFrame(() => this.detectHands());
        }
    }

    drawConnections(keypoints) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
            [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
        ];

        connections.forEach(([start, end]) => {
            const [x1, y1] = keypoints[start];
            const [x2, y2] = keypoints[end];
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        });
    }

    captureGesture() {
        // For demo purposes, simulate gesture detection
        // In a real implementation, use the gestureDetector
        const gestures = ['A', 'B', 'C', 'Hello', 'Thank You', 'Yes', 'No', 'Please'];
        const randomGesture = gestures[Math.floor(Math.random() * gestures.length)];
        this.addToText(randomGesture);
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
            const API_BASE_URL = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api' 
                : '/.netlify/functions/api';

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
            const API_BASE_URL = window.location.hostname === 'localhost' 
                ? 'http://localhost:3000/api' 
                : '/.netlify/functions/api';

            const response = await fetch(`${API_BASE_URL}/history/${this.currentUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            if (data.success) {
                this.displayHistory(data.history);
            }
        } catch (error) {
            console.error('Error loading history:', error);
            this.showMessage('Error loading history', 'error');
        }
    }

    displayHistory(history) {
        const historyList = document.getElementById('historyList');
        if (historyList) {
            if (history.length === 0) {
                historyList.innerHTML = '<p>No translation history yet.</p>';
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
        
        // Populate with available voices
        voiceSelect.innerHTML = `
            <option value="default">Default Voice</option>
            <option value="female">Female Voice</option>
            <option value="male">Male Voice</option>
        `;

        // Update speech rate display
        const speechRate = document.getElementById('speechRate');
        const rateValue = document.getElementById('rateValue');
        
        speechRate.addEventListener('input', () => {
            rateValue.textContent = speechRate.value;
        });
    }

    speakText() {
        if (!this.currentText) return;

        const speech = new SpeechSynthesisUtterance(this.currentText);
        speech.rate = parseFloat(document.getElementById('speechRate').value);
        
        // Set voice based on selection
        const voiceSelect = document.getElementById('voiceSelection').value;
        // Voice selection logic would go here
        
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
            const commonGestures = ['Hello', 'Thank You', 'Yes', 'No', 'Please', 'Help', 'Sorry'];
            
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

// Gesture Detector Class
class GestureDetector {
    constructor() {
        this.gestures = {
            'A': { description: 'Closed fist with thumb aside' },
            'B': { description: 'Flat hand, fingers together' },
            'C': { description: 'Curved hand forming C shape' },
            'D': { description: 'Index finger pointing up' },
            'E': { description: 'Fingers curved, thumb across fingers' },
            'HELLO': { description: 'Wave hand side to side' },
            'THANK YOU': { description: 'Hand moves from chin forward' },
            'YES': { description: 'Nod fist up and down' },
            'NO': { description: 'Wave index finger side to side' },
            'PLEASE': { description: 'Circular motion on chest' }
        };
    }

    detectGesture(landmarks) {
        // Simple gesture detection logic
        const fingersUp = this.countFingersUp(landmarks);
        
        if (fingersUp === 0) return 'A';
        if (fingersUp === 5) return 'B';
        if (fingersUp === 1) return 'D';
        if (this.isWaveGesture(landmarks)) return 'HELLO';
        
        return null;
    }

    countFingersUp(landmarks) {
        let count = 0;
        const fingerTips = [8, 12, 16, 20];
        const fingerPips = [6, 10, 14, 18];
        
        fingerTips.forEach((tip, index) => {
            if (landmarks[tip] && landmarks[fingerPips[index]]) {
                if (landmarks[tip].y < landmarks[fingerPips[index]].y) {
                    count++;
                }
            }
        });
        
        // Thumb
        if (landmarks[4] && landmarks[2]) {
            if (landmarks[4].x < landmarks[2].x) {
                count++;
            }
        }
        
        return count;
    }

    isWaveGesture(landmarks) {
        // Simple wave detection for demo
        return Math.random() > 0.9;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.signSpeakApp = new SignSpeakApp();
});