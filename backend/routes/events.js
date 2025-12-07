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

router.patch(
  '/:id/archive',
  auth,
  roleCheck('Admin', 'EventOffice'),
  eventController.archiveEvent
);

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
router.post(
  '/vendor-applications/:applicationId/attendee-passes',
  auth,
  roleCheck('Admin', 'EventOffice'),
  eventController.generateVendorAttendeePasses
);
// Get event recommendations (must be before /:id route)
router.get('/recommendations', auth, roleCheck('Student', 'Staff', 'TA', 'Professor'), eventController.getEventRecommendations);
// Get single event by ID (must be LAST, after all specific routes like /recommendations, /favorites/mine, etc.)
router.get('/:id', eventController.getEventById);

router.get('/:id/comments',auth, roleCheck('Student', 'Staff', 'TA', 'Professor', 'EventsOffice', 'Admin'),eventController.getEventComments);
// View all ratings on an event
router.get('/:id/ratings',auth, roleCheck('Student', 'Staff', 'TA', 'Professor', 'EventsOffice', 'Admin'),eventController.getEventRatings);

// Add a rating on an event (ONLY after event has ended)
router.post('/:id/ratings',auth,roleCheck('Student', 'Staff', 'TA', 'Professor', 'EventsOffice', 'Admin'),eventController.addEventRating);

// Add event to favorites
router.post('/favorites/:eventId', auth, roleCheck('Student', 'Staff', 'TA', 'Professor'), eventController.addEventToFavorites);

// Remove event from favorites
router.delete('/favorites/:eventId', auth, roleCheck('Student', 'Staff', 'TA', 'Professor'), eventController.removeEventFromFavorites);

// View my favorites list
router.get('/favorites/mine', auth, roleCheck('Student', 'Staff', 'TA', 'Professor'), eventController.getMyFavoriteEvents);

// Create LinkedIn post for an event
router.post('/:id/linkedin-post', auth, roleCheck('Admin', 'EventOffice', 'Professor'), eventController.createLinkedInPost);

module.exports = router;
