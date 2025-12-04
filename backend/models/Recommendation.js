const mongoose = require('mongoose');
const { Schema } = mongoose;

const recommendationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // One recommendation per user
    index: true
  },
  eventIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Event'
  }],
  // Store the raw response from n8n for reference
  rawResponse: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Index on createdAt for efficient querying
recommendationSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);

    