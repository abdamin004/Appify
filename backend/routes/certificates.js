const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const auth = require('../middleware/auth');

// Only admin or staff should probably trigger this, or maybe the user themselves if completed?
// For now, let's allow authenticated users (maybe restricted to admin/staff in real app)
// or maybe the user requests their own certificate?
// The requirement says "receive ... upon finishing".
// Let's assume an admin triggers it or it's automated.
// I'll protect it with auth.

router.post('/send', auth, certificateController.sendCertificate);

module.exports = router;
