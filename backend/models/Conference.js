const mongoose = require('mongoose');
const Event = require('./Event');

const conferenceSchema = new mongoose.Schema({
    websiteLink: { type: String, required: true },
    requiredBudget: { type: Number },
    fundingSource: { type: String, enum: ['internal', 'external'] },
    extraRequiredResourses: { type: Boolean, default: false },
});

const Conference = Event.discriminator('Conference', conferenceSchema);// indicates its a subclass of Event
module.exports = Conference;