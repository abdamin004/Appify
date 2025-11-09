const mongoose = require('mongoose');

const loyaltyApplicationSchema = new mongoose.Schema({
  vendorUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor', 
    required: true
  },
  organization: {
    type: String, // or  if the vendors always apply on behalf of an organization, you can change organization: String -> organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
    required: true
  },
  discountRate: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  promoCode: {
    type: String,
    required: true,
    trim: true
  },
  termsAndConditions: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('LoyaltyApplication', loyaltyApplicationSchema);
