const User = require('../models/User');
const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken'); // da el JSON Web Token library eli byet3mel beha el authentication
const crypto = require('crypto'); // da el crypto library eli byestakhdem fe hashing w encryption
const sendEmail = require('../utils/sendEmail');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Enforce institutional email for Users (not Vendors)
function isGucEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return parts[1] === 'guc.edu.eg';
}

function isStudentEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return parts[1] === 'student.guc.edu.eg';
}

// el route da by handle el POST request eli gaya 3ala /signup/user w by call el signupUser function eli fel authController
// @desc    Signup lel User (Student / Staff / TA / Professor)
// @route   POST /api/auth/signup/user
// @access  Public
exports.signupUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, studentStaffId } = req.body;

    const roleLower = String(role || '').trim().toLowerCase();
    const roleCanonical =
      roleLower === 'student' ? 'Student' :
      roleLower === 'staff' ? 'Staff' :
      roleLower === 'ta' ? 'TA' :
      roleLower === 'professor' ? 'Professor' :
      roleLower === 'admin' ? 'Admin' :
      roleLower === 'eventoffice' ? 'EventOffice' : (role || '');

    // Validation 3ashan n2kd en kol el fields mwgoda
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Enforce domain by role (case-insensitive)
    if (roleLower === 'student') {
      if (!isStudentEmail(email)) {
        return res.status(400).json({ message: 'Students must use @student.guc.edu.eg email to sign up' });
      }
    } else {
      if (!isGucEmail(email)) {
        return res.status(400).json({ message: 'Please use your @guc.edu.eg email to sign up' });
      }
    }

    // Check law el user mwgod abl kda
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // generate random verification token 3ashan el email verification
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create el user fe el database
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: roleCanonical,
      studentStaffId,
      verificationToken,
      isVerified: true // el Student byakhod email verification, el ba2y byestanno admin approval
    });

    

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email for verification.'
      });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// el route da by handle el POST request eli gaya 3ala /signup/vendor w by call el signupVendor function eli fel authController
// @desc    Signup lel Vendor
// @route   POST /api/auth/signup/vendor
// @access  Public
exports.signupVendor = async (req, res) => {
  try {
    const { email, password, companyName } = req.body;

    // Validation 3ashan n2kd en kol el fields mwgoda
    if (!email || !password || !companyName) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check law el vendor mwgod abl kda
    const vendorExists = await Vendor.findOne({ email });
    if (vendorExists) {
      return res.status(400).json({ message: 'Vendor already exists with this email' });
    }

    // Create el vendor fe el database
    const vendor = await Vendor.create({
      email,
      password,
      companyName
    });

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully',
      vendorId: vendor._id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login (User aw Vendor)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation 3ashan n2kd en el email w el password mwgodeen
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // awel haga n7awl nla2y user fe collection el Users
    let user = await User.findOne({ email }).select('+password');
    let isVendor = false;

    // law malainash user, nshof fe collection el Vendors
    if (!user) {
      user = await Vendor.findOne({ email }).select('+password');
      isVendor = true;
    }

    // law lesa malainash, el credentials ghlt
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // n3ml check 3ala el password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // check law el user et7zr (blocked)
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Please contact admin.' });
    }

    // check law el user verified (for users bs, msh vendors)
    if (!isVendor && !user.isVerified) {
      return res.status(403).json({ 
        message: user.role === 'Student' 
          ? 'Please verify your email before logging in.' 
          : 'Your account is pending admin approval.'
      });
    }

    // Enforce domain by role for Users (not Vendors)
    if (!isVendor) {
      const userRoleLower = String(user.role || '').toLowerCase();
      if (userRoleLower === 'student') {
        if (!isStudentEmail(email)) {
          return res.status(403).json({ message: 'Students must sign in with @student.guc.edu.eg email.' });
        }
      } else {
        if (!isGucEmail(email)) {
          return res.status(403).json({ message: 'Please use your @guc.edu.eg email to sign in.' });
        }
      }
    }

    // generate el JWT token
    const token = generateToken(user._id);

    // response elly byrga3 ll frontend
    if(isVendor) {
      res.json({
        success: true,
        token,
        vendor: {
          id: user._id,
          email: user.email,
          companyName: user.companyName,
          isBlocked: user.isBlocked,
          role: 'Vendor'
        }
      });
    } else {
      res.json({
        success: true,
        token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        isVerified: user.isVerified
      }
    });
  }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify el email b el token
// @route   GET /api/auth/verify/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // nshof law el token da mwgod fel database
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // n3ml verify ll user
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ 
      success: true,
      message: 'Email verified successfully. You can now login.' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout el user
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  // fe JWT system el logout bykoon mn el frontend (by delete el token)
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
};
