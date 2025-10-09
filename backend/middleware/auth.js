const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

/**
 * Auth middleware - verifies JWT from Authorization header or cookie and attaches user to req.user
 * Expects token signed with process.env.JWT_SECRET and payload { id }
 */
module.exports = async function auth(req, res, next) {
  try {
    // Check Authorization header: 'Bearer <token>'
    const authHeader = req.headers.authorization || '';
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // fallback to cookie named `token` if available
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication token missing' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    if (!payload || !payload.id) {
      return res.status(401).json({ success: false, error: 'Invalid token payload' });
    }

    // Try to find a user first, then vendor
    let user = await User.findById(payload.id);
    if (!user) {
      user = await Vendor.findById(payload.id);
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // attach user to request (exclude sensitive fields are already excluded by schema select:false)
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};
