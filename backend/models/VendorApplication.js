const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  email: { type: String, required: true, lowercase: true }
}, { _id: false });

const vendorApplicationSchema = new mongoose.Schema({
  // Always tied to an Event (Bazaar or Booth)
  event:        { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

  // Company and vendor user applying on its behalf
  organization: { type: String, required: true, index: true },
  vendorUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

  // Common fields between Bazaar & Booth 
  attendees:    { type: [attendeeSchema], default: [] },      // ≤ 5 (validator below)
  boothSize:    { type: String, enum: ['2x2','4x4'], required: true },

  // Required only when event.type === 'Booth'
  setupDurationWeeks: { type: Number, min: 1, max: 4 },       // 1..4 integer
  setupLocation:      { type: String },                       // map slot id (e.g., "ZB-04")

  // Workflow
  status:     { type: String, enum: ['pending','approved','rejected'], default: 'pending', index: true }, 
  notes:      String, // notes or review from vendor
  reviewer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin/staff who reviewed
  reviewedAt: Date
}, { timestamps: true });

// Hard guard: ≤ 5 attendees
vendorApplicationSchema.path('attendees').validate(arr => !arr || arr.length <= 5,
  'Maximum 5 attendees allowed');

// One application per company per event (works for BOTH Bazaar & Booth)
vendorApplicationSchema.index({ event: 1, organization: 1 }, { unique: true });

module.exports = mongoose.model('VendorApplication', vendorApplicationSchema);
