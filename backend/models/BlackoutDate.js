const mongoose = require('mongoose');

const blackoutDateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    reason: {
      type: String,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// basic sanity: endDate should not be before startDate
blackoutDateSchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    return next(new Error('Blackout end date cannot be before start date'));
  }
  next();
});

module.exports = mongoose.model('BlackoutDate', blackoutDateSchema);
