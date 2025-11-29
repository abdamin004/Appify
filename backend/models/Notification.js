const mongoose = require('mongoose');

// Per-user status subdocument
const userStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
        enum: [
          'VendorApplicationSubmitted',
          'VendorApplicationApproved',
          'VendorApplicationRejected',
          'NewEventPublished',
          'EventReminder1Day',
          'EventReminder1Hour',
          'LoyaltyPartnerAdded',
          'WorkshopEditSubmitted'
        ],
    required: true
  },
  message: { type: String, required: true },

  // Who should see it
    recipientsRoles: [{ type: String, enum: ['Admin', 'EventOffice', 'Vendor', 'Student', 'Staff', 'TA', 'Professor' ] }],
  recipientUser: { type: mongoose.Schema.Types.ObjectId, refPath: 'recipientModel' },
  recipientModel: { type: String, enum: ['User', 'Vendor'], default: 'User' },

  // Context
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorApplication' },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  organization: { type: String, ref: 'Organization' },

  // Per-user status tracking
  userStatus: [userStatusSchema],

  // Legacy field for backward compatibility (deprecated - use userStatus instead)
  isRead: { type: Boolean, default: false, index: true },
  readAt: { type: Date }
}, { timestamps: true });

notificationSchema.index({ recipientsRoles: 1, createdAt: -1 });
notificationSchema.index({ 'userStatus.userId': 1 });
notificationSchema.index({ 'userStatus.isDeleted': 1 });

module.exports = mongoose.model('Notification', notificationSchema);

