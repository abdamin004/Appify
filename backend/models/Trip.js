const mongoose = require('mongoose');
const Event = require('./Event');

const tripSchema = new mongoose.Schema({
    price: { type: Number, required: true }
});

const Trip = Event.discriminator('Trip', tripSchema);
module.exports = Trip;