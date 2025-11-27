const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// User management
router.put('/assign-role', adminController.assignUserRole);
router.post('/create-admin', adminController.createAdminAccount);
router.delete('/delete-admin/:id', adminController.deleteAdminAccount);
router.patch('/block-user/:id', adminController.blockUser);
// List comments
router.get('/comments', auth, roleCheck('Admin', 'EventOffice'), adminController.listAllComments);

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

router.patch(
  '/loyalty-applications/:id/status',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.reviewLoyaltyApplication
);

router.get(
  '/notifications/unread-count',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.getUnreadNotificationsCount
);

router.get(
  '/notifications',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.listAdminNotifications
);

router.patch(
  '/notifications/read-all',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.markAllAdminNotificationsRead
);

router.patch(
  '/notifications/:id/read',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.markNotificationRead
);

router.delete(
  '/notifications/:id',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.deleteNotification
);

// Get attendees report
router.get(
  '/reports/attendees',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.getAttendeesReport
);

// Get sales report
router.get(
  '/reports/sales',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.getSalesReport
);

// Get vendor documents for approved bazaar/booth applications
router.get(
  '/vendor-documents',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.getVendorDocuments
);

// Download/view specific vendor document
router.get(
  '/vendor-documents/:vendorId/:documentType',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.downloadVendorDocument
);

// Loyalty applications management
router.get(
  '/loyalty-applications',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.listLoyaltyApplications
);

router.patch(
  '/loyalty-applications/:id/status',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.reviewLoyaltyApplication
);

// Export event registrations to Excel
router.get(
  '/events/:eventId/export-registrations',
  auth,
  roleCheck('Admin', 'EventOffice'),
  adminController.exportEventRegistrations
);

module.exports = router;