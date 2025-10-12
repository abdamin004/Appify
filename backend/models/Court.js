const mongoose = require('mongoose');
const User = require('./User');
const { Schema , Types} = mongoose;

const AvailabilitySlotSchema = new Schema({
  date: { type: Date, required: true },           // Day of availability
  startTime: { type: String, required: true },    // "HH:mm" (24h format)
  endTime: { type: String, required: true },      // "HH:mm"
  isBooked: { type: Boolean, default: false },
  bookedBy: { type: Types.ObjectId, ref: 'User' }, // user who booked it
  bookingRef: { type: String },                    // optional booking reference ID
});

const CourtSchema = new Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Basketball Court A"
  type: { 
    type: String, 
    enum: ['basketball', 'tennis', 'football'], 
    required: true,
    index: true
  },
  availability: [AvailabilitySlotSchema],         // list of available time slots
  status: { 
    type: String, 
    enum: ['available', 'maintenance', 'closed'], 
    default: 'available'
  }
}, { timestamps: true });


module.exports = mongoose.model('Court', CourtSchema);