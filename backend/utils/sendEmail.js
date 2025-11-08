const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (user, token) => {
  // Construct backend URL - use BACKEND_URL if set, otherwise construct from PORT
  const backendUrl = `http://localhost:5001`;
  const verifyURL = `${backendUrl}/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: `"Your App" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your email",
    html: `
      <h3>Welcome ${user.firstName}!</h3>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyURL}">${verifyURL}</a>
    `,
  });
};

module.exports = { sendVerificationEmail };
