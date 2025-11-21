const express = require('express');
const router = express.Router();
const { getMyNotifications } = require('../controllers/userController');
const auth = require('../middleware/auth');

// GET /users/me/notifications
router.get('/me/notifications', auth, getMyNotifications);

module.exports = router;
