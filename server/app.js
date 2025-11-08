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

// Database connection with your MongoDB
const MONGODB_URI = 'mongodb+srv://SIGN_SPEAK:ys%40ys%23ys@cluster0.pcyisoh.mongodb.net/signspeak?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api', require('./routes'));

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server with graceful retry on EADDRINUSE (try a few next ports)
const MAX_RETRIES = 5;
function startServer(port, retriesLeft = MAX_RETRIES) {
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
        // small delay before retrying
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