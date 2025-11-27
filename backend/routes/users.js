const express = require('express');
const router = express.Router();
const { getMyNotifications, markNotificationRead, deleteNotification } = require('../controllers/userController');
const auth = require('../middleware/auth');

// GET /users/me/notifications
router.get('/me/notifications', auth, getMyNotifications);

// PATCH /users/me/notifications/:id/read
router.patch('/me/notifications/:id/read', auth, markNotificationRead);

// DELETE /users/me/notifications/:id
router.delete('/me/notifications/:id', auth, deleteNotification);

module.exports = router;
