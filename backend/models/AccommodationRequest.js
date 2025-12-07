const mongoose = require('mongoose');

const accommodationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true
    },
    // The role for which the user is requesting accommodations
    roleAtEvent: {
      type: String,
      enum: ['Student', 'Staff', 'TA', 'Professor'],
      required: true
    },
    // Common types of accommodations
    needsWheelchairAccess: {
      type: Boolean,
      default: false
    },
    needsSpecialSeating: {
      type: Boolean,
      default: false
    },
    // Free-text description for any other details
    otherRequests: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    // For future workflows (admins can approve/deny later)
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    }
  },
  { timestamps: true }
);

// Ensure a user has at most one active request per event
accommodationRequestSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('AccommodationRequest', accommodationRequestSchema);
