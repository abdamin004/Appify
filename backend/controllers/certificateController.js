const Workshop = require('../models/Workshop');
const User = require('../models/User');
const { sendCertificateEmail } = require('../utils/sendEmail');

exports.sendCertificate = async (req, res) => {
    try {
        const { workshopId, userId } = req.body;

        const workshop = await Workshop.findById(workshopId);
        if (!workshop) {
            return res.status(404).json({ message: 'Workshop not found' });
        }

        // Check if user attended (or is registered)
        // Assuming 'registeredUsers' contains the user
        // Ideally we should have an 'attended' status, but for now we check registration
        const isRegistered = (workshop.registeredUsers || []).some(id => String(id) === String(userId));
        if (!isRegistered) {
            return res.status(400).json({ message: 'User not registered for this workshop' });
        }

        const now = new Date();
        const effectiveEnd = workshop.endDate || workshop.startDate;
        if (!effectiveEnd || effectiveEnd > now) {
            return res.status(400).json({ message: 'Workshop has not finished yet' });
        }

        const alreadyIssued = (workshop.certificateIssuedUsers || []).some(id => String(id) === String(userId));
        if (alreadyIssued) {
            return res.status(400).json({ message: 'Certificate already sent to this user' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await sendCertificateEmail(user, workshop);
        const updatePayload = { $addToSet: { certificateIssuedUsers: user._id } };
        if (workshop.status === 'published') {
            updatePayload.$set = { status: 'completed' };
        }
        await Workshop.updateOne({ _id: workshop._id }, updatePayload);

        res.status(200).json({ message: 'Certificate sent successfully' });
    } catch (error) {
        console.error('Error sending certificate:', error);
        res.status(500).json({ message: 'Failed to send certificate' });
    }
};
