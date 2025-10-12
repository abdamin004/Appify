const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['VendorApplicationSubmitted', 'VendorApplicationApproved', 'VendorApplicationRejected'],
    required: true
  },
  message: { type: String, required: true },

  // Who should see it
  recipientsRoles: [{ type: String, enum: ['Admin', 'EventOffice', 'Vendor'] }],
  recipientUser: { type: mongoose.Schema.Types.ObjectId, refPath: 'recipientModel' },
  recipientModel: { type: String, enum: ['User', 'Vendor'], default: 'User' },

  // Context
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorApplication' },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

  // State
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date }
}, { timestamps: true });

notificationSchema.index({ recipientsRoles: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

