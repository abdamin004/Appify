// Simple role authorization middleware.
// Usage: roleCheck('Vendor', 'Admin') returns a middleware
// that allows requests only if the authenticated principal
// (set by auth middleware) matches one of the allowed roles.

module.exports = function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // Infer role: Vendors are a separate model without a role field.
      // Users (students/staff/admin) store a role string on the document.
      const modelName = req.user.constructor && req.user.constructor.modelName;
      const inferredRole = modelName === 'Vendor' ? 'Vendor' : req.user.role;

      if (!allowedRoles.length || allowedRoles.includes(inferredRole)) {
        return next();
      }
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Role check failed' });
    }
  };
};
/**
 * roleCheck(...allowedRoles)
 *
 * Usage examples:
 *   router.post('/apply', auth, roleCheck('Vendor'), handler)
 *   router.get('/admin',  auth, roleCheck('Admin','Staff'), handler)
 *
 * Reads req.user (set by auth) and infers the effective role:
 *  - Vendor documents => 'Vendor'
 *  - User documents   => req.user.role (e.g., 'Admin','Staff','Student',...)
 * Blocks with 403 if the role isn't allowed.
 */
module.exports = function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const modelName = req.user.constructor && req.user.constructor.modelName;
    let effectiveRole;

    if (modelName === 'Vendor') {
      effectiveRole = 'Vendor';
    } else {
      effectiveRole = (req.user.role || 'User').toString().trim();
    }

    // If no roles specified, just require authentication
    if (!allowedRoles || allowedRoles.length === 0) {
      req.userRole = effectiveRole;
      return next();
    }

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.userRole = effectiveRole; // handy if controllers want it
    next();
  };
};

