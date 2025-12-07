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
  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.replace(/\/$/, '')
    : (process.env.NODE_ENV === 'production' ? 'https://appify-events.com' : 'http://localhost:3000');
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

const sendWarningEmail = async (user, comment) => {
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
  const participationFee = application.participationFee || 0;
  const paymentDeadline = application.paymentDeadline ? new Date(application.paymentDeadline).toLocaleDateString() : 'N/A';
  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.replace(/\/$/, '')
    : (process.env.NODE_ENV === 'production' ? 'https://appify-events.com' : 'http://localhost:3000');
  const paymentUrl = `${frontendUrl}/vendor/payment/${application._id}`;

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
      
      <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h4 style="color: #92400e; margin-top: 0;">💰 Payment Required</h4>
        <p style="font-size: 18px; margin: 10px 0;"><strong>Participation Fee: $${participationFee.toFixed(2)}</strong></p>
        <p><strong>Payment Deadline:</strong> <span style="color: #dc2626; font-weight: bold;">${paymentDeadline}</span></p>
        <p style="color: #92400e; font-weight: bold; margin-top: 10px;">⚠️ Important: Payment must be completed within 3 days of approval (by ${paymentDeadline}) to secure your participation.</p>
        ${event.type === 'Booth' && application.setupDurationWeeks ? `<p style="font-size: 12px; color: #6b7280; margin-top: 5px;">Fee calculated based on: ${application.setupDurationWeeks} week(s) × location tier</p>` : ''}
        ${event.type === 'Bazaar' ? `<p style="font-size: 12px; color: #6b7280; margin-top: 5px;">Fee calculated based on: ${application.boothSize} booth size × location tier</p>` : ''}
        <p style="margin-top: 15px;"><a href="${paymentUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">💳 Pay Now</a></p>
        <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">You can pay via credit card or wallet balance. Payment link is also available in your vendor dashboard.</p>
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

const buildQrAttachment = (qrImageDataUrl, filenameBase, cidPrefix = 'qr') => {
  if (!qrImageDataUrl || !qrImageDataUrl.startsWith('data:image')) {
    return { attachment: null, cid: null };
  }

  const base64 = qrImageDataUrl.split(',')[1];
  if (!base64) return { attachment: null, cid: null };

  const cid = `${cidPrefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@appify`;
  return {
    attachment: {
      filename: `${filenameBase || 'qr-code'}.png`,
      content: Buffer.from(base64, 'base64'),
      contentType: 'image/png',
      cid
    },
    cid
  };
};

const sendVendorVisitorPassesEmail = async (vendor, event, organization, passes) => {
  if (!vendor?.email || !Array.isArray(passes) || passes.length === 0) return;

  const eventDate = event?.startDate ? new Date(event.startDate).toLocaleString() : 'TBA';
  const eventLocation = event?.location || 'TBA';

  const tableRows = passes.map((p, idx) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px;">${idx + 1}</td>
        <td style="padding:8px;">${p.visitorName || ''}</td>
        <td style="padding:8px;">${p.visitorEmail || '—'}</td>
        <td style="padding:8px;">${p.visitorIdNumber || '—'}</td>
        <td style="padding:8px; font-family:monospace;">${p.passCode}</td>
      </tr>
    `).join('');

  const attachments = [];
  const qrBlocks = passes.map((p, idx) => {
    const { attachment, cid } = buildQrAttachment(
      p.qrImageDataUrl,
      `${(p.visitorName || 'visitor').replace(/[^a-z0-9]/gi, '_') || 'qr'}-${p.passCode || idx}`,
      `qr-vendor-${idx}`
    );
    if (attachment) attachments.push(attachment);

    const imgTag = cid
      ? `<img src="cid:${cid}" alt="QR for ${p.visitorName || 'visitor'}" style="width:180px; height:180px; border:1px solid #d1d5db; padding:6px; background:#fff;" />`
      : '<div style="color:#dc2626;">QR unavailable</div>';

    return `
      <div style="display:inline-block; margin:12px; text-align:center;">
        <div style="font-weight:600; margin-bottom:6px;">${p.visitorName || ''}</div>
        ${imgTag}
        <div style="font-size:0.9rem; color:#6b7280; margin-top:4px;">${p.passCode}</div>
      </div>
    `;
  }).join('');

  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: vendor.email,
    subject: `QR codes for your attendees — ${event?.title || 'Event'}`,
    html: `
      <p>Dear ${vendor.companyName || organization || 'Vendor'},</p>
      <p>Here are the QR passes for your approved attendees at <strong>${event?.title || 'the event'}</strong>.</p>
      <div style="margin:12px 0; padding:12px; background:#f9fafb; border-radius:8px;">
        <p style="margin:0;"><strong>Event:</strong> ${event?.title || 'Event'}</p>
        <p style="margin:0;"><strong>Type:</strong> ${event?.type || 'Bazaar'}</p>
        <p style="margin:0;"><strong>Date:</strong> ${eventDate}</p>
        <p style="margin:0;"><strong>Location:</strong> ${eventLocation}</p>
      </div>
      <p style="margin-top:16px;">Attendee list:</p>
      <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif; font-size:0.95rem; background:#fff; border:1px solid #e5e7eb;">
        <thead style="background:#f3f4f6;">
          <tr>
            <th style="padding:8px; text-align:left;">#</th>
            <th style="padding:8px; text-align:left;">Name</th>
            <th style="padding:8px; text-align:left;">Email</th>
            <th style="padding:8px; text-align:left;">ID Number</th>
            <th style="padding:8px; text-align:left;">Pass Code</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <p style="margin-top:20px;">QR previews:</p>
      <div style="text-align:center;">
        ${qrBlocks}
      </div>
      <p>Please forward these passes to your visitors. Each QR must be shown at the entrance for quick check-in.</p>
      <p>Best regards,<br/>Appify Events Team</p>
    `,
    attachments
  });
};

const sendIndividualVisitorPassEmail = async (pass, event, organization) => {
  if (!pass?.visitorEmail) return;

  const eventDate = event?.startDate ? new Date(event.startDate).toLocaleString() : 'TBA';
  const eventLocation = event?.location || 'TBA';

  const safeName = (pass.visitorName || 'visitor').replace(/[^a-z0-9]/gi, '_') || 'visitor';
  const { attachment, cid } = buildQrAttachment(pass.qrImageDataUrl, `${safeName}-${pass.passCode || 'qr'}`, `qr-visitor-${safeName}`);

  const attachments = attachment ? [attachment] : [];
  const qrPreview = cid
    ? `<img src="cid:${cid}" alt="QR code" style="width:220px;height:220px;border:1px solid #d1d5db;padding:8px;background:#fff;" />`
    : '<div style="color:#dc2626;font-weight:bold;">QR preview unavailable. Please contact the event office.</div>';

  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: pass.visitorEmail,
    subject: `Your visitor QR pass — ${event?.title || 'Event'}`,
    html: `
      <p>Hello ${pass.visitorName || 'Guest'},</p>
      <p>You have been registered to attend <strong>${event?.title || 'an event'}</strong> for ${organization || 'a vendor'}.</p>
      <div style="margin:12px 0; padding:12px; background:#f9fafb; border-radius:8px;">
        <p style="margin:0;"><strong>Event:</strong> ${event?.title || 'Event'}</p>
        <p style="margin:0;"><strong>Date:</strong> ${eventDate}</p>
        <p style="margin:0;"><strong>Location:</strong> ${eventLocation}</p>
        <p style="margin:0;"><strong>Pass Code:</strong> ${pass.passCode}</p>
      </div>
      <p style="margin:16px 0;">Present the QR code below at the entrance:</p>
      <div style="text-align:center; margin-bottom:16px;">
        ${qrPreview}
      </div>
      <p>If you lose this email, contact the vendor or Event Office to resend your pass.</p>
      <p>See you there!<br/>Appify Events Team</p>
    `,
    attachments
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

const sendCertificateEmail = async (user, workshop) => {
  const date = workshop.endDate ? new Date(workshop.endDate).toLocaleDateString() : new Date().toLocaleDateString();

  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Certificate of Attendance - ${workshop.title}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; text-align: center; border: 10px solid #ddd; padding: 40px; max-width: 800px; margin: 0 auto;">
        <div style="border: 5px solid #10b981; padding: 20px;">
            <h1 style="font-size: 40px; font-weight: bold; color: #10b981; margin-bottom: 20px;">Certificate of Attendance</h1>
            <p style="font-size: 20px; color: #555;">This is to certify that</p>
            <h2 style="font-size: 30px; color: #333; margin: 10px 0; border-bottom: 2px solid #333; display: inline-block; padding-bottom: 5px;">${user.firstName} ${user.lastName}</h2>
            <p style="font-size: 20px; color: #555; margin-top: 20px;">has successfully attended the workshop</p>
            <h3 style="font-size: 25px; color: #2563eb; margin: 10px 0;">${workshop.title}</h3>
            <p style="font-size: 18px; color: #555;">conducted on ${date}</p>
            
            <div style="margin-top: 40px; display: flex; justify-content: space-around;">
                <div style="text-align: center;">
                    <p style="font-weight: bold; border-top: 1px solid #333; padding-top: 5px; width: 200px; margin: 0 auto;">${workshop.facultyName || 'Appify Events'}</p>
                    <p style="font-size: 14px; color: #777;">Organizer</p>
                </div>
                <div style="text-align: center;">
                    <img src="https://fakeimg.pl/100x50/?text=Signature&font=lobster" alt="Signature" style="opacity: 0.7;">
                    <p style="font-weight: bold; border-top: 1px solid #333; padding-top: 5px; width: 200px; margin: 0 auto;">Appify Certification</p>
                    <p style="font-size: 14px; color: #777;">Authority</p>
                </div>
            </div>
            
            <p style="font-size: 12px; color: #999; margin-top: 30px;">Certificate ID: ${workshop._id}-${user._id}</p>
        </div>
      </div>
    `,
  });
};

const sendEventReminderEmail = async (user, event, label) => {
  const timeString = label || 'soon';
  const eventDate = event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA';

  await transporter.sendMail({
    from: `"Appify Events" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Reminder: ${event.title} starts ${timeString}`,
    html: `
        <h3>Event Reminder</h3>
        <p>Dear ${user.firstName || 'User'},</p>
        <p>This is a reminder that you are registered for <strong>"${event.title}"</strong>.</p>
        <div style="background:#f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px; margin: 12px 0;">
          <p><strong>Starts in:</strong> ${timeString}</p>
          <p><strong>Date/Time:</strong> ${eventDate}</p>
          <p><strong>Location:</strong> ${event.location || 'See details'}</p>
        </div>
        <p>We look forward to seeing you there!</p>
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
  sendVendorVisitorPassesEmail,
  sendIndividualVisitorPassEmail,
  sendCertificateEmail,
  sendEventReminderEmail
};
