// Load environment variables FIRST - only once!
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect to database
connectDB().then(() => {
  // initialize a default admin if none exists
  try {
    require('./utils/initAdmin')();
  } catch (err) {
    console.error('initAdmin failed to run:', err);
  }
}).catch(err => {
  console.error('Failed to connect to DB on startup:', err);
});

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/courts', require('./routes/court'));
app.use('/api/auth', require('./routes/Auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/vendor', require('./routes/vendors'));

// Root route
app.get('/', (req, res) => {
  res.send('University Event Management API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` JWT_SECRET is ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
});