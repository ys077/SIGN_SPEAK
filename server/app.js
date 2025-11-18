const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://SIGN_SPEAK:ys%40ys%23ys@cluster0.pcyisoh.mongodb.net/signspeak?retryWrites=true&w=majority';

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000
};

async function connectWithRetry(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔌 Attempting MongoDB connection (attempt ${attempt}/${retries})...`);
      await mongoose.connect(MONGODB_URI, mongooseOptions);
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, err.message || err);
      if (attempt < retries) {
        console.log(`Waiting ${delayMs}ms before next attempt...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        console.error('❌ All MongoDB connection attempts failed.');
        return false;
      }
    }
  }
}

async function init() {
  const ok = await connectWithRetry(5, 3000);
  if (!ok) {
    console.error('Application starting without DB. Login/register will fail until DB is reachable.');
    process.exit(1);
  }

  // Routes
  app.use('/api', require('./routes'));

  // Serve frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  function startServer(port, retriesLeft = 5) {
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📱 Access the app at: http://localhost:${port}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${port} is already in use.`);
        if (retriesLeft > 0) {
          const nextPort = Number(port) + 1;
          console.log(`Trying port ${nextPort} (retries left: ${retriesLeft - 1})...`);
          setTimeout(() => startServer(nextPort, retriesLeft - 1), 300);
        } else {
          console.error(`❌ All retry attempts failed. Please free the port or set PORT env variable to a free port.`);
          process.exit(1);
        }
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  }

  startServer(PORT);
}

init();