const User = require('../models/User');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('notifications');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.notifications.sort((a, b) => b.date - a.date);

    user.notifications.forEach(n => { if (!n.read) n.read = true; });
    await user.save();
    return res.status(200).json({
      success: true,
      notifications: user.notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};
