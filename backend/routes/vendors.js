const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck'); // roleCheck('Vendor') etc.
const vendorCtrl = require('../controllers/vendorController');
const vendorUpload = require('../middleware/vendorUpload');

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

// 2.a) List organizations (for vendor to choose which organization applies)
router.get(
  '/organizations',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.listOrganizations
);

// 3) Vendor applies to a specific event (bazaar or booth) by id
router.post(
  '/events/:eventId/applications',
  auth,
  roleCheck('Vendor'),
  vendorUpload,
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

// Cancel a vendor application (only if not paid)
router.post(
  '/vendor-applications/:id/cancel',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.cancelVendorApplication
);

// Delete a cancelled vendor application
router.delete(
  '/vendor-applications/:id',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.deleteVendorApplication
);

// Vendor applies to GUC loyalty program
router.post(
  '/loyalty/apply',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.applyToLoyaltyProgram
);

// List my loyalty applications
router.get(
  '/loyalty/mine',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.listMyLoyaltyApplications
);

// Cancel loyalty application (only vendor who created it)
router.post(
  '/loyalty/:id/cancel',
  auth,
  roleCheck('Vendor'),
  vendorCtrl.cancelLoyaltyApplication
);

router.post(
  '/vendor-documents/upload',
  auth,
  roleCheck('Vendor'),
  vendorUpload,
  vendorCtrl.uploadVendorDocuments
);

// Attendee ID Upload (Post-approval or update)
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const attendeeUploadDir = path.join(__dirname, '..', 'uploads', 'attendees');
if (!fs.existsSync(attendeeUploadDir)) fs.mkdirSync(attendeeUploadDir, { recursive: true });

const attendeeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, attendeeUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `attendee-${req.params.attendeeId}-${Date.now()}${ext}`);
  }
});
const attendeeUpload = multer({ storage: attendeeStorage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post(
  '/applications/:applicationId/attendees/:attendeeId/upload-id',
  auth,
  roleCheck('Vendor'),
  attendeeUpload.single('idDocument'),
  vendorCtrl.uploadAttendeeId
);


module.exports = router;
