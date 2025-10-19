const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

module.exports = async function auth(req, res, next) {
try {
// 🔍 DEBUG: Check if JWT_SECRET is loaded
//console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'YES' : 'NO');
//console.log(' JWT_SECRET value:', process.env.JWT_SECRET);

const authHeader = req.headers.authorization || '';
let token = null;

if (authHeader && authHeader.startsWith('Bearer ')) {
token = authHeader.split(' ')[1];
//console.log(' Token received:', token.substring(0, 30) + '...');
} else if (req.cookies && req.cookies.token) {
token = req.cookies.token;
//console.log(' Token from cookie:', token.substring(0, 30) + '...');
}

if (!token) {
return res.status(401).json({ success: false, error: 'Authentication token missing' });
}

let payload;
try {
payload = jwt.verify(token, process.env.JWT_SECRET);
//console.log(' Token verified! User ID:', payload.id);
} catch (err) {
console.error(' Token verification failed:', err.message);
return res.status(401).json({ success: false, error: 'Invalid or expired token' });
}

if (!payload || !payload.id) {
return res.status(401).json({ success: false, error: 'Invalid token payload' });
}

let user = await User.findById(payload.id);
if (!user) {
user = await Vendor.findById(payload.id);
}

if (!user) {
console.error(' User not found with ID:', payload.id);
return res.status(401).json({ success: false, error: 'User not found' });
}

//console.log(' User authenticated:', user.email, 'Role:', user.role);
req.user = user;
next();
} catch (err) {
console.error(' Auth middleware error:', err);
res.status(500).json({ success: false, error: 'Authentication failed' });
}
};