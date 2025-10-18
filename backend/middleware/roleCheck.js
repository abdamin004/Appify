/**
 * Simple role authorization middleware.
 *
 * Usage examples:
 *   router.post('/apply', auth, roleCheck('Vendor'), handler)
 *   router.get('/admin',  auth, roleCheck('Admin','Staff'), handler)
 *
 * Reads req.user (set by auth) and infers the effective role:
 *  - Vendor documents => 'Vendor'
 *  - User documents   => req.user.role (e.g., 'Admin','Staff','Student',...)
 *
 * Performs robust, case-insensitive comparison and ignores whitespace/dashes
 * to tolerate values like 'Event Office' vs 'EventOffice'.
 */
module.exports = function roleCheck(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const modelName = req.user.constructor && req.user.constructor.modelName;
      const effectiveRoleRaw = modelName === 'Vendor' ? 'Vendor' : (req.user.role || 'user');

      // Canonicalize roles: lowercase and strip non-alphanumerics (spaces, dashes, etc.)
      const toKey = (v) => (v || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      const effKey = toKey(effectiveRoleRaw);
      const allowedKeys = (allowedRoles || []).map(toKey);

      // If no roles specified, only authentication is required
      if (allowedKeys.length === 0) {
        req.userRole = effKey;
        return next();
      }

      if (!allowedKeys.includes(effKey)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      req.userRole = effKey; // handy if controllers want it
      next();
    } catch (err) {
      return res.status(500).json({ message: 'Role check failed' });
    }
  };
};

