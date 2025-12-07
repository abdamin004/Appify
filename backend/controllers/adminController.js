const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const User = require('../models/User');
const Event = require('../models/Event');
const Trip = require('../models/Trip');
const Vendor = require('../models/Vendor');
const LoyaltyApplication = require('../models/LoyaltyApplication');
const { sendVerificationEmail, sendWarningEmail, sendVendorApplicationApprovalEmail, sendVendorApplicationRejectionEmail } = require('../utils/sendEmail');
const Comment = require('../models/Comment');
const VendorApplication = require('../models/VendorApplication');
const Notification = require('../models/Notification');
const BlackoutDate = require('../models/BlackoutDate');

// List all users with optional filtering
exports.listAllUsers = async (req, res) => {
  try {
    const { role, isVerified, isBlocked, search } = req.query;
    const filter = {};

    if (role) filter.role = role;

    if (isVerified !== undefined) {
      filter.isVerified = isVerified === 'true';
    }

    if (isBlocked !== undefined) {
      filter.isBlocked = isBlocked === 'true';
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Map users to include verificationTokenSent flag (without exposing the actual token)
    const usersWithStatus = users.map(user => {
      const userObj = user.toObject();
      // Include flag indicating if verification email was sent (token exists)
      userObj.verificationTokenSent = !!userObj.verificationToken;
      // Remove the actual token from response for security
      delete userObj.verificationToken;
      return userObj;
    });

    res.status(200).json({
      success: true,
      count: usersWithStatus.length,
      users: usersWithStatus
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      message: 'Error fetching users',
      error: error.message
    });
  }
};

exports.assignUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        message: 'Both userId and role are required fields.'
      });
    }

    const validRoles = ['Student', 'Staff', 'TA', 'Professor', 'Admin', 'EventOffice'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role '${role}'. Valid roles are: ${validRoles.join(', ')}.`
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: `No user found with the provided ID (${userId}).`
      });
    }

    const previousRole = user.role;
    user.role = role;

    // For Staff, TA, and Professor: generate verification token and send email after admin approval
    // Students get email on signup, so no need to send again
    // Admin and EventOffice don't need email verification
    const rolesRequiringEmailVerification = ['Staff', 'TA', 'Professor'];
    let emailSent = false;
    let message = '';

    if (rolesRequiringEmailVerification.includes(role)) {
      // Check if verification email was already sent (token exists) AND role hasn't changed
      // If role changed, allow sending new verification email for the new role
      if (user.verificationToken && previousRole === role) {
        // Email already sent for this role, don't resend - return error
        return res.status(400).json({
          message: `Verification email was already sent to ${user.email} for role '${role}'. User must verify their email first before a new verification email can be sent.`,
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            verificationTokenSent: true
          }
        });
      } else {
        // Either no token exists, or role changed - generate new token and send email
        if (previousRole !== role && user.verificationToken) {
          // Role changed, clear old token
          user.verificationToken = undefined;
        }
        // Generate new verification token and send email
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        // Don't set isVerified to true yet - user needs to verify email first
        user.isVerified = false;

        await user.save();

        // Send verification email
        try {
          await sendVerificationEmail(user, verificationToken);
          emailSent = true;
          message = `Role '${role}' assigned successfully. Verification email sent to ${user.email}.`;
        } catch (emailError) {
          console.error('Error sending verification email:', emailError);
          message = `Role '${role}' assigned successfully, but failed to send verification email. Please try again.`;
          // Continue even if email fails
        }
      }
    } else if (role === 'Student') {
      // For Students: they already got email on signup, just keep their current verification status
      // Don't change isVerified or verificationToken - let them verify via email they already received
      await user.save();
      message = `Role '${role}' assigned successfully.`;
    } else {
      // For Admin and EventOffice, verify immediately without email
      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();
      message = `Role '${role}' assigned successfully.`;
    }

    return res.status(200).json({
      message: message,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        verificationTokenSent: emailSent || !!user.verificationToken
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

// ✅ FIXED: Removed manual hashing
exports.createAdminAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const allowedRoles = ['Admin', 'EventOffice'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role '${role}'. Only 'Admin' and 'EventOffice' roles can be created.`
      });
    }

    // Enforce GUC email for these roles
    const emailLower = (email || '').toLowerCase();
    if (!emailLower.endsWith('@guc.edu.eg')) {
      return res.status(400).json({
        message: 'Please use a GUC email when creating Admin/EventOffice accounts.'
      });
    }

    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // ✅ FIXED: Pass plain password, let User model pre-save hook hash it
    const newUser = await User.create({
      firstName,
      lastName,
      email: emailLower,
      password,  // Plain text - will be hashed by pre-save hook
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
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!['Admin', 'EventOffice'].includes(user.role)) {
      return res.status(403).json({
        message: `Cannot delete user with role '${user.role}'. Only Admin or EventOffice accounts can be deleted.`
      });
    }

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
    const { id } = req.params;
    const { action } = req.body;

    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({
        message: "Invalid action. Use 'block' or 'unblock'."
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

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

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id).populate('user', 'email firstName lastName');

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    // Store user and content before deletion
    const user = comment.user;
    const commentContent = comment.content;

    // Delete the comment
    await Comment.findByIdAndDelete(id);

    // Send warning email with the populated user (don't fail if email fails)
    if (user && user.email) {
      try {
        await sendWarningEmail(user, commentContent);
      } catch (emailError) {
        console.error('Failed to send warning email:', emailError);
        // Continue even if email fails - comment is already deleted
      }
    } else {
      console.warn('Could not send warning email: user not found or missing email');
    }

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

exports.reviewVendorApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'" });
    }

    // Populate vendorUser to get email and companyName, and event to get full details
    const app = await VendorApplication.findById(id)
      .populate('event', 'title type startDate endDate location')
      .populate('vendorUser', 'email companyName');

    if (!app) return res.status(404).json({ message: 'Application not found' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    app.status = newStatus;
    app.reviewer = req.user._id;
    app.reviewedAt = new Date();
    if (notes) app.notes = notes;

    // If approving, calculate participation fee and set payment deadline
    if (action === 'approve') {
      const { calculateParticipationFee } = require('../utils/paymentCalculator');
      app.participationFee = calculateParticipationFee(app, app.event);
      // Payment deadline is 3 days after approval
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3);
      app.paymentDeadline = deadline;
      app.paid = false; // Reset payment status
      app.paidAt = undefined;
    }

    await app.save();

    const notifType = action === 'approve' ? 'VendorApplicationApproved' : 'VendorApplicationRejected';
    const notifMsg = action === 'approve'
      ? `Your application for ${app.event.type} '${app.event.title}' has been approved.`
      : `Your application for ${app.event.type} '${app.event.title}' has been rejected.`;

    // Create notification
    try {
      await Notification.create({
        type: notifType,
        message: notifMsg,
        recipientsRoles: ['Vendor'],
        recipientUser: app.vendorUser,
        recipientModel: 'Vendor',
        application: app._id,
        event: app.event._id,
        // organization is a String in VendorApplication, but Notification expects ObjectId, so we omit it
      });
    } catch (notifyErr) {
      console.error('Failed to create vendor notification:', notifyErr?.message || notifyErr);
    }

    // Send email notification to vendor
    if (app.vendorUser && app.vendorUser.email) {
      try {
        if (action === 'approve') {
          await sendVendorApplicationApprovalEmail(app.vendorUser, app, app.event);
        } else {
          await sendVendorApplicationRejectionEmail(app.vendorUser, app, app.event);
        }
      } catch (emailError) {
        console.error('Failed to send vendor application email:', emailError);
        // Don't fail the whole operation if email fails
      }
    } else {
      console.warn('Vendor user or email not found for application:', id);
    }

    res.status(200).json({ success: true, message: `Application ${newStatus}.`, application: app });
  } catch (error) {
    console.error('Error reviewing application:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.reviewLoyaltyApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body || {};

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action. Use 'approve' or 'reject'." });
    }

    const application = await LoyaltyApplication.findById(id)
      .populate('vendorUser', 'companyName email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Loyalty application not found.' });
    }

    if (application.status === 'approved' && action === 'approve') {
      return res.status(200).json({ success: true, message: 'Application already approved.', application });
    }
    if (application.status === 'rejected' && action === 'reject') {
      return res.status(200).json({ success: true, message: 'Application already rejected.', application });
    }
    if (application.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot review a cancelled loyalty application.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    application.status = newStatus;
    await application.save();

    if (newStatus === 'approved') {
      const orgName = application.organization || application.vendorUser?.companyName || 'A vendor';
      const discountInfo = typeof application.discountRate === 'number'
        ? `${application.discountRate}%`
        : 'a special';
      const promoInfo = application.promoCode ? ` Use code ${application.promoCode}.` : '';

      try {
        await Notification.create({
          type: 'LoyaltyPartnerAdded',
          message: `${orgName} has joined the GUC loyalty program offering ${discountInfo} off.${promoInfo}`,
          recipientsRoles: ['Student', 'Staff', 'TA', 'Professor', 'Vendor'],
          organization: application.organization || undefined
        });
      } catch (notifyErr) {
        console.error('Failed to create loyalty partner notification:', notifyErr?.message || notifyErr);
      }
    }

    res.status(200).json({
      success: true,
      message: `Loyalty application ${newStatus}.`,
      application
    });
  } catch (error) {
    console.error('Error reviewing loyalty application:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
  }
};


// Get unread notifications count for admins
exports.getUnreadNotificationsCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const pendingOnly = (req.query.pendingOnly || '').toString().toLowerCase() === 'true';

    const filter = {
      recipientsRoles: { $in: ['Admin', 'EventOffice'] },
      $or: [
        { 'userStatus.userId': { $ne: userId } },
        { 'userStatus': { $elemMatch: { userId: userId, isDeleted: false, isRead: false } } },
        { 'userStatus': { $size: 0 } }
      ]
    };

    // Exclude notifications deleted by this user
    filter.$and = [
      {
        $or: [
          { 'userStatus': { $size: 0 } },
          { 'userStatus': { $not: { $elemMatch: { userId: userId, isDeleted: true } } } }
        ]
      }
    ];

    // If pendingOnly is true, only count VendorApplicationSubmitted notifications
    if (pendingOnly) {
      filter.type = 'VendorApplicationSubmitted';
    }

    const notifications = await Notification.find(filter);

    // Filter by user status in memory for accurate count
    const unreadCount = notifications.filter(notif => {
      const userStatus = notif.userStatus?.find(s => String(s.userId) === String(userId));
      if (userStatus?.isDeleted) return false;
      if (!userStatus) return true; // New notification, not read
      return !userStatus.isRead;
    }).length;

    res.status(200).json({
      success: true,
      unreadCount,
      pendingVendorRequests: pendingOnly ? unreadCount : undefined
    });
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    // Check if user status already exists
    const userStatusIndex = notif.userStatus.findIndex(s => String(s.userId) === String(userId));
    const now = new Date();

    if (userStatusIndex >= 0) {
      // Update existing user status
      notif.userStatus[userStatusIndex].isRead = true;
      notif.userStatus[userStatusIndex].readAt = now;
      notif.userStatus[userStatusIndex].isDeleted = false; // Restore if previously deleted
      notif.userStatus[userStatusIndex].deletedAt = undefined;
    } else {
      // Create new user status
      notif.userStatus.push({
        userId: userId,
        isRead: true,
        readAt: now,
        isDeleted: false
      });
    }

    await notif.save();

    res.status(200).json({ success: true, notification: notif });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

exports.markAllAdminNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Find all notifications for Admin/EventOffice that are not deleted by this user
    const notifications = await Notification.find({
      recipientsRoles: { $in: ['Admin', 'EventOffice'] },
      $or: [
        { 'userStatus': { $size: 0 } },
        { 'userStatus': { $not: { $elemMatch: { userId: userId, isDeleted: true } } } }
      ]
    });

    let updatedCount = 0;

    for (const notif of notifications) {
      const userStatusIndex = notif.userStatus.findIndex(s => String(s.userId) === String(userId));

      if (userStatusIndex >= 0) {
        // Update existing user status
        if (!notif.userStatus[userStatusIndex].isRead) {
          notif.userStatus[userStatusIndex].isRead = true;
          notif.userStatus[userStatusIndex].readAt = now;
          notif.userStatus[userStatusIndex].isDeleted = false;
          notif.userStatus[userStatusIndex].deletedAt = undefined;
          updatedCount++;
        }
      } else {
        // Create new user status
        notif.userStatus.push({
          userId: userId,
          isRead: true,
          readAt: now,
          isDeleted: false
        });
        updatedCount++;
      }

      await notif.save();
    }

    res.status(200).json({ success: true, updated: updatedCount });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// List notifications for the current user (Admin/EventOffice)
exports.listAdminNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Find notifications for Admin/EventOffice roles
    const notifications = await Notification.find({
      recipientsRoles: { $in: ['Admin', 'EventOffice'] }
    })
      .populate('application', 'organization vendorUser event')
      .populate('event', 'title type startDate endDate')
      .sort({ createdAt: -1 });

    // Filter by user status - exclude deleted, include all others
    const filteredNotifications = notifications
      .filter(notif => {
        const userStatus = notif.userStatus?.find(s => String(s.userId) === String(userId));
        return !userStatus || !userStatus.isDeleted;
      })
      .map(notif => {
        const userStatus = notif.userStatus?.find(s => String(s.userId) === String(userId));
        return {
          ...notif.toObject(),
          isRead: userStatus?.isRead || false,
          readAt: userStatus?.readAt || null
        };
      });

    res.status(200).json({
      success: true,
      count: filteredNotifications.length,
      notifications: filteredNotifications
    });
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Delete a notification for the current user (soft delete - per user)
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    // Check if user has permission to see this notification
    const userRole = req.user.role;
    if (!notif.recipientsRoles.includes(userRole)) {
      return res.status(403).json({ message: 'You do not have permission to delete this notification' });
    }

    // Check if user status already exists
    const userStatusIndex = notif.userStatus.findIndex(s => String(s.userId) === String(userId));
    const now = new Date();

    if (userStatusIndex >= 0) {
      // Update existing user status
      notif.userStatus[userStatusIndex].isDeleted = true;
      notif.userStatus[userStatusIndex].deletedAt = now;
    } else {
      // Create new user status with deleted flag
      notif.userStatus.push({
        userId: userId,
        isRead: false,
        isDeleted: true,
        deletedAt: now
      });
    }

    await notif.save();

    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// List all comments with user name and event title (admin only)
exports.listAllComments = async (req, res) => {
  try {
    const comments = await Comment.find()
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName email')
      .populate('event', 'title type');

    res.status(200).json({ success: true, count: comments.length, comments });
  } catch (error) {
    console.error('Error listing comments:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// Get attendees report - total number of attendees in events
exports.getAttendeesReport = async (req, res) => {
  try {
    const { status, type, startDate, endDate, title, eventName } = req.query;

    // Build filter
    const filter = {};

    // Filter by status
    if (status) filter.status = status;

    // Filter by event type
    if (type) filter.type = type;

    // Filter by event name/title (case-insensitive partial match)
    const searchName = title || eventName;
    if (searchName) {
      filter.title = { $regex: searchName, $options: 'i' };
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    // Get all events matching the filter
    const events = await Event.find(filter)
      .select('title type status startDate endDate location capacity registeredUsers')
      .populate('registeredUsers', 'firstName lastName email')
      .sort({ startDate: -1 });

    // Calculate statistics
    let totalAttendees = 0;
    let totalEvents = events.length;
    const eventsByType = {};
    const eventDetails = [];

    events.forEach(event => {
      const attendeeCount = event.registeredUsers ? event.registeredUsers.length : 0;
      totalAttendees += attendeeCount;

      // Group by event type
      if (!eventsByType[event.type]) {
        eventsByType[event.type] = {
          type: event.type,
          totalEvents: 0,
          totalAttendees: 0,
          events: []
        };
      }
      eventsByType[event.type].totalEvents++;
      eventsByType[event.type].totalAttendees += attendeeCount;

      // Event details
      const eventDetail = {
        eventId: event._id,
        title: event.title,
        type: event.type,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        capacity: event.capacity || 0,
        attendeeCount: attendeeCount,
        utilizationRate: event.capacity > 0
          ? ((attendeeCount / event.capacity) * 100).toFixed(2) + '%'
          : 'N/A',
        isFull: event.capacity > 0 && attendeeCount >= event.capacity
      };

      eventDetails.push(eventDetail);
      eventsByType[event.type].events.push(eventDetail);
    });

    // Convert eventsByType object to array
    const breakdownByType = Object.values(eventsByType);

    // Calculate average attendees per event
    const averageAttendeesPerEvent = totalEvents > 0
      ? (totalAttendees / totalEvents).toFixed(2)
      : 0;

    // Find events with highest attendance
    const topEvents = [...eventDetails]
      .sort((a, b) => b.attendeeCount - a.attendeeCount)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      report: {
        filters: {
          status: status || null,
          type: type || null,
          title: searchName || null,
          startDate: startDate || null,
          endDate: endDate || null
        },
        summary: {
          totalEvents: totalEvents,
          totalAttendees: totalAttendees,
          averageAttendeesPerEvent: parseFloat(averageAttendeesPerEvent)
        },
        breakdownByType: breakdownByType,
        topEvents: topEvents,
        allEvents: eventDetails,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating attendees report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get sales report - revenue from different events
exports.getSalesReport = async (req, res) => {
  try {
    const { status, type, startDate, endDate, title, eventName, sortBy, sortOrder } = req.query;

    // Pricing configuration for vendor booths (can be moved to config file)
    const BOOTH_PRICING = {
      '2x2': 500,  // $500 for 2x2 booth
      '4x4': 1000  // $1000 for 4x4 booth
    };

    // Build filter for events
    const eventFilter = {};
    if (status) eventFilter.status = status;
    if (type) eventFilter.type = type;
    const searchName = title || eventName;
    if (searchName) {
      eventFilter.title = { $regex: searchName, $options: 'i' };
    }
    if (startDate || endDate) {
      eventFilter.startDate = {};
      if (startDate) eventFilter.startDate.$gte = new Date(startDate);
      if (endDate) eventFilter.startDate.$lte = new Date(endDate);
    }

    // Validate sort parameters
    const validSortOrders = ['asc', 'desc', 'ascending', 'descending'];
    const sortDirection = validSortOrders.includes(sortOrder?.toLowerCase())
      ? sortOrder.toLowerCase()
      : 'desc'; // default to descending (highest revenue first)

    // Normalize sort direction
    const isAscending = sortDirection === 'asc' || sortDirection === 'ascending';

    // Get all events matching the filter
    const events = await Event.find(eventFilter)
      .select('title type status startDate endDate location registeredUsers')
      .sort({ startDate: -1 });

    // Calculate Trip revenue from actual payments
    const Payment = require('../models/Payment');

    // 1. Find all relevant Trip events first
    const tripEventQuery = { type: 'Trip' };
    if (type) tripEventQuery.type = type; // Redundant if hardcoded limit, but good for safety
    if (status) tripEventQuery.status = status;
    if (searchName) tripEventQuery.title = { $regex: searchName, $options: 'i' };
    if (startDate) tripEventQuery.startDate = { $gte: new Date(startDate) };
    if (endDate) tripEventQuery.startDate = { ...tripEventQuery.startDate, $lte: new Date(endDate) };

    const tripEvents = await Event.find(tripEventQuery).lean();
    const tripEventIds = tripEvents.map(e => e._id);

    // 2. Find all payments for these events
    const tripPayments = await Payment.find({
      event: { $in: tripEventIds },
      status: 'paid',
      method: { $in: ['wallet', 'card'] }
    }).populate('user', 'firstName lastName email').lean();

    // 3. Map events to revenue
    const tripDetails = tripEvents.map(event => {
      const eventPayments = tripPayments.filter(p => String(p.event) === String(event._id));
      const revenue = eventPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        eventId: event._id,
        title: event.title,
        type: event.type,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        price: event.price || 0,
        attendeeCount: event.registeredUsers ? event.registeredUsers.length : 0,
        revenue: revenue,
        payments: eventPayments.map(p => ({
          paymentId: p._id,
          user: p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Unknown',
          email: p.user ? p.user.email : '',
          amount: Number(p.amount || 0),
          date: p.createdAt,
          method: p.method
        }))
      };
    });

    const tripRevenue = tripDetails.reduce((sum, item) => sum + item.revenue, 0);


    // Calculate Workshop revenue from actual payments
    const Workshop = require('../models/Workshop');

    // 1. Find all relevant Workshop events
    const workshopEventQuery = { type: 'Workshop' };
    if (type) workshopEventQuery.type = type;
    if (status) workshopEventQuery.status = status;
    if (searchName) workshopEventQuery.title = { $regex: searchName, $options: 'i' };
    if (startDate) workshopEventQuery.startDate = { $gte: new Date(startDate) };
    if (endDate) workshopEventQuery.startDate = { ...workshopEventQuery.startDate, $lte: new Date(endDate) };

    const workshopEvents = await Event.find(workshopEventQuery).lean();
    const workshopEventIds = workshopEvents.map(e => e._id);

    // 2. Find payments
    const workshopPayments = await Payment.find({
      event: { $in: workshopEventIds },
      status: 'paid',
      method: { $in: ['wallet', 'card'] }
    }).populate('user', 'firstName lastName email').lean();

    // 3. Map events
    const workshopDetails = workshopEvents.map(event => {
      const eventPayments = workshopPayments.filter(p => String(p.event) === String(event._id));
      const revenue = eventPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      return {
        eventId: event._id,
        title: event.title,
        type: event.type,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        requiredBudget: event.requiredBudget || 0,
        capacity: event.capacity || 0,
        fundingSource: event.fundingSource || '',
        payments: eventPayments.map(p => ({
          paymentId: p._id,
          user: p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Unknown',
          email: p.user ? p.user.email : '',
          amount: Number(p.amount || 0),
          date: p.createdAt,
          method: p.method
        })),
        totalRevenue: revenue,
        attendeeCount: event.registeredUsers ? event.registeredUsers.length : 0
      };
    });

    const workshopRevenue = workshopDetails.reduce((sum, item) => sum + item.totalRevenue, 0);

    const workshopRevenueByEventArray = workshopDetails;

    // Calculate Vendor Application revenue (booth fees for paid applications)
    const vendorAppFilter = {};
    if (startDate || endDate) {
      vendorAppFilter.createdAt = {};
      if (startDate) vendorAppFilter.createdAt.$gte = new Date(startDate);
      if (endDate) vendorAppFilter.createdAt.$lte = new Date(endDate);
    }

    // Only count paid and approved applications
    vendorAppFilter.paid = true;
    vendorAppFilter.status = 'approved';

    const vendorApplications = await VendorApplication.find(vendorAppFilter)
      .populate('event', 'title type status startDate endDate location')
      .sort({ createdAt: -1 });

    let vendorRevenue = 0;
    const vendorDetails = [];
    const vendorRevenueByEvent = {};

    vendorApplications.forEach(app => {
      if (!app.event) return; // Skip if event is deleted

      // Apply event filters if specified
      if (type && app.event.type !== type) return;
      if (status && app.event.status !== status) return;
      if (searchName && !app.event.title.toLowerCase().includes(searchName.toLowerCase())) return;
      if (startDate && new Date(app.event.startDate) < new Date(startDate)) return;
      if (endDate && new Date(app.event.startDate) > new Date(endDate)) return;

      const boothPrice = BOOTH_PRICING[app.boothSize] || 0;
      vendorRevenue += boothPrice;

      const eventKey = String(app.event._id);
      if (!vendorRevenueByEvent[eventKey]) {
        vendorRevenueByEvent[eventKey] = {
          eventId: app.event._id,
          title: app.event.title,
          type: app.event.type,
          status: app.event.status,
          startDate: app.event.startDate,
          endDate: app.event.endDate,
          location: app.event.location,
          applications: [],
          totalRevenue: 0
        };
      }

      vendorRevenueByEvent[eventKey].applications.push({
        applicationId: app._id,
        organization: app.organization,
        boothSize: app.boothSize,
        price: boothPrice
      });
      vendorRevenueByEvent[eventKey].totalRevenue += boothPrice;

      vendorDetails.push({
        applicationId: app._id,
        eventId: app.event._id,
        eventTitle: app.event.title,
        eventType: app.event.type,
        organization: app.organization,
        boothSize: app.boothSize,
        price: boothPrice,
        paid: app.paid,
        status: app.status
      });
    });

    // Convert vendorRevenueByEvent to array
    const vendorRevenueByEventArray = Object.values(vendorRevenueByEvent);

    // Calculate totals
    const totalRevenue = tripRevenue + vendorRevenue + workshopRevenue;
    const totalTripEvents = tripDetails.length;
    const totalVendorApplications = vendorDetails.length;
    const totalWorkshopPayments = workshopDetails.length;

    // Revenue breakdown by event type
    const revenueByType = {};

    tripDetails.forEach(trip => {
      if (!revenueByType[trip.type]) {
        revenueByType[trip.type] = { type: trip.type, revenue: 0, count: 0 };
      }
      revenueByType[trip.type].revenue += trip.revenue;
      revenueByType[trip.type].count++;
    });

    vendorRevenueByEventArray.forEach(event => {
      if (!revenueByType[event.type]) {
        revenueByType[event.type] = { type: event.type, revenue: 0, count: 0 };
      }
      revenueByType[event.type].revenue += event.totalRevenue;
      revenueByType[event.type].count += event.applications.length;
    });

    workshopRevenueByEventArray.forEach(event => {
      if (!revenueByType[event.type]) {
        revenueByType[event.type] = { type: event.type, revenue: 0, count: 0 };
      }
      revenueByType[event.type].revenue += event.totalRevenue;
      revenueByType[event.type].count += event.attendeeCount;
    });

    const revenueByTypeArray = Object.values(revenueByType);

    // Top revenue events (combining trips, workshops, and vendor events)
    let allRevenueEvents = [
      ...tripDetails.map(t => ({ ...t, source: 'Trip' })),
      ...workshopRevenueByEventArray.map(w => ({
        eventId: w.eventId,
        title: w.title,
        type: w.type,
        status: w.status,
        startDate: w.startDate,
        endDate: w.endDate,
        location: w.location,
        revenue: w.totalRevenue,
        source: 'Workshop',
        attendeeCount: w.attendeeCount
      })),
      ...vendorRevenueByEventArray.map(v => ({
        eventId: v.eventId,
        title: v.title,
        type: v.type,
        status: v.status,
        startDate: v.startDate,
        endDate: v.endDate,
        location: v.location,
        revenue: v.totalRevenue,
        source: 'Vendor',
        applicationCount: v.applications.length
      }))
    ];

    // Sort by revenue based on sortOrder parameter
    if (sortBy === 'revenue' || !sortBy) {
      allRevenueEvents.sort((a, b) => {
        return isAscending
          ? a.revenue - b.revenue  // ascending (least to greatest)
          : b.revenue - a.revenue;  // descending (greatest to least)
      });
    }

    // Apply limit for top events (only if not sorting, or if explicitly requested)
    if (!sortBy || sortBy === 'revenue') {
      allRevenueEvents = allRevenueEvents.slice(0, 10);
    }

    // Sort trip details by revenue
    if (sortBy === 'revenue' || !sortBy) {
      tripDetails.sort((a, b) => {
        return isAscending
          ? a.revenue - b.revenue
          : b.revenue - a.revenue;
      });
    }

    // Sort vendor revenue by event revenue
    if (sortBy === 'revenue' || !sortBy) {
      vendorRevenueByEventArray.sort((a, b) => {
        return isAscending
          ? a.totalRevenue - b.totalRevenue
          : b.totalRevenue - a.totalRevenue;
      });
    }

    // Sort workshop revenue by event revenue
    if (sortBy === 'revenue' || !sortBy) {
      workshopRevenueByEventArray.sort((a, b) => {
        return isAscending
          ? a.totalRevenue - b.totalRevenue
          : b.totalRevenue - a.totalRevenue;
      });
    }

    res.status(200).json({
      success: true,
      report: {
        filters: {
          status: status || null,
          type: type || null,
          title: searchName || null,
          startDate: startDate || null,
          endDate: endDate || null,
          sortBy: sortBy || 'revenue',
          sortOrder: sortDirection
        },
        summary: {
          totalRevenue: totalRevenue,
          tripRevenue: tripRevenue,
          vendorRevenue: vendorRevenue,
          workshopRevenue: workshopRevenue,
          totalTripEvents: totalTripEvents,
          totalVendorApplications: totalVendorApplications,
          totalWorkshopPayments: totalWorkshopPayments
        },
        revenueByType: revenueByTypeArray,
        tripRevenue: {
          total: tripRevenue,
          events: tripDetails
        },
        workshopRevenue: {
          total: workshopRevenue,
          events: workshopRevenueByEventArray,
          payments: workshopDetails
        },
        vendorRevenue: {
          total: vendorRevenue,
          events: vendorRevenueByEventArray,
          applications: vendorDetails
        },
        topRevenueEvents: allRevenueEvents,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Get vendor documents for approved bazaar/booth applications
exports.getVendorDocuments = async (req, res) => {
  try {
    const { eventId, organization, vendorId } = req.query;

    // Build filter for approved vendor applications to Bazaar or Booth events
    const appFilter = {
      status: 'approved',
      event: { $exists: true }
    };

    if (eventId) appFilter.event = eventId;
    if (organization) appFilter.organization = { $regex: organization, $options: 'i' };
    if (vendorId) appFilter.vendorUser = vendorId;

    // Get approved vendor applications
    const applications = await VendorApplication.find(appFilter)
      .populate('event', 'title type startDate endDate location status')
      .populate('vendorUser', 'companyName email taxCardUrl logoUrl')
      .sort({ createdAt: -1 });

    // Filter to only Bazaar and Booth events
    const filteredApplications = applications.filter(app =>
      app.event && (app.event.type === 'Bazaar' || app.event.type === 'Booth')
    );

    // Format response with vendor documents
    const vendorDocuments = filteredApplications.map(app => ({
      applicationId: app._id,
      event: {
        id: app.event._id,
        title: app.event.title,
        type: app.event.type,
        startDate: app.event.startDate,
        endDate: app.event.endDate,
        location: app.event.location,
        status: app.event.status
      },
      vendor: {
        id: app.vendorUser._id,
        companyName: app.vendorUser.companyName,
        email: app.vendorUser.email,
        taxCardUrl: app.vendorUser.taxCardUrl || null,
        logoUrl: app.vendorUser.logoUrl || null,
        taxCardAvailable: !!app.vendorUser.taxCardUrl,
        logoAvailable: !!app.vendorUser.logoUrl
      },
      organization: app.organization,
      boothSize: app.boothSize,
      attendees: app.attendees || [],
      setupDurationWeeks: app.setupDurationWeeks,
      setupLocation: app.setupLocation,
      paid: app.paid,
      createdAt: app.createdAt
    }));

    res.status(200).json({
      success: true,
      count: vendorDocuments.length,
      vendorDocuments: vendorDocuments
    });
  } catch (error) {
    console.error('Error fetching vendor documents:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Download/view a specific vendor document
exports.downloadVendorDocument = async (req, res) => {
  try {
    const { vendorId, documentType } = req.params;

    if (!['taxCard', 'logo'].includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type. Use "taxCard" or "logo"'
      });
    }

    // Get vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get document URL
    const documentUrl = documentType === 'taxCard' ? vendor.taxCardUrl : vendor.logoUrl;

    if (!documentUrl) {
      return res.status(404).json({
        success: false,
        message: `${documentType === 'taxCard' ? 'Tax card' : 'Logo'} not found for this vendor`
      });
    }

    // Construct full file path
    const filePath = path.join(__dirname, '..', documentUrl);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document file not found on server'
      });
    }

    // Get file extension to set appropriate content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };

    // Check if download is requested (via query parameter)
    const shouldDownload = req.query.download === 'true';

    // Get filename for download
    const filename = `${vendor.companyName || 'vendor'}_${documentType}${ext}`;
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers - use 'attachment' for download, 'inline' for viewing
    res.setHeader('Content-Type', contentType);
    if (shouldDownload) {
      // Force download
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    } else {
      // View in browser
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading vendor document:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// List loyalty applications (with optional status filter)
exports.listLoyaltyApplications = async (req, res) => {
  try {
    const { status } = req.query; // pending, approved, rejected, or undefined (all)

    const filter = status ? { status } : {};

    const applications = await LoyaltyApplication.find(filter)
      .populate('vendorUser', 'email companyName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Error listing loyalty applications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Export registered users for an event to Excel
exports.exportEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId)
      .populate('registeredUsers', 'firstName lastName email role studentStaffId')
      .select('title type startDate endDate location registeredUsers');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Exclude conferences as per requirement
    if (event.type === 'Conference') {
      return res.status(400).json({
        success: false,
        message: 'Cannot export registrations for Conference events'
      });
    }

    const registeredUsers = event.registeredUsers || [];

    if (registeredUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No registered users found for this event'
      });
    }

    // Prepare Excel data
    const excelData = registeredUsers.map((user, index) => ({
      'No.': index + 1,
      'First Name': user.firstName || '',
      'Last Name': user.lastName || '',
      'Full Name': `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      'Email': user.email || '',
      'Role': user.role || '',
      'Student/Staff ID': user.studentStaffId || ''
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 5 },   // No.
      { wch: 15 },  // First Name
      { wch: 15 },  // Last Name
      { wch: 25 },  // Full Name
      { wch: 30 },  // Email
      { wch: 15 },  // Role
      { wch: 18 }   // Student/Staff ID
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Users');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename
    const filename = `${event.title.replace(/[^a-z0-9]/gi, '_')}_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');

    // Send the Excel file
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting event registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};

// Review (approve/reject) a loyalty application
exports.reviewLoyaltyApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    const application = await LoyaltyApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Loyalty application not found'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Application is already ${application.status}`
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    application.status = newStatus;
    application.notes = notes || '';
    application.reviewedAt = new Date();
    application.reviewedBy = req.user.id; // Assuming req.user is set by auth middleware

    await application.save();

    res.status(200).json({
      success: true,
      message: `Application ${newStatus} successfully`,
      application
    });
  } catch (error) {
    console.error('Error reviewing loyalty application:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: error.message
    });
  }
};
// =========================
// System-wide blackout dates
// =========================

// Create a blackout date
// POST /api/admin/blackout-dates
exports.createBlackoutDate = async (req, res) => {
  try {
    const { name, reason, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'name, startDate and endDate are required',
      });
    }

    const blackout = new BlackoutDate({
      name: name.trim(),
      reason: reason || '',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      active: true,
      createdBy: req.user._id,
    });

    await blackout.save();

    return res.status(201).json({
      success: true,
      message: 'Blackout date created successfully',
      data: blackout,
    });
  } catch (error) {
    console.error('Error in createBlackoutDate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create blackout date',
      error: error.message,
    });
  }
};

// Get blackout dates (optionally filter by ?active=true/false)
// GET /api/admin/blackout-dates
exports.getBlackoutDates = async (req, res) => {
  try {
    const { active } = req.query;
    const filter = {};

    if (active === 'true') {
      filter.active = true;
    } else if (active === 'false') {
      filter.active = false;
    }

    const blackoutDates = await BlackoutDate.find(filter).sort({
      startDate: 1,
    });

    return res.status(200).json({
      success: true,
      data: blackoutDates,
    });
  } catch (error) {
    console.error('Error in getBlackoutDates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch blackout dates',
      error: error.message,
    });
  }
};

// Update a blackout date
// PUT /api/admin/blackout-dates/:id
exports.updateBlackoutDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, reason, startDate, endDate, active } = req.body;

    const blackout = await BlackoutDate.findById(id);
    if (!blackout) {
      return res.status(404).json({
        success: false,
        message: 'Blackout date not found',
      });
    }

    if (name !== undefined) blackout.name = name;
    if (reason !== undefined) blackout.reason = reason;
    if (startDate !== undefined) blackout.startDate = new Date(startDate);
    if (endDate !== undefined) blackout.endDate = new Date(endDate);
    if (active !== undefined) blackout.active = !!active;

    await blackout.save();

    return res.status(200).json({
      success: true,
      message: 'Blackout date updated successfully',
      data: blackout,
    });
  } catch (error) {
    console.error('Error in updateBlackoutDate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update blackout date',
      error: error.message,
    });
  }
};

// Delete a blackout date
// DELETE /api/admin/blackout-dates/:id
exports.deleteBlackoutDate = async (req, res) => {
  try {
    const { id } = req.params;

    const blackout = await BlackoutDate.findById(id);
    if (!blackout) {
      return res.status(404).json({
        success: false,
        message: 'Blackout date not found',
      });
    }

    await blackout.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Blackout date deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteBlackoutDate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete blackout date',
      error: error.message,
    });
  }
};
