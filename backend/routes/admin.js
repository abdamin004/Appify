const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/assign-role', adminController.assignUserRole);
router.post('/create-admin', adminController.createAdminAccount);//create ay admin or events office account
router.delete('/delete-admin/:id', adminController.deleteAdminAccount);//delete ay admin or events office account by id
router.patch('/block-user/:id', adminController.blockUser);//block (or unblock) any user by id
router.delete('/delete-comment/:id', adminController.deleteComment);// Delete inappropriate comment


module.exports = router;
