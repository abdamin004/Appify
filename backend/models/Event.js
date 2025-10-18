const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({

  title: { type: String, required: true, trim: true },
  shortDescription: { type: String, maxlength: 300 },
  description: { type: String },
  category: { type: String, index: true },
  tags: [{ type: String }],
  
  // Schedule
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date },
  location: { type: String, required: true },
  
  // Capacity & Registration
  capacity: { type: Number, default: 0, min: 0 },
  registeredUsers: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  registrationDeadline: { type: Date },
  fundingSource: {
  type: String,
  enum: ['Grant', 'Sponsor', 'External', 'Internal'],
  required: true
}
,

  // Status & Type
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed'], 
    default: 'draft', 
    index: true 
  },
  // Event type - This must be defined for the discriminator to work correctly
  type: { 
    type: String, 
    enum: ['Workshop', 'Trip', 'Bazaar', 'Booth', 'Conference', 'GymSession'], 
    required: true 
  },
  
  // Creator
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { 
  // Schema Options (the second argument to new Schema)
  discriminatorKey: 'type',
  timestamps: true 
});

module.exports = mongoose.model('Event', eventSchema);
