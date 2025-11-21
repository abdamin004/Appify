const cron = require('node-cron');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

/**
 * Helper to avoid duplicate reminders for the same user + event + type
 */
async function reminderExists(userId, eventId, type) {
    return Notification.exists({
        recipientUser: userId,
        recipientModel: 'User',
        event: eventId,
        type
    });
}

/**
 * Core logic to send reminders for events that start in about X hours.
 * type: 'EventReminder1Day' or 'EventReminder1Hour'
 * label: for message text (e.g. '1 day before', '1 hour before')
 */
async function sendRemindersForOffset(offsetHours, type, label) {
    const now = new Date();

    // We will look at all future published events with registered users
    const events = await Event.find({
        status: 'published',
        startDate: { $gt: now },
        registeredUsers: { $exists: true, $not: { $size: 0 } }
    }).select('title startDate registeredUsers');

    for (const ev of events) {
        if (!ev.startDate) continue;

        const diffMs = new Date(ev.startDate) - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Trigger when diffHours is roughly equal to offsetHours,
        // with a small window so it works with the 5-min cron schedule.
        // Example: 24h reminder -> between 23.7 and 24.3 hours.
        const lowerBound = offsetHours - 0.3;
        const upperBound = offsetHours + 0.3;

        if (diffHours < lowerBound || diffHours > upperBound) {
            continue;
        }

        // For each registered user, create a notification if not already created
        for (const userId of ev.registeredUsers) {
            if (!userId) continue;

            const exists = await reminderExists(userId, ev._id, type);
            if (exists) continue; // avoid duplicates

            await Notification.create({
                type, // 'EventReminder1Day' or 'EventReminder1Hour'
                message: `Reminder (${label}): "${ev.title}" starts at ${new Date(ev.startDate).toLocaleString()}.`,
                event: ev._id,
                recipientUser: userId,
                recipientModel: 'User'
                // recipientsRoles is intentionally empty for per-user reminders
            });
        }
    }
}

module.exports = function startEventReminderCron() {
    console.log('Event reminder cron job scheduled (runs every 5 minutes)');

    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        try {
            // 24-hour reminders
            await sendRemindersForOffset(24, 'EventReminder1Day', '1 day before');

            // 1-hour reminders
            await sendRemindersForOffset(1, 'EventReminder1Hour', '1 hour before');
        } catch (err) {
            console.error('Error running event reminder cron job:', err);
        }
    });
};
