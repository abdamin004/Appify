const mongoose = require('mongoose');
const { Schema } = mongoose;

const favoriteSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Compound index to ensure a user can only favorite an event once
favoriteSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);

