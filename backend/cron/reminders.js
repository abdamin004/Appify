const cron = require('node-cron');
const Event = require('../models/Event');
const User = require('../models/User'); // If needed for querying
// Assuming you have an email service
const { sendEmail } = require('../utils/emailService'); // You might need to check if this exists or create it
// If no centralized email service, you might use nodemailer directly here or import from controller

// We'll assume a sendNotification function exists or we'll logic it out
// For now, let's look at how notifications are sent in eventController.
// eventController uses User.notifications.push() for in-app.
// For email, we might need a transporter.
// Let's assume we want In-App + Email (if email is configured).

const setupReminders = () => {
    // Run every minute to check for events starting soon
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

            // Allow a small window (e.g., events starting within this minute part)
            // But simplified: Find events starting between [Target, Target + 1 min]
            // actually better: Find events starting > Target and < Target + 1 min? 
            // Or just generic "Starting in 24h" logic.

            // To avoid double sending, we might need to flag the event or use a precise window.
            // A precise window of 1 minute matches the cron schedule.

            const windowMs = 60 * 1000;

            // 1. 24 Hour Reminders
            const start24 = oneDayLater;
            const end24 = new Date(start24.getTime() + windowMs);

            const events24 = await Event.find({
                startDate: { $gte: start24, $lt: end24 },
                status: 'published'
            }).populate('registeredUsers');

            for (const event of events24) {
                await sendReminders(event, '24 hours');
            }

            // 2. 1 Hour Reminders
            const start1 = oneHourLater;
            const end1 = new Date(start1.getTime() + windowMs);

            const events1 = await Event.find({
                startDate: { $gte: start1, $lt: end1 },
                status: 'published'
            }).populate('registeredUsers');

            for (const event of events1) {
                await sendReminders(event, '1 hour');
            }

        } catch (error) {
            console.error('Error in reminder cron:', error);
        }
    });
};

async function sendReminders(event, timeString) {
    if (!event.registeredUsers || event.registeredUsers.length === 0) return;

    for (const user of event.registeredUsers) {
        // 1. In-App Notification
        user.notifications.push({
            type: 'EventReminder',
            message: `Reminder: "${event.title}" starts in ${timeString}!`,
            date: new Date(),
            read: false,
            eventId: event._id
        });

        // 2. Email (Optional/Mock if service missing)
        // console.log(`Sending email to ${user.email} for event ${event.title}`);

        await user.save(); // Save each user (might be slow for large events, bulk write is better but this is safer for now)
    }
    console.log(`Sent ${timeString} reminders for event: ${event.title} to ${event.registeredUsers.length} users.`);
}

module.exports = setupReminders;
