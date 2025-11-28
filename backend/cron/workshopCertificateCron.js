const cron = require('node-cron');
const Event = require('../models/Event');
const User = require('../models/User');
const { sendCertificateEmail } = require('../utils/sendEmail');

/**
 * Sends certificates for workshops that have finished and still have users
 * who haven't received theirs.
 */
async function processWorkshopCertificates() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // look back 30 days

  const workshops = await Event.find({
    type: 'Workshop',
    startDate: { $lte: now },
    registeredUsers: { $exists: true, $not: { $size: 0 } },
  }).select('title facultyName startDate endDate registeredUsers certificateIssuedUsers status');

  for (const workshop of workshops) {
    const effectiveEnd = workshop.endDate || workshop.startDate;
    if (!effectiveEnd) continue;

    // Only process workshops that ended in the last 30 days and have actually finished
    if (effectiveEnd > now || effectiveEnd < windowStart) continue;

    const issuedSet = new Set((workshop.certificateIssuedUsers || []).map(id => String(id)));
    const recipients = (workshop.registeredUsers || [])
      .map(id => String(id))
      .filter(id => id && !issuedSet.has(id));

    if (!recipients.length) continue;

    const users = await User.find({ _id: { $in: recipients } }).select('firstName lastName email');

    for (const user of users) {
      if (!user?.email) continue;
      try {
        await sendCertificateEmail(user, workshop);
      } catch (err) {
        console.error(`Failed to send certificate for workshop ${workshop._id} to user ${user._id}:`, err?.message || err);
      }
    }

    const updatePayload = {
      $addToSet: { certificateIssuedUsers: { $each: recipients } },
    };
    if (workshop.status === 'published') {
      updatePayload.$set = { status: 'completed' };
    }
    await Event.updateOne({ _id: workshop._id }, updatePayload);
  }
}

module.exports = function startWorkshopCertificateCron() {
  console.log('Workshop certificate cron job scheduled (runs every hour)');

  // Run at minute 20 every hour
  cron.schedule('20 * * * *', async () => {
    try {
      await processWorkshopCertificates();
    } catch (err) {
      console.error('Error running workshop certificate cron job:', err);
    }
  });
};

