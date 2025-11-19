const mongoose = require('mongoose');
const Event = require('./Event');

const boothSchema = new mongoose.Schema({
    vendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }]
});

const Booth = Event.discriminator('Booth', boothSchema);
module.exports = Booth;

