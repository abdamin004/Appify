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

// GET /events/workshops/registrations
router.get('/workshops/registrations', auth, roleCheck('Professor'), eventController.getWorkshopRegistrations);

// Comment routes
router.post('/comment/:eventId', auth, eventController.addComment);
router.delete('/comment/:commentId', auth, eventController.deleteComment);

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

// GET /events/workshops/:id/status - View workshop status and edit requests
router.get('/workshops/:id/status', auth, roleCheck('Professor'), eventController.viewWorkshopStatusAndEditRequests);

//Put /events/workshops/:workshopId/review - Accept or reject workshop requests
router.put('/workshops/:workshopId/review', auth, roleCheck('Admin', 'EventOffice'), eventController.acceptOrRejectWorkshopRequests);

// Post /events/workshops/:workshopId/request-edit - Request edits for a workshop
router.post('/workshops/:workshopId/request-edit', auth, roleCheck('Admin', 'EventOffice'), eventController.requestWorkshopEdit);

// routes/events.js
router.patch('/publish/:id', auth, roleCheck('Admin', 'EventOffice'), eventController.publishEvent);

module.exports = router;