const mongoose = require('mongoose');

const orgSchema = new mongoose.Schema({
  name:   { type: String, required: true, unique: true },
  email:  { type: String, lowercase: true },
  phone:  String,
  website:String,
  contactPerson: {
    name:  String,
    email: String,
    phone: String,
  },
}, { timestamps: true });

// DB-level de-duplication by company name
orgSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Organization', orgSchema);
