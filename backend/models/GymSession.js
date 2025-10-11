const mongoose = require('mongoose');


const gymSessionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    time: { type: String, required: true },
    duration: { type: Number, required: true }, // duration in minutes
    type: { type: String, required: true }, // e.g., yoga, cardio, strength training
    capacity: { type: Number, required: true }, // maximum number of participants
});

const GymSession = mongoose.model('GymSession', gymSessionSchema);
module.exports = GymSession;