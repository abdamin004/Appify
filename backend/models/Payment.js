const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'egp' },
  method: { type: String, enum: ['wallet', 'card'], required: true },
  status: { type: String, enum: ['paid', 'refunded'], default: 'paid', index: true },
  sessionId: { type: String }, // for card payments
  refundedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);

