const mongoose = require('mongoose');
const Event = require('./Event');

const bazaarSchema = new mongoose.Schema({
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    participationFee: { type: Number, required: true, default: 0 }
});

const Bazaar = Event.discriminator('Bazaar', bazaarSchema);
module.exports = Bazaar;