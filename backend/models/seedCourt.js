// seedCourts.js
const mongoose = require('mongoose');
const Court = require('./Court');

// === CONFIG ===
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
    // Check if mongoose is already connected
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for database connection...');
      // Wait for connection (with timeout)
      let attempts = 0;
      while (mongoose.connection.readyState !== 1 && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database connection not available');
      }
    }

    console.log('✅ Database connection ready, starting court seeding...');

    // Delete all existing courts first
    const deleteResult = await Court.deleteMany({});
    console.log(`🧹 Cleared ${deleteResult.deletedCount} existing court(s)`);

    // Add weekly availability to each court
    const courtsWithAvailability = courts.map(court => ({
      ...court,
      availability: generateWeeklyAvailability()
    }));

    const insertResult = await Court.insertMany(courtsWithAvailability);
    console.log(`✅ ${insertResult.length} court(s) inserted successfully with 7 days of availability`);

  } catch (err) {
    console.error('❌ Error seeding courts:', err);
    // Don't throw - allow server to continue even if seeding fails
  }
}

module.exports = seedCourts;
