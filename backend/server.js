// Load environment variables FIRST - only once!
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { connectQdrant } = require('./config/qdrant');

// Connect to database
connectDB().then(async () => {
  // initialize a default admin if none exists
  try {
    require('./utils/initAdmin')();
  } catch (err) {
    console.error('initAdmin failed to run:', err);
  }

  // Seed courts after database connection is established
  try {
    const seedCourts = require('./models/seedCourt');
    await seedCourts();
  } catch (err) {
    console.error('seedCourts failed to run:', err);
  }

  // Connect to Qdrant and create collections
  try {
    await connectQdrant();
    // Create events_embeddings collection if it doesn't exist (only if OpenAI API key is set)
    if (process.env.OPENAI_API_KEY) {
      try {
        const { ensureCollectionExists } = require('./utils/embeddings');
        await ensureCollectionExists();
      } catch (embedErr) {
        console.error('Failed to create embeddings collection:', embedErr.message);
      }
    } else {
      console.log('⚠️  OPENAI_API_KEY not set, skipping embeddings collection creation');
    }
  } catch (err) {
    console.error('Qdrant connection failed:', err);
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
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // serve static files from uploads folder Then URLs like /uploads/vendors/<filename> will be accessible.

// Routes
app.use('/api/events', require('./routes/events'));
app.use('/api/courts', require('./routes/court'));
app.use('/api/auth', require('./routes/Auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/vendor', require('./routes/vendors'));
app.use('/api/users', require('./routes/users'));
app.use('/api/polls', require('./routes/polls'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/chat', require('./routes/chat'));

// Root route
app.get('/', (req, res) => {
  res.send('University Event Management API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

require('./cron/eventReminderCron')(); // Start the event reminder cron job
require('./cron/workshopCertificateCron')(); // Send workshop certificates after completion
// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` JWT_SECRET is ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
});
