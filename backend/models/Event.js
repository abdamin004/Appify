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

	vendors: [{ type: Schema.Types.ObjectId, ref: 'Vendor' }],

	// Capacity
	capacity: { type: Number, default: 0, min: 0 },

	// Status
	status: { type: String, enum: ['draft', 'published', 'cancelled', 'completed'], default: 'draft', index: true },
	
    professorName: {type: String},
    // Event type
    type: { type: String, enum: ['workshops', 'trips', 'bazaars', 'booths', 'conferences'], required: true },
    
    // Who created this event (could be staff/admin)
	//createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }


}, { timestamps: true });


module.exports = mongoose.model('Event', eventSchema);

