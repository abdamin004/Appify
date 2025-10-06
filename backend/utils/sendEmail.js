const nodemailer = require('nodemailer');
const sendEmail = async (options) => {
  // Create a transporter
    const transporter = nodemailer.createTransport({ // hanesta5dem el gmail as our email service provider
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const mailOptions = {
    from: `University Events <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message
  };
   await transporter.sendMail(mailOptions);
};
module.exports = sendEmail;