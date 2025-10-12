const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck'); // roleCheck('Vendor') etc.
const vendorCtrl = require('../controllers/vendorController');

// 1) Vendor can view upcoming bazaars (published, future)
router.get(
  '/bazaars/upcoming',
  auth,
  roleCheck('Vendor', 'Admin', 'Staff'),
  vendorCtrl.listUpcomingBazaars
);

// 2) Vendor can view upcoming booths in platform (also Events)
router.get(
  '/booths/upcoming',
  auth,
  roleCheck('Vendor', 'Admin', 'Staff'),
  vendorCtrl.listUpcomingBooths
);

// 3) Vendor applies to a specific event (bazaar or booth) by id
router.post(
  '/events/:eventId/applications',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.applyToEvent
);

// 4) Vendor lists their own applications
router.get(
  '/applications/mine',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.listMyApplications
);

// 5) Vendor approved + upcoming (participating) applications
router.get(
  '/applications/participating/upcoming',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.listUpcomingParticipating
);

// 6) pending|rejected + upcoming (requests)
router.get(
  '/applications/requests/upcoming',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.listUpcomingRequests
);

module.exports = router;
