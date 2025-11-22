const mongoose = require('mongoose');
const Event = require('./Event');

const boothSchema = new mongoose.Schema({
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    participationFee: { type: Number, required: true, default: 0 }
});

const Booth = Event.discriminator('Booth', boothSchema);
module.exports = Booth;

