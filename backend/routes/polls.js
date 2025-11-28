const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get vendor applications available for creating polls (EventOffice only)
router.get(
  '/vendor-applications',
  auth,
  roleCheck('EventOffice', 'Admin'),
  pollController.getVendorApplicationsForPoll
);

// Create a poll (EventOffice only)
router.post(
  '/create',
  auth,
  roleCheck('EventOffice', 'Admin'),
  pollController.createPoll
);

// List all polls (all authenticated users can view)
router.get(
  '/',
  auth,
  pollController.listPolls
);

// Vote on a poll (Student/Staff/TA/Professor) - must come before /:pollId
router.post(
  '/:pollId/vote',
  auth,
  roleCheck('Student', 'Staff', 'TA', 'Professor'),
  pollController.voteOnPoll
);

// Close/complete a poll (EventOffice only) - must come before /:pollId
router.patch(
  '/:pollId/close',
  auth,
  roleCheck('EventOffice', 'Admin'),
  pollController.closePoll
);

// Delete a poll (EventOffice only) - must come before /:pollId GET
router.delete(
  '/:pollId',
  auth,
  roleCheck('EventOffice', 'Admin'),
  pollController.deletePoll
);

// Get a specific poll - must come last
router.get(
  '/:pollId',
  auth,
  pollController.getPoll
);

module.exports = router;

