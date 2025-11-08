const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(express.json());
app.use(require('cors')());

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://SIGN_SPEAK:ys%40ys%23ys@cluster0.pcyisoh.mongodb.net/signspeak?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  preferences: {
    outputLanguage: { type: String, default: 'en' },
    voice: { type: String, default: 'default' },
    speechRate: { type: Number, default: 1.0 },
    highContrast: { type: Boolean, default: false },
    fontSize: { type: String, default: 'medium' }
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gesture: { type: String, required: true },
  translatedText: { type: String, required: true },
  outputLanguage: { type: String, default: 'en' },
  timestamp: { type: Date, default: Date.now },
  sessionId: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);
const History = mongoose.model('History', historySchema);

const JWT_SECRET = 'signspeak-secret-key-2024';

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ fullName, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: { id: user._id, fullName: user.fullName, email: user.email },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user._id, fullName: user.fullName, email: user.email },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.get('/api/history/:userId', async (req, res) => {
  try {
    const history = await History.find({ userId: req.params.userId }).sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/history', async (req, res) => {
  try {
    const history = new History(req.body);
    await history.save();
    res.json({ success: true, message: 'History saved successfully', history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save history' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

module.exports.handler = serverless(app);