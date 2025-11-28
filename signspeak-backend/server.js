const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://atlas-sql-690ed4468e20073984d04f01-7dwyqj.a.query.mongodb.net/SIGN_SPEAK?ssl=true&authSource=admin';

console.log('🔗 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected to SIGN_SPEAK database'))
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('💡 Please check your MongoDB connection string in .env file');
});

// Database Schemas
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    joinDate: { type: Date, default: Date.now },
    preferences: {
        showLandmarks: { type: Boolean, default: true },
        language: { type: String, default: 'en-US' },
        confidenceThreshold: { type: Number, default: 0.7 }
    },
    stats: {
        totalTranslations: { type: Number, default: 0 },
        accuracyRate: { type: Number, default: 0 },
        totalSessionTime: { type: Number, default: 0 },
        gesturesLearned: { type: Number, default: 0 }
    }
});

const activitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gesture: { type: String, required: true },
    translation: { type: String, required: true },
    confidence: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    sessionId: { type: String, required: true }
});

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number, default: 0 },
    translationsCount: { type: Number, default: 0 }
});

// Models
const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Session = mongoose.model('Session', sessionSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'signspeak_fallback_secret_2023';

// Auth Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Routes

// Test Route
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 SignSpeak Backend API is running!',
        version: '1.0.0',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        console.log('📝 Registration attempt:', req.body.email);
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();
        console.log('✅ User registered:', user.email);

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                joinDate: user.joinDate,
                preferences: user.preferences,
                stats: user.stats
            }
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration' 
        });
    }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt:', req.body.email);
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        console.log('✅ User logged in:', user.email);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                joinDate: user.joinDate,
                preferences: user.preferences,
                stats: user.stats
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login' 
        });
    }
});

// Verify Token
app.post('/api/auth/verify', authMiddleware, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            joinDate: req.user.joinDate,
            preferences: req.user.preferences,
            stats: req.user.stats
        }
    });
});

// Get User Stats
app.get('/api/user/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        // Get activities count
        const totalTranslations = await Activity.countDocuments({ userId });
        
        // Calculate average confidence
        const activities = await Activity.find({ userId });
        const accuracyRate = activities.length > 0 
            ? activities.reduce((sum, activity) => sum + activity.confidence, 0) / activities.length 
            : 0;

        // Get total session time
        const sessions = await Session.find({ userId });
        const sessionTime = sessions.reduce((sum, session) => sum + session.duration, 0);

        // Count unique gestures
        const uniqueGestures = new Set(activities.map(activity => activity.gesture)).size;

        res.json({
            success: true,
            totalTranslations,
            accuracyRate,
            sessionTime,
            gesturesLearned: uniqueGestures
        });
    } catch (error) {
        console.error('❌ Stats error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching user stats' 
        });
    }
});

// Get User Activity
app.get('/api/user/activity', authMiddleware, async (req, res) => {
    try {
        const activities = await Activity.find({ userId: req.user._id })
            .sort({ timestamp: -1 })
            .limit(10)
            .select('gesture translation confidence timestamp');

        res.json({
            success: true,
            activities
        });
    } catch (error) {
        console.error('❌ Activity error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching user activity' 
        });
    }
});

// Log Gesture Activity
app.post('/api/activity/log', authMiddleware, async (req, res) => {
    try {
        const { gesture, translation, confidence, sessionId } = req.body;

        const activity = new Activity({
            userId: req.user._id,
            gesture,
            translation,
            confidence: confidence || 0.8,
            sessionId: sessionId || `session_${Date.now()}`
        });

        await activity.save();
        console.log('📝 Activity logged:', { user: req.user.email, gesture, confidence });

        res.status(201).json({ 
            success: true,
            message: 'Activity logged successfully' 
        });
    } catch (error) {
        console.error('❌ Activity log error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error logging activity' 
        });
    }
});

// Start Session
app.post('/api/session/start', authMiddleware, async (req, res) => {
    try {
        const session = new Session({
            userId: req.user._id,
            startTime: new Date()
        });

        await session.save();
        
        res.json({ 
            success: true,
            sessionId: session._id, 
            message: 'Session started' 
        });
    } catch (error) {
        console.error('❌ Session start error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error starting session' 
        });
    }
});

// End Session
app.post('/api/session/end', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({ 
                success: false,
                message: 'Session not found' 
            });
        }

        const endTime = new Date();
        const duration = Math.round((endTime - session.startTime) / 60000); // Convert to minutes

        session.endTime = endTime;
        session.duration = duration;

        await session.save();
        console.log('⏱️ Session ended:', { user: req.user.email, duration });

        res.json({ 
            success: true,
            message: 'Session ended', 
            duration 
        });
    } catch (error) {
        console.error('❌ Session end error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error ending session' 
        });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'OK', 
        message: 'SignSpeak API is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 SignSpeak Backend Server running on port ${PORT}`);
    console.log(`📊 MongoDB URI: ${MONGODB_URI}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🏠 Home: http://localhost:${PORT}/`);
});