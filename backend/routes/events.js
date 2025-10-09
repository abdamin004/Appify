const express = require('express');
const eventController = require('../controllers/eventController');
// Auth middleware (verifies JWT and attaches req.user)
const auth = require('../middleware/auth');
const router = express.Router();

// post /events - Create a new event (recommended: protect this route with auth middleware)
// Protect the create route so the creating user is available on req.user
router.post('/create', /*auth,*/ eventController.createEvent);

// PUT /events/update/:id - Update an event (recommended: protect this route with auth middleware)
router.put('/update/:id', /*auth,*/ eventController.updateEvent);

// DELETE /events/delete/:id - Delete an event (recommended: protect this route with auth middleware)
router.delete('/delete/:id', /*auth,*/ eventController.deleteEvent);

// GET /events - View all upcoming events with details and vendors
router.get('/', eventController.getAllEvents);

// GET /events/search - Search events by professor name, event name, or type
router.get('/search', eventController.searchEvents);

// GET /events/filter - Filter events by professor name, location, type, or date
router.get('/filter', eventController.filterEvents);

// GET /events/sort - Sort events by date
router.get('/sort', eventController.sortEvents);

// GET /events/registered - View a list of my registered events
router.get('/registered', eventController.getRegisteredEvents);

module.exports = router;