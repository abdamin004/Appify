const express = require('express');
const gymController = require('../controllers/gymController');
// Auth middleware (verifies JWT and attaches req.user)
const auth = require('../middleware/auth');
const router = express.Router();

// post /gym - Create a new gym session (recommended: protect this route with auth middleware)
// Protect the create route so the creating user is available on req.user
router.post('/create', /*auth,*/ gymController.createGymSession);

// PUT /gym/update/:id - Update a gym session (recommended: protect this route with auth middleware)
router.put('/update/:id', /*auth,*/ gymController.updateGymSession);    

// DELETE /gym/delete/:id - Delete a gym session (recommended: protect this route with auth middleware)
router.delete('/delete/:id', /*auth,*/ gymController.deleteGymSession);

// GET /gym - View gym sessions monthly schedule (no auth required)
router.get('/', /*auth,*/ gymController.getMonthlySchedule);

module.exports = router;