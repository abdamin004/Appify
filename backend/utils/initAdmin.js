const User = require('../models/User');

/**
 * Ensure at least one admin or event office account exists.
 * Uses env vars DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_FIRSTNAME, DEFAULT_ADMIN_LASTNAME, DEFAULT_ADMIN_ROLE
 */
module.exports = async function initAdmin() {
  try {
    const existing = await User.findOne({ role: { $in: ['Admin', 'EventOffice'] } });
    if (existing) {
      console.log('✅ Admin/EventOffice account already exists:', existing.email);
      return;
    }

    const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@guc.edu.eg';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    const firstName = process.env.DEFAULT_ADMIN_FIRSTNAME || 'Default';
    const lastName = process.env.DEFAULT_ADMIN_LASTNAME || 'Admin';
    const role = process.env.DEFAULT_ADMIN_ROLE || 'Admin';

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      isVerified: true
    });

    console.log('✅ Default admin created:', email, 'role:', role);
    console.log('⚠️  Please change the default password immediately in production.');
  } catch (err) {
    console.error('Failed to initialize default admin:', err && err.message ? err.message : err);
  }
};
