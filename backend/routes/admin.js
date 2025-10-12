const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/assign-role', adminController.assignUserRole);
router.post('/create-admin', adminController.createAdminAccount);//create ay admin or events office account
router.delete('/delete-admin/:id', adminController.deleteAdminAccount);//delete ay admin or events office account by id
router.patch('/block-user/:id', adminController.blockUser);//block (or unblock) any user by id
router.delete('/delete-comment/:id', adminController.deleteComment);// Delete inappropriate comment


module.exports = router;

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
