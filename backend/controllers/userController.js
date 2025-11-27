const User = require('../models/User');
const Notification = require('../models/Notification');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Get notifications from Notification model (system-wide notifications with per-user status)
    const notifications = await Notification.find({
      $or: [
        { recipientsRoles: { $in: [userRole] } },
        { recipientUser: userId }
      ]
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

    // Also get user-specific notifications from User model (legacy support)
    const user = await User.findById(userId).select('notifications');
    const userNotifications = user?.notifications || [];
    userNotifications.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    // Combine both notification sources
    const allNotifications = [
      ...filteredNotifications.map(n => ({
        ...n,
        source: 'system'
      })),
      ...userNotifications.map(n => ({
        ...n,
        source: 'user',
        isRead: n.read || false
      }))
    ].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateB - dateA;
    });

    return res.status(200).json({
      success: true,
      notifications: allNotifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    
    // Check if user has permission to see this notification
    const userRole = req.user.role;
    const isRecipient = notif.recipientsRoles.includes(userRole) || 
                       (notif.recipientUser && String(notif.recipientUser) === String(userId));
    
    if (!isRecipient) {
      return res.status(403).json({ message: 'You do not have permission to access this notification' });
    }
    
    // Check if user status already exists
    const userStatusIndex = notif.userStatus.findIndex(s => String(s.userId) === String(userId));
    const now = new Date();
    
    if (userStatusIndex >= 0) {
      // Update existing user status
      notif.userStatus[userStatusIndex].isRead = true;
      notif.userStatus[userStatusIndex].readAt = now;
      notif.userStatus[userStatusIndex].isDeleted = false;
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

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const notif = await Notification.findById(id);
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    
    // Check if user has permission to see this notification
    const userRole = req.user.role;
    const isRecipient = notif.recipientsRoles.includes(userRole) || 
                       (notif.recipientUser && String(notif.recipientUser) === String(userId));
    
    if (!isRecipient) {
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
