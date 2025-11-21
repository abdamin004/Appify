const nodemailer = require("nodemailer");

// Prefer explicit SMTP host/port if provided; fallback to Gmail service
let transporter;
try {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 0);
  const secure = String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (host && port) {
    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  } else {
    transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }
} catch (e) {
  console.error('Failed to configure mail transporter:', e?.message || e);
}

const sendVerificationEmail = async (user, token) => {
  const frontendUrl =
    (process.env.FRONTEND_URL && process.env.FRONTEND_URL.replace(/\/$/, '')) ||
    'http://localhost:3000';
  const verifyFrontendURL = `${frontendUrl}/verify/${token}`;

  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Verify your email",
    html: `
      <h2 style="font-family: Arial, sans-serif; color: #0f172a;">Welcome ${user.firstName}!</h2>
      <p style="font-family: Arial, sans-serif; color: #475569;">
        Please confirm your email address to activate your Appify Events account.
      </p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${verifyFrontendURL}"
           style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff;
                  text-decoration: none; border-radius: 6px; font-weight: 600; font-family: Arial, sans-serif;">
          Verify Email
        </a>
      </p>
      <p style="font-family: Arial, sans-serif; color: #475569;">
        Or open this link in your browser:<br />
        <a href="${verifyFrontendURL}" style="color: #2563eb;">${verifyFrontendURL}</a>
      </p>
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

const sendPaymentReceiptEmail = async (user, event, details) => {
  const amountLine = typeof details.amount === 'number' ? `${(details.amount || 0).toFixed(2)} ${String(details.currency || 'EGP').toUpperCase()}` : 'N/A';
  const when = event && event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA';
  const ref = details.reference || details.sessionId || details.orderId || '';

  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Payment Receipt - ${event?.title || event?.name || 'Event'}`,
    html: `
      <h3 style="margin:0 0 8px 0;">Payment Receipt</h3>
      <p>Dear ${user.firstName || 'User'},</p>
      <p>Thank you for your payment. Your registration/payment details are below:</p>
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin:12px 0;">
        <p><strong>Event:</strong> ${event?.title || event?.name || event?.type || 'Event'}</p>
        ${event?.type ? `<p><strong>Type:</strong> ${event.type}</p>` : ''}
        ${event?.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
        <p><strong>Date:</strong> ${when}</p>
        <p><strong>Amount:</strong> ${amountLine}</p>
        <p><strong>Method:</strong> ${details.method || 'Card'}</p>
        ${ref ? `<p><strong>Reference:</strong> ${ref}</p>` : ''}
      </div>
      <p>If you have any questions, reply to this email.</p>
      <p>Best regards,<br/>Appify Events Team</p>
    `,
  });
};

module.exports = { 
  sendVerificationEmail, 
  sendWarningEmail,
  sendGymSessionCancellationEmail,
  sendGymSessionUpdateEmail,
  sendVendorApplicationApprovalEmail,
  sendVendorApplicationRejectionEmail,
  sendPaymentReceiptEmail,
};
