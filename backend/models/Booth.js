const mongoose = require('mongoose');
const Event = require('./Event');

// Booth schema - similar to Bazaar but for longer-term vendor setups
const boothSchema = new mongoose.Schema({
  // Booth-specific fields can be added here if needed
  // For now, it uses the same structure as Bazaar
  // The main difference is in how vendors apply (they need setupDurationWeeks and setupLocation)
});

// Create Booth as a discriminator of Event
const Booth = Event.discriminator('Booth', boothSchema);

module.exports = Booth;

