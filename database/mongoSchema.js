const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters long'],
    maxlength: [50, 'Full name cannot exceed 50 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  preferences: {
    outputLanguage: { 
      type: String, 
      default: 'en',
      enum: ['en', 'ta', 'hi']
    },
    voice: { 
      type: String, 
      default: 'default' 
    },
    speechRate: { 
      type: Number, 
      default: 1.0,
      min: 0.5,
      max: 2.0
    },
    highContrast: { 
      type: Boolean, 
      default: false 
    },
    fontSize: { 
      type: String, 
      default: 'medium',
      enum: ['small', 'medium', 'large', 'x-large']
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date, 
    default: Date.now 
  }
});

const historySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'] 
  },
  gesture: { 
    type: String, 
    required: [true, 'Gesture is required'],
    trim: true
  },
  translatedText: { 
    type: String, 
    required: [true, 'Translated text is required'],
    trim: true
  },
  outputLanguage: { 
    type: String, 
    default: 'en',
    enum: ['en', 'ta', 'hi']
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  sessionId: { 
    type: String, 
    required: [true, 'Session ID is required'] 
  }
});

// Add indexes for better performance
userSchema.index({ email: 1 });
historySchema.index({ userId: 1, timestamp: -1 });
historySchema.index({ sessionId: 1 });

const User = mongoose.model('User', userSchema);
const History = mongoose.model('History', historySchema);

module.exports = { User, History };