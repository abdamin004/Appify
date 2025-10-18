const Registration = require('../models/Registration');

module.exports = {
  async createInterest(req, res) {
    try {
      const { type, name, email, id, idNumber, eventId } = req.body || {};
      const payload = {
        type,
        name,
        email,
        idNumber: idNumber || id,
      };
      if (req.user && req.user._id) payload.user = req.user._id;
      if (eventId) payload.event = eventId;

      if (!payload.type || !payload.name || !payload.email || !payload.idNumber) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const doc = await Registration.create(payload);
      res.status(201).json({ success: true, message: 'Registration interest saved', registration: doc });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
};

