const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// User management
router.post('/assign-role', adminController.assignUserRole);
router.post('/create-admin', adminController.createAdminAccount);
router.delete('/delete-admin/:id', adminController.deleteAdminAccount);
router.patch('/block-user/:id', adminController.blockUser);

// NEW: List all users
router.get('/users', auth, roleCheck('Admin', 'EventOffice'), adminController.listAllUsers);

// Comment moderation
router.delete('/delete-comment/:id', adminController.deleteComment);

// Vendor applications review & notifications
router.get(
  '/vendor-applications/pending',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.listPendingVendorApplications
);

router.patch(
  '/vendor-applications/:id/status',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.reviewVendorApplication
);

router.get(
  '/notifications',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.listAdminNotifications
);

router.patch(
  '/notifications/:id/read',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.markNotificationRead
);

router.patch(
  '/notifications/read-all',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.markAllAdminNotificationsRead
);

module.exports = router;