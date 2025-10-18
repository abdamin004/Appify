const express = require('express');
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const router = express.Router();

// Create event
router.post('/create', auth, roleCheck('Admin', 'EventOffice' , 'Professor'), eventController.createEvent);

// Update event
router.put('/update/:id', auth, roleCheck('Admin', 'EventOffice', 'Professor'), eventController.updateEvent);

// Delete event
router.delete('/delete/:id', auth, roleCheck('Admin', 'EventOffice'), eventController.deleteEvent);

// Get my workshops
router.get('/workshops/mine', auth, roleCheck('Professor'), eventController.getMyWorkshops);

// Get all events
router.get('/', eventController.getAllEvents);

// Search events
router.get('/search', eventController.searchEvents);

// Filter events
router.get('/filter', eventController.filterEvents);

// Sort events
router.get('/sort', eventController.sortEvents);

// Get registered events
router.get('/registered', auth, eventController.getRegisteredEvents);

// POST /events/register/:eventId - Register for an event
router.post('/register/:eventId', auth, eventController.registerForEvent);

// POST /events/unregister/:eventId - Unregister from an event
router.post('/unregister/:eventId', auth, eventController.unregisterFromEvent);

// routes/events.js
router.patch('/publish/:id', auth, roleCheck('Admin', 'EventOffice'), eventController.publishEvent);


module.exports = router;