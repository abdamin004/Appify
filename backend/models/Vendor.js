const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// dah el schema beta3 el vendors
const vendorSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true, // el email lazim yeb2a mawgod
    unique: true, // kol vendor lazim yeb2a 3ando email unique
    lowercase: true // el email yeb2a lowercase 3ashan n2arn b sah
  },
  password: {
    type: String,
    required: true, // el password lazim yeb2a mawgod
    minlength: 6, // el password lazim yeb2a 6 characters on least
    select: false // el password msh hayerga3 lama nerga3 el data
  },
  companyName: {
    type: String,
    required: true // esma beta3 el company lazim yeb2a mawgod
  },
  isBlocked: {
    type: Boolean,
    default: false // default el vendor msh ma7gz
  }
}, { timestamps: true }); // timestamps 3ashan yeb2a 3ando createdAt w updatedAt automatically

// Hash el password abl ma n7ot el vendor fel database
vendorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // law el password msh t3adel msh ne3ml hash tani
  const salt = await bcrypt.genSalt(10); // generate el salt
  this.password = await bcrypt.hash(this.password, salt); // hash el password
  next();
});

// method 3ashan ncompare el password eli el user da5alha
vendorSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password); // return true aw false
};

//export el model 3ashan n2dr nesta5demo fe ay 7eta fel project
module.exports = mongoose.model('Vendor', vendorSchema);
