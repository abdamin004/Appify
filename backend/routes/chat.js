const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload && payload.id) {
          let user = await User.findById(payload.id);
          let isVendor = false;
          if (!user) {
            user = await Vendor.findById(payload.id);
            isVendor = !!user;
          }
          if (user) {
            if (isVendor && !user.role) {
              user.role = 'Vendor';
            }
            req.user = user;
          }
        }
      } catch (err) {
        // Token invalid, but continue without user
        console.log('Optional auth: Invalid token, continuing as guest');
      }
    }
    next();
  } catch (err) {
    // Continue even on error
    next();
  }
};

// Send chat message (authentication optional - allows guest users)
router.post('/message', optionalAuth, chatController.sendMessage);

module.exports = router;

