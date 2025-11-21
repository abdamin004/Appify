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

      // Check if user is a Vendor - multiple detection methods
      const modelName = req.user.constructor && req.user.constructor.modelName;
      
      // Method 1: Check modelName
      // Method 2: Check if it has companyName (vendors always have this, users don't)
      // Method 3: Check collection name
      // Method 4: Check role field (vendors have role='Vendor' by default)
      const hasCompanyName = req.user.companyName !== undefined && req.user.companyName !== null;
      const hasFirstName = req.user.firstName !== undefined && req.user.firstName !== null;
      const collectionName = req.user.collection && req.user.collection.name;
      
      const isVendorModel = modelName === 'Vendor' || 
                           collectionName === 'vendors' ||
                           (hasCompanyName && !hasFirstName) || // Vendors have companyName but no firstName
                           (hasCompanyName && req.user.role === 'Vendor') || // Vendor with role field
                           (req.user.role && req.user.role.toLowerCase() === 'vendor'); // Case-insensitive role check
      
      const effectiveRoleRaw = isVendorModel ? 'Vendor' : (req.user.role || 'user');
      
      // Debug logging (remove in production)
      if (process.env.NODE_ENV !== 'production' && allowedRoles.includes('Vendor')) {
        console.log('[RoleCheck] Vendor detection:', {
          modelName,
          collectionName,
          hasCompanyName,
          hasFirstName,
          userRole: req.user.role,
          isVendorModel,
          effectiveRoleRaw,
          allowedRoles
        });
      }

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
        // Enhanced error message for debugging
        console.error('Role check failed:', {
          effectiveRole: effKey,
          allowedRoles: allowedKeys,
          modelName,
          hasCompanyName,
          hasFirstName,
          userRole: req.user.role,
          collectionName
        });
        return res.status(403).json({ 
          message: 'Forbidden',
          debug: process.env.NODE_ENV !== 'production' ? {
            effectiveRole: effKey,
            allowedRoles: allowedKeys,
            userModel: modelName,
            userRole: req.user.role
          } : undefined
        });
      }

      req.userRole = effKey; // handy if controllers want it
      next();
    } catch (err) {
      return res.status(500).json({ message: 'Role check failed' });
    }
  };
};

