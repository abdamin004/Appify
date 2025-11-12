const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  value: { type: Number, required: true, min: 1, max: 5 },
}, { timestamps: true });

ratingSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);

