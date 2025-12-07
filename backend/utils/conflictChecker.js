const mongoose = require('mongoose');
const Event = require('../models/Event');
const Court = require('../models/Court');

/**
 * Checks if a time range overlaps with any existing commitments (Events or Court Reservations) for a user.
 * @param {string} userId - The user's ID.
 * @param {Date} newStart - The start time of the proposed booking.
 * @param {Date} newEnd - The end time of the proposed booking.
 * @returns {Promise<{conflict: boolean, type?: 'Event'|'Court', title?: string}>}
 */
const checkSchedulingConflict = async (userId, newStart, newEnd) => {
    const start = new Date(newStart);
    const end = new Date(newEnd);

    // 1. Check Registered Events
    // Find events where user is in registeredUsers
    // Optimisation: query for potential time overlap at DB level if possible, 
    // but easier to fetch active future events and filter in memory for complex logic.
    // Overlap: (ReqStart < ExistingEnd) && (ReqEnd > ExistingStart)

    const events = await Event.find({
        registeredUsers: userId,
        // Only checking future/recent events to save load (optional optimization)
        startDate: { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) }
    }).select('title startDate endDate');

    for (const event of events) {
        if (!event.startDate) continue; // Should have start date
        const evtStart = new Date(event.startDate);
        // Default duration if endDate missing? Assume 1 hour? Or skip?
        // Ideally events have endDate. If not, maybe assume same as start (point in time) which rarely overlaps range unless exact.
        // Let's assume 1 hour if missing, to be safe.
        const evtEnd = event.endDate ? new Date(event.endDate) : new Date(evtStart.getTime() + 60 * 60 * 1000);

        if (start < evtEnd && end > evtStart) {
            return {
                conflict: true,
                type: 'Event',
                title: event.title,
                time: `${evtStart.toLocaleTimeString()} - ${evtEnd.toLocaleTimeString()}`
            };
        }
    }

    // 2. Check Court Reservations
    // Court schema structure: availability: [{ date, startTime, endTime, bookedBy }]
    const courts = await Court.find({
        'availability.bookedBy': userId,
        // Optimization: Status available? No, we checking bookings.
    }).select('name type availability');

    for (const court of courts) {
        for (const slot of court.availability) {
            if (slot.bookedBy && slot.bookedBy.toString() === userId.toString()) {
                // Construct Dates
                const slotDate = new Date(slot.date);
                // formatted YYYY-MM-DD or ISODate.
                // Reset time to 00:00 just in case
                slotDate.setHours(0, 0, 0, 0);

                const [sH, sM] = slot.startTime.split(':').map(Number);
                const [eH, eM] = slot.endTime.split(':').map(Number);

                const slotStart = new Date(slotDate);
                slotStart.setHours(sH, sM, 0, 0);

                const slotEnd = new Date(slotDate);
                slotEnd.setHours(eH, eM, 0, 0);

                if (start < slotEnd && end > slotStart) {
                    return {
                        conflict: true,
                        type: 'Court',
                        title: `${court.name} (${court.type})`,
                        time: slot.startTime
                    };
                }
            }
        }
    }

    return { conflict: false };
};

module.exports = checkSchedulingConflict;
