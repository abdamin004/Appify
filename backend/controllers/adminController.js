const crypto = require('crypto'); // ye3mel unique email verification token
const bcrypt = require('bcryptjs'); // ashan nhash el password securely
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // mail utility ashan yeb3at verification mail
const Comment = require('../models/Comment');

// admin ye3mel assign lel user role (Staff / TA / Professor) 
// w yeb3at verification email yedous 3aleih el user before ma yetverifi
exports.assignUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body; // extract userId and role from request body

        // validation for required fields
        if (!userId || !role) {
            return res.status(400).json({
                message: 'Both userId and role are required fields.'
            });
        }

        // check if the role is valid
        const validRoles = ['Staff', 'TA', 'Professor'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role '${role}'. Valid roles are: ${validRoles.join(', ')}.`
            });
        }

        // find user in the database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: `No user found with the provided ID (${userId}).`
            });
        }

        // assign the new role and create a verification token
        user.role = role;
        user.isVerified = false; // el user lazem ye verify abl ma yelogin
        user.verificationToken = crypto.randomBytes(32).toString('hex'); // unique random token
        await user.save();

        // create verification link ashan el user yedous 3aleih
        const verifyUrl = `${process.env.FRONTEND_URL}/verify/${user.verificationToken}`;

        // email subject and message
        const subject = 'Verify Your Account';
        const message = `
      <p>Hello ${user.firstName || ''} ${user.lastName || ''},</p>

      <p>Your registration request has been approved, and your role has been set to <strong>${role}</strong>.</p>

      <p>Please verify your account by clicking the link below:</p>
      <p><a href="${verifyUrl}" target="_blank">Verify My Account</a></p>

      <p>Once verified, you will be redirected to the login page.</p>

      <p>Best regards,<br>University Events Management Team</p>
    `;

        // send verification email (object-based, matching your sendEmail.js)
        await sendEmail({
            email: user.email,
            subject,
            message
        });

        // return success response
        return res.status(200).json({
            message: `Role '${role}' assigned successfully. Verification email sent to ${user.email}.`,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        console.error('Error assigning user role:', error);
        return res.status(500).json({
            message: 'Internal Server Error while assigning role.',
            error: error.message
        });
    }
};

exports.createAdminAccount = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        // Basic validation
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Only allow Admin or EventOffice roles
        const allowedRoles = ['Admin', 'EventOffice'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: `Invalid role '${role}'. Only 'Admin' and 'EventOffice' roles can be created.`
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email.' });
        }

        // Hash password before saving
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new admin/Event Office user (auto-verified)
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            isVerified: true,
            verificationToken: undefined
        });

        return res.status(201).json({
            success: true,
            message: `${role} account created successfully.`,
            user: {
                id: newUser._id,
                name: `${newUser.firstName} ${newUser.lastName}`,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Error creating admin account:', error);
        return res.status(500).json({
            message: 'Internal Server Error while creating admin account.',
            error: error.message
        });
    }
};

exports.deleteAdminAccount = async (req, res) => {
    try {
        const { id } = req.params; // extract user id from the URL

        // Check if the user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Allow deleting only Admin or EventOffice accounts
        if (!['Admin', 'EventOffice'].includes(user.role)) {
            return res.status(403).json({
                message: `Cannot delete user with role '${user.role}'. Only Admin or EventOffice accounts can be deleted.`
            });
        }

        // Delete the user
        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: `${user.role} account (${user.email}) deleted successfully.`,
        });
    } catch (error) {
        console.error('Error deleting admin account:', error);
        res.status(500).json({
            message: 'Internal Server Error while deleting account.',
            error: error.message,
        });
    }
};


exports.blockUser = async (req, res) => {
    try {
        const { id } = req.params;  // Get user ID from URL
        const { action } = req.body; // Expect "block" or "unblock" in request body

        if (!['block', 'unblock'].includes(action)) {
            return res.status(400).json({
                message: "Invalid action. Use 'block' or 'unblock'."
            });//only block or unblock actions allowed
        }

        // Find the user by ID then specify in body if block or unblock action required 
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Update block status
        user.isBlocked = action === 'block';
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.email} has been ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`,
            user: {
                id: user._id,
                email: user.email,
                isBlocked: user.isBlocked
            }
        });

    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({
            message: 'Internal Server Error while blocking/unblocking user.',
            error: error.message
        });
    }
};

//by dalet comments by ID 
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params; // Extract comment ID from URL

    //  Check if comment exists
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    //  Delete the comment
    await Comment.findByIdAndDelete(id);

    //  Return success message
    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
      deletedCommentId: id
    });

  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      message: 'Internal Server Error while deleting comment.',
      error: error.message
    });
  }
};



