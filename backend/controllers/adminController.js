const crypto = require('crypto'); // ye3mel unique email verification token
const bcrypt = require('bcryptjs'); // ashan nhash el password securely
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // mail utility ashan yeb3at verification mail
const Comment = require('../models/Comment');
const VendorApplication = require('../models/VendorApplication');
const Notification = require('../models/Notification');

// admin ye3mel assign lel user role (Staff / TA / Professor) 
// w yeb3at verification email yedous 3aleih el user before ma yetverifi
exports.assignUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body; // extract userId and role from request body

        // validation for required fields
        if (!userId || !role) {
            return res.status(400).json({
                message: 'Both userId and role are required fields.'
            });
        }

        // check if the role is valid
        const validRoles = ['Staff', 'TA', 'Professor'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role '${role}'. Valid roles are: ${validRoles.join(', ')}.`
            });
        }

        // find user in the database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: `No user found with the provided ID (${userId}).`
            });
        }

        // assign the new role and create a verification token
        user.role = role;
        user.isVerified = false; // el user lazem ye verify abl ma yelogin
        user.verificationToken = crypto.randomBytes(32).toString('hex'); // unique random token
        await user.save();

        // create verification link ashan el user yedous 3aleih
        const verifyUrl = `${process.env.FRONTEND_URL}/verify/${user.verificationToken}`;

        // email subject and message
        const subject = 'Verify Your Account';
        const message = `
      <p>Hello ${user.firstName || ''} ${user.lastName || ''},</p>

      <p>Your registration request has been approved, and your role has been set to <strong>${role}</strong>.</p>

      <p>Please verify your account by clicking the link below:</p>
      <p><a href="${verifyUrl}" target="_blank">Verify My Account</a></p>

      <p>Once verified, you will be redirected to the login page.</p>

      <p>Best regards,<br>University Events Management Team</p>
    `;

        // send verification email (object-based, matching your sendEmail.js)
        await sendEmail({
            email: user.email,
            subject,
            message
        });

        // return success response
        return res.status(200).json({
            message: `Role '${role}' assigned successfully. Verification email sent to ${user.email}.`,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        console.error('Error assigning user role:', error);
        return res.status(500).json({
            message: 'Internal Server Error while assigning role.',
            error: error.message
        });
    }
};

exports.createAdminAccount = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        // Basic validation
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Only allow Admin or EventOffice roles
        const allowedRoles = ['Admin', 'EventOffice'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role '${role}'. Only 'Admin' and 'EventOffice' roles can be created.`
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        // Hash password before saving
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new admin/Event Office user (auto-verified)
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            isVerified: true,
            verificationToken: undefined
        });

        return res.status(201).json({
            success: true,
            message: `${role} account created successfully.`,
            user: {
                id: newUser._id,
                name: `${newUser.firstName} ${newUser.lastName}`,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Error creating admin account:', error);
        return res.status(500).json({
            message: 'Internal Server Error while creating admin account.',
            error: error.message
        });
    }
};

exports.deleteAdminAccount = async (req, res) => {
    try {
        const { id } = req.params; // extract user id from the URL

        // Check if the user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Allow deleting only Admin or EventOffice accounts
        if (!['Admin', 'EventOffice'].includes(user.role)) {
            return res.status(403).json({
                message: `Cannot delete user with role '${user.role}'. Only Admin or EventOffice accounts can be deleted.`
            });
        }

        // Delete the user
        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: `${user.role} account (${user.email}) deleted successfully.`,
        });
    } catch (error) {
        console.error('Error deleting admin account:', error);
        res.status(500).json({
            message: 'Internal Server Error while deleting account.',
            error: error.message,
        });
    }
};


exports.blockUser = async (req, res) => {
    try {
        const { id } = req.params;  // Get user ID from URL
        const { action } = req.body; // Expect "block" or "unblock" in request body

        if (!['block', 'unblock'].includes(action)) {
            return res.status(400).json({
                message: "Invalid action. Use 'block' or 'unblock'."
            });//only block or unblock actions allowed
        }

        // Find the user by ID then specify in body if block or unblock action required 
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update block status
        user.isBlocked = action === 'block';
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.email} has been ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`,
            user: {
                id: user._id,
                email: user.email,
                isBlocked: user.isBlocked
            }
        });

    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({
            message: 'Internal Server Error while blocking/unblocking user.',
            error: error.message
        });
    }
};

//by dalet comments by ID 
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params; // Extract comment ID from URL

    //  Check if comment exists
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    //  Delete the comment
    await Comment.findByIdAndDelete(id);

    //  Return success message
    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
      deletedCommentId: id
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      message: 'Internal Server Error while deleting comment.',
      error: error.message
    });
  }
};



// ========== Vendor Applications Review & Notifications ==========

// List all pending vendor applications (for Admin/EventOffice)
exports.listPendingVendorApplications = async (req, res) => {
  try {
    const apps = await VendorApplication.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('event', 'title type startDate endDate location status')
      .populate('organization', 'name')
      .populate('vendorUser', 'email');

    res.status(200).json({ success: true, applications: apps });
  } catch (error) {
    console.error('Error listing pending applications:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Approve or reject a vendor application
// Body: { action: 'approve' | 'reject', notes?: string }
exports.reviewVendorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'" });
    }

    const app = await VendorApplication.findById(id).populate('event', 'title type').populate('organization', 'name');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    app.status = newStatus;
    app.reviewer = req.user._id;
    app.reviewedAt = new Date();
    if (notes) app.notes = notes;
    await app.save();

    // Notify the vendor user
    const notifType = action === 'approve' ? 'VendorApplicationApproved' : 'VendorApplicationRejected';
    const notifMsg = action === 'approve'
      ? `Your application for ${app.event.type} '${app.event.title}' has been approved.`
      : `Your application for ${app.event.type} '${app.event.title}' has been rejected.`;

    try {
      await Notification.create({
        type: notifType,
        message: notifMsg,
        recipientsRoles: ['Vendor'],
        recipientUser: app.vendorUser,
        recipientModel: 'Vendor',
        application: app._id,
        event: app.event._id,
        organization: app.organization._id,
      });
    } catch (notifyErr) {
      console.error('Failed to create vendor notification:', notifyErr?.message || notifyErr);
    }

    res.status(200).json({ success: true, message: `Application ${newStatus}.`, application: app });
  } catch (error) {
    console.error('Error reviewing application:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// List notifications for Admin/EventOffice
// Query: ?unreadOnly=true
exports.listAdminNotifications = async (req, res) => {
  try {
    const unreadOnly = (req.query.unreadOnly || '').toString().toLowerCase() === 'true';
    const filter = { recipientsRoles: { $in: ['Admin', 'EventOffice'] } };
    if (unreadOnly) filter.isRead = false;

    const notifs = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .populate('application', 'status')
      .populate('event', 'title type startDate')
      .populate('organization', 'name');

    res.status(200).json({ success: true, notifications: notifs });
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Mark a single notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json({ success: true, notification: notif });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Mark all admin notifications as read
exports.markAllAdminNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientsRoles: { $in: ['Admin', 'EventOffice'] }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.status(200).json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
