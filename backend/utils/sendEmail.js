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
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your email",
    html: `
      <h3>Welcome ${user.firstName}!</h3>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyURL}">${verifyURL}</a>
    `,
  });
};

const sendWarningEmail = async (user,comment) => {
  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Warning for abusive comment",
    html: `
      <h3>Warning for abusive comment</h3>
      <p>You have been warned for abusive comment. Please be careful next time. If you continue to abuse the platform, you will be banned.</p>
      <p>Comment: ${comment}</p>

    `,
  });
};

const sendGymSessionCancellationEmail = async (user, gymSession) => {
  const sessionDate = gymSession.startDate ? new Date(gymSession.startDate).toLocaleString() : 'TBA';
  const sessionType = gymSession.sessionType || 'Gym Session';
  
  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Gym Session Cancelled: ${gymSession.title || sessionType}`,
    html: `
      <h3>Gym Session Cancelled</h3>
      <p>Dear ${user.firstName || 'User'},</p>
      <p>We regret to inform you that the following gym session has been cancelled:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Session:</strong> ${gymSession.title || sessionType}</p>
        <p><strong>Type:</strong> ${sessionType}</p>
        <p><strong>Date:</strong> ${sessionDate}</p>
        ${gymSession.instructor ? `<p><strong>Instructor:</strong> ${gymSession.instructor}</p>` : ''}
      </div>
      <p>We apologize for any inconvenience this may cause. Please check our platform for other available gym sessions.</p>
      <p>Thank you for your understanding.</p>
      <p>Best regards,<br>Appify Events Team</p>
    `,
  });
};

const sendGymSessionUpdateEmail = async (user, gymSession, changes) => {
  const sessionDate = gymSession.startDate ? new Date(gymSession.startDate).toLocaleString() : 'TBA';
  const sessionType = gymSession.sessionType || 'Gym Session';
  
  let changesList = '';
  if (changes.length > 0) {
    changesList = '<ul style="margin: 10px 0; padding-left: 20px;">';
    changes.forEach(change => {
      changesList += `<li>${change}</li>`;
    });
    changesList += '</ul>';
  }
  
  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Gym Session Updated: ${gymSession.title || sessionType}`,
    html: `
      <h3>Gym Session Updated</h3>
      <p>Dear ${user.firstName || 'User'},</p>
      <p>The following gym session has been updated:</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Session:</strong> ${gymSession.title || sessionType}</p>
        <p><strong>Type:</strong> ${sessionType}</p>
        <p><strong>Date:</strong> ${sessionDate}</p>
        ${gymSession.instructor ? `<p><strong>Instructor:</strong> ${gymSession.instructor}</p>` : ''}
        ${gymSession.location ? `<p><strong>Location:</strong> ${gymSession.location}</p>` : ''}
      </div>
      ${changes.length > 0 ? `<p><strong>Changes made:</strong></p>${changesList}` : ''}
      <p>Please review the updated details and make sure you're still able to attend.</p>
      <p>Thank you for your attention.</p>
      <p>Best regards,<br>Appify Events Team</p>
    `,
  });
};

const sendVendorApplicationApprovalEmail = async (vendor, application, event) => {
  const eventDate = event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA';
  const eventLocation = event.location || 'TBA';
  
  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: vendor.email,
    subject: `Application Approved: ${event.type} - ${event.title}`,
    html: `
      <h3>Application Approved!</h3>
      <p>Dear ${vendor.companyName || 'Vendor'},</p>
      <p>Congratulations! Your application to participate in the following event has been <strong style="color: #10b981;">approved</strong>:</p>
      <div style="background-color: #f0fdf4; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Event Type:</strong> ${event.type}</p>
        <p><strong>Event Title:</strong> ${event.title}</p>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Location:</strong> ${eventLocation}</p>
        <p><strong>Organization:</strong> ${application.organization}</p>
        <p><strong>Booth Size:</strong> ${application.boothSize}</p>
        ${application.setupLocation ? `<p><strong>Setup Location:</strong> ${application.setupLocation}</p>` : ''}
        ${application.setupDurationWeeks ? `<p><strong>Setup Duration:</strong> ${application.setupDurationWeeks} week(s)</p>` : ''}
      </div>
      ${application.notes ? `<p><strong>Notes from reviewer:</strong> ${application.notes}</p>` : ''}
      <p>We look forward to your participation. Please prepare accordingly and arrive on time.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Appify Events Team</p>
    `,
  });
};

const sendVendorApplicationRejectionEmail = async (vendor, application, event) => {
  const eventDate = event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA';
  
  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: vendor.email,
    subject: `Application Status: ${event.type} - ${event.title}`,
    html: `
      <h3>Application Status Update</h3>
      <p>Dear ${vendor.companyName || 'Vendor'},</p>
      <p>We regret to inform you that your application to participate in the following event has been <strong style="color: #dc2626;">rejected</strong>:</p>
      <div style="background-color: #fef2f2; border: 1px solid #dc2626; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Event Type:</strong> ${event.type}</p>
        <p><strong>Event Title:</strong> ${event.title}</p>
        <p><strong>Date:</strong> ${eventDate}</p>
        <p><strong>Organization:</strong> ${application.organization}</p>
        <p><strong>Booth Size:</strong> ${application.boothSize}</p>
      </div>
      ${application.notes ? `<p><strong>Reason/Notes:</strong> ${application.notes}</p>` : '<p>Unfortunately, we are unable to accommodate your application at this time.</p>'}
      <p>We appreciate your interest and encourage you to apply for future events.</p>
      <p>If you have any questions or would like more information, please don't hesitate to contact us.</p>
      <p>Best regards,<br>Appify Events Team</p>
    `,
  });
};

module.exports = { 
  sendVerificationEmail, 
  sendWarningEmail,
  sendGymSessionCancellationEmail,
  sendGymSessionUpdateEmail,
  sendVendorApplicationApprovalEmail,
  sendVendorApplicationRejectionEmail
};
