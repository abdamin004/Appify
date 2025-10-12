const express = require('express');
const courtController = require('../controllers/courtController');

const router = express.Router();

// GET /courts - Retrieve all courts
router.get('/', courtController.getAllCourts);



module.exports = router;