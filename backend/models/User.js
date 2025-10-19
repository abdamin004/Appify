const mongoose = require('mongoose'); // el mongoose da el library eli hanesta5demha 3ashan net3amel ma3a el mongodb
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({ // el schema da by7aded structure el documents eli fel collection
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, required: true },
  studentStaffId: { type: String },
  verificationToken: String,
  isVerified: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  
  registeredEvents: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event' 
  }]
});

// Password hashing middleware
userSchema.pre('save', async function(next) { // el function di btetnada abl ma el document yetsafed (saved) fe el database
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
