const Court = require('../models/Court');
const mongoose = require('mongoose');

// GET /courts - Retrieve all courts
const getAllCourts = async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    else filter.status = 'available'; // Default to available courts
    
    const courts = await Court.find(filter);
    res.status(200).json({ success: true, count: courts.length, courts });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving courts', error: error.message });
  }
};

// GET /courts/:id - Get a specific court with availability
const getCourtById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid court ID' });
    }
    
    const court = await Court.findById(id);
    if (!court) {
      return res.status(404).json({ message: 'Court not found' });
    }
    
    res.status(200).json({ success: true, court });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving court', error: error.message });
  }
};

// POST /courts/reserve - Reserve a court slot
const reserveCourt = async (req, res) => {
  try {
    const { courtId, slotId } = req.body;
    const userId = req.user._id; // From auth middleware
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courtId)) {
      return res.status(400).json({ message: 'Invalid court ID' });
    }
    
    // Find the court
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ message: 'Court not found' });
    }
    
    if (court.status !== 'available') {
      return res.status(400).json({ message: `Court is currently ${court.status}` });
    }
    
    // Find the specific slot
    const slot = court.availability.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }
    
    // Check if slot is already booked
    if (slot.isBooked) {
      return res.status(400).json({ message: 'This time slot is already booked' });
    }
    
    // Check if slot is in the past
    const slotDateTime = new Date(slot.date);
    const [hours, minutes] = slot.startTime.split(':');
    slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (slotDateTime < new Date()) {
      return res.status(400).json({ message: 'Cannot book a time slot in the past' });
    }
    
    // Book the slot
    slot.isBooked = true;
    slot.bookedBy = userId;
    slot.bookingRef = `BK-${Date.now()}-${userId.toString().slice(-6)}`;
    
    await court.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Court reserved successfully', 
      booking: {
        courtName: court.name,
        courtType: court.type,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        bookingRef: slot.bookingRef
      }
    });
  } catch (error) {
    console.error('Error reserving court:', error);
    res.status(500).json({ message: 'Error reserving court', error: error.message });
  }
};

// GET /courts/reservations/mine - Get user's reservations
const getMyReservations = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all courts with bookings by this user
    const courts = await Court.find({
      'availability.bookedBy': userId
    });
    
    const reservations = [];
    
    courts.forEach(court => {
      court.availability.forEach(slot => {
        if (slot.bookedBy && slot.bookedBy.toString() === userId.toString()) {
          reservations.push({
            courtId: court._id,
            courtName: court.name,
            courtType: court.type,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            bookingRef: slot.bookingRef,
            slotId: slot._id
          });
        }
      });
    });
    
    // Sort by date (most recent first)
    reservations.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({ 
      success: true, 
      count: reservations.length, 
      reservations 
    });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Error fetching reservations', error: error.message });
  }
};

// DELETE /courts/reservations/:courtId/:slotId - Cancel a reservation
const cancelReservation = async (req, res) => {
  try {
    const { courtId, slotId } = req.params;
    const userId = req.user._id;
    
    if (!mongoose.Types.ObjectId.isValid(courtId)) {
      return res.status(400).json({ message: 'Invalid court ID' });
    }
    
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ message: 'Court not found' });
    }
    
    const slot = court.availability.id(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    // Check if user owns this booking
    if (!slot.bookedBy || slot.bookedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own reservations' });
    }
    
    // Check if slot is in the past
    const slotDateTime = new Date(slot.date);
    const [hours, minutes] = slot.startTime.split(':');
    slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (slotDateTime < new Date()) {
      return res.status(400).json({ message: 'Cannot cancel a past reservation' });
    }
    
    // Cancel the booking
    slot.isBooked = false;
    slot.bookedBy = undefined;
    slot.bookingRef = undefined;
    
    await court.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Reservation cancelled successfully' 
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    res.status(500).json({ message: 'Error cancelling reservation', error: error.message });
  }
};

module.exports = {
  getAllCourts,
  getCourtById,
  reserveCourt,
  getMyReservations,
  cancelReservation
};