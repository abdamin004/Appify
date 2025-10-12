const express = require('express');
const courtController = require('../controllers/courtController');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /courts - Retrieve all courts
router.get('/', courtController.getAllCourts);

// GET /courts/:id - Get specific court details
router.get('/:id', courtController.getCourtById);

// POST /courts/reserve - Reserve a court slot (requires authentication)
router.post('/reserve', auth, courtController.reserveCourt);

// GET /courts/reservations/mine - Get my reservations (requires authentication)
router.get('/reservations/mine', auth, courtController.getMyReservations);

// DELETE /courts/reservations/:courtId/:slotId - Cancel a reservation (requires authentication)
router.delete('/reservations/:courtId/:slotId', auth, courtController.cancelReservation);

module.exports = router;