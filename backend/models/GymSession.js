const mongoose = require('mongoose');
const Event = require('./Event');

const gymSessionSchema = new mongoose.Schema({
  // Type of gym session
  sessionType: { 
    type: String, 
    enum: ['cardio', 'strength', 'yoga', 'pilates', 'spinning', 'crossfit', 'zumba', 'other'], 
    required: true 
  },
  
  // Instructor information
  instructor: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // Equipment needed
  equipment: [{ 
    type: String,
    trim: true
  }],
  
  // Difficulty level
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'beginner' 
  },
  
  // Duration in minutes (optional, can also be calculated from startDate/endDate)
  durationMinutes: {
    type: Number,
    min: 15,
    max: 180
  },
  
  // Prerequisites or requirements
  prerequisites: {
    type: String,
    trim: true
  }
});

const GymSession = Event.discriminator('GymSession', gymSessionSchema);

module.exports = GymSession;