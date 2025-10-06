const express = require('express');
const router = express.Router(); // this line creates a new router object that can be used in handling routes like app object
const authController = require('../controllers/authController');

router.post('/signup/user', authController.signupUser);//el method da by handle el post request eli gaya 3ala /signup/user w by call el signupUser function eli fel authController
router.post('/signup/vendor', authController.signupVendor);//el method da by handle el post request eli gaya 3ala /signup/vendor w by call el signupVendor function eli fel authController
router.post('/login', authController.login);//el method da by handle el post request eli gaya 3ala /login w by call el login function eli fel authController
router.get('/verify/:token', authController.verifyEmail);//el method da by handle el get request eli gaya 3ala /verify/:token w by call el verifyEmail function eli fel authController
router.post('/logout', authController.logout);//el method da by handle el post request eli gaya 3ala /logout w by call el logout function eli fel authController
module.exports = router; // exporting the router object so it can be used in other files like server.js