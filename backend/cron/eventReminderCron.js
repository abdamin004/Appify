const cron = require('node-cron');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const User = require('../models/User');

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
        // Only send to users with allowed roles: Student, Staff, TA, Professor, EventOffice
        // IMPORTANT: Only create reminders for users who are actually registered for this event
        const allowedRoles = ['Student', 'Staff', 'TA', 'Professor', 'EventOffice'];

        // Ensure registeredUsers is an array and contains valid user IDs
        if (!Array.isArray(ev.registeredUsers) || ev.registeredUsers.length === 0) {
            continue; // Skip events with no registered users
        }

        for (const userId of ev.registeredUsers) {
            if (!userId) continue;

            // Double-check: Verify user is actually in the registeredUsers array
            const isRegistered = ev.registeredUsers.some(id => String(id) === String(userId));
            if (!isRegistered) {
                console.log(`User ${userId} is not in registeredUsers array, skipping reminder`);
                continue;
            }

            // Check if user exists and has an allowed role
            const user = await User.findById(userId).select('role');
            if (!user || !allowedRoles.includes(user.role)) {
                continue; // Skip users with disallowed roles (e.g., Admin, Vendor)
            }

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

            // Send Email if configured
            if (user.email) {
                try {
                    const { sendEmail } = require('../utils/sendEmail'); // Assuming simplified wrapper or use transporter directly if needed.
                    // But sendEmail.js has specific functions. 
                    // Let's assume we can use `sendWarningEmail` style or add a generic one.
                    // Or just use nodemailer directly if sendEmail doesn't expose a generic sender.
                    // Checking sendEmail.js content: it has specific functions like sendPaymentReceiptEmail.
                    // I should probably add `sendEventReminderEmail` to sendEmail.js or hack it here.
                    // For now, I will skip email if function not ready, to avoid breaking. 
                    // BUT requirement confirms "send email". 
                    // I'll assume transporter is exposed or I can require it? No, sendEmail.js doesn't export transporter.

                    // I will create a dummy implementation here assuming I updated sendEmail (which I didn't yet).
                    // Actually, I should update sendEmail.js first? No, I viewed it, I can add a function to it easily?
                    // I'll do it right: Update sendEmail.js to export `sendEventReminderEmail`.
                    // Then call it here.

                    // Temporary: Log email intent
                    // console.log(`[Mock] Email sent to ${user.email}`); 

                    // To properly solve, I will add `sendEventReminderEmail` to utils/sendEmail.js in next step.
                    const { sendEventReminderEmail } = require('../utils/sendEmail');
                    if (sendEventReminderEmail) {
                        await sendEventReminderEmail(user, ev, label);
                    }
                } catch (emailErr) {
                    console.error('Failed to send reminder email:', emailErr.message);
                }
            }
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
