const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // EventOffice user who created the poll
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Vendor applications that are options in this poll
  vendorApplications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VendorApplication',
    required: true
  }],
  // Event this poll is for (Booth event)
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  // Poll status
  status: {
    type: String,
    enum: ['active', 'closed', 'completed'],
    default: 'active'
  },
  // Voting period
  votingStartDate: {
    type: Date,
    required: true
  },
  votingEndDate: {
    type: Date,
    required: true
  },
  // Votes - array of vote objects
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vendorApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorApplication',
      required: true
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// Index for efficient queries
pollSchema.index({ event: 1, status: 1 });
pollSchema.index({ votingStartDate: 1, votingEndDate: 1 });
pollSchema.index({ 'votes.user': 1 });

module.exports = mongoose.model('Poll', pollSchema);