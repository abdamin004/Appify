const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Trip', 'Workshop'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /.+@.+\..+/, // basic email validation
    },
    idNumber: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional association to a user if logged in
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Optional reference to a specific event if used later
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Registration', registrationSchema);
