const mongoose = require('mongoose');
const { Schema } = mongoose;

const feedbackSchema = new Schema({
    // Link to Event and User
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Structured Ratings (1-5 scale)
    ratings: {
        overall: { type: Number, min: 1, max: 5, required: true },
        content: { type: Number, min: 1, max: 5, default: 0 }, // 0 means N/A or skipped
        speaker: { type: Number, min: 1, max: 5, default: 0 },
        organization: { type: Number, min: 1, max: 5, default: 0 }
    },

    // Optional Text Comment
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Prevent duplicate feedback from same user per event
feedbackSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
