const mongoose = require('mongoose');
const Event = require('./Event');

const workshopSchema = new mongoose.Schema({
    //faculty responible for the workshop
    facultyName: { type: String, required: true },
    // list of professors involved in the workshop
    professors: [{ name: { type: String, required: true }, department: { type: String } }],
    // financial information for the workshop
    requiredBudget: { type: Number, required: true },
    fundingSource: {
        type: String,
        enum: ['Grant', 'Sponsor', 'External', 'Internal'],
        required: true
    },
    extraRequiredResourses: { type: Boolean, default: false },
    editRequests: [
        {
            field: { type: String, required: true },
            requestedValue: { type: mongoose.Schema.Types.Mixed, required: true },
            requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            date: { type: Date, default: Date.now },
            resolved: { type: Boolean, default: false }
        }
    ],
    // Resources uploaded by the professor for this workshop (PDFs, slides, materials)
    resources: [
        {
            filename: { type: String, required: true },
            originalName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
            url: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now }
        }
    ],

    // Participants who actually attended this workshop
    attendedParticipants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    status: {
        type: String,
        enum: ['pending', 'draft', 'published', 'rejected', 'archived'],
        default: 'pending',
        lowercase: true,
        trim: true,
    },
});

const Workshop = Event.discriminator('Workshop', workshopSchema);// indicates its a subclass of Event
module.exports = Workshop;