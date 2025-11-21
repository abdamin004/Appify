const mongoose = require('mongoose');

const visitorPassSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    vendorApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorApplication', index: true },
    eventTitle: { type: String, required: true },
    eventType: { type: String, required: true },
    visitorName: { type: String, required: true },
    visitorEmail: { type: String },
    visitorOrganization: { type: String },
    visitorIdNumber: { type: String },
    purpose: { type: String },
    passCode: { type: String, required: true, unique: true },
    qrData: { type: String, required: true },
    qrImageDataUrl: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

visitorPassSchema.index({ event: 1, visitorEmail: 1 });

module.exports = mongoose.model('VisitorPass', visitorPassSchema);

