// seedCourts.js
const mongoose = require('mongoose');
const Court = require('./Court');

// === CONFIG ===
const MONGO_URI = 'mongodb://admin:admin123@localhost:27017/university_events?authSource=admin';
const SLOT_START_HOUR = 6;   // start time (6 AM)
const SLOT_END_HOUR = 22;    // end time (10 PM)
const DAYS_AHEAD = 7;        // generate 7 days of availability

// === Helper to generate 1-hour slots for a given date ===
function generateSlotsForDate(date) {
  const slots = [];
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);

  for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour++) {
    const start = `${hour.toString().padStart(2, '0')}:00`;
    const end = `${(hour + 1).toString().padStart(2, '0')}:00`;
    slots.push({
      date: baseDate,
      startTime: start,
      endTime: end,
      isBooked: false
    });
  }

  return slots;
}

// === Generate availability for 7 days ===
function generateWeeklyAvailability() {
  const availability = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    availability.push(...generateSlotsForDate(date));
  }

  return availability;
}

// === Sample courts ===
const courts = [
  {
    name: "Basketball Court A",
    type: "basketball",   
    status: "available"
  },
  {
    name: "Tennis Court 1",
    type: "tennis",
    status: "available"
  },
  {
    name: "Football Field",
    type: "football",    
    status: "available",
  },
  {
    name: "Indoor Basketball Court B",
    type: "basketball",
    status: "available"
  }
];

// === Main seeding function ===
async function seedCourts() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    await Court.deleteMany({});
    console.log('🧹 Cleared existing courts');

    // Add weekly availability to each court
    const courtsWithAvailability = courts.map(court => ({
      ...court,
      availability: generateWeeklyAvailability()
    }));

    await Court.insertMany(courtsWithAvailability);
    console.log('✅ Courts inserted successfully with 7 days of availability');

  } catch (err) {
    console.error('❌ Error seeding courts:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 MongoDB connection closed');
  }
}

// Run the seeder
seedCourts();
