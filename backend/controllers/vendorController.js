const mongoose = require('mongoose');
const Event = require('../models/Event');       // base model with discriminators
const Booth = require('../models/Booth');        // Register Booth discriminator
const Organization = require('../models/Organization');
const VendorApplication = require('../models/VendorApplication');
const Notification = require('../models/Notification');
const LoyaltyApplication = require('../models/LoyaltyApplication');
const Vendor = require('../models/Vendor');
const path = require('path');
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}
function badReq(res, msg) {
  return res.status(400).json({ success: false, message: msg });
}

// Tiny helper
const isUpcoming = (ev, now = new Date()) =>
  ev && ev.startDate && new Date(ev.startDate) >= now;

// 1) List upcoming Bazaars (visible to vendors)
exports.listUpcomingBazaars = async (req, res, next) => {
  try {
    const now = new Date();
    let bazaars;
    try {
      // Try a robust comparison that converts stored startDate to Date (works if startDate is a string)
      bazaars = await Event.find({
        type: 'Bazaar',
        status: 'published',
        $expr: { $gte: [{ $toDate: '$startDate' }, now] }
      })
        .select('title startDate endDate location capacity vendors type status')
        .populate({ path: 'vendors', select: 'companyName email' });
    } catch (err) {
      // Fallback for older Mongo versions where $toDate / $expr may not be available
      bazaars = await Event.find({
        type: 'Bazaar',
        status: 'published',
        startDate: { $gte: now }
      })
        .select('title startDate endDate location capacity vendors type status')
        .populate({ path: 'vendors', select: 'companyName email' });
    }
    return res.status(200).json({ success: true, message: 'Upcoming bazaars', bazaars });
  } catch (e) {
    next(e);
  }
};

// 2) List upcoming Booths in platform (also Events)
exports.listUpcomingBooths = async (req, res, next) => {
  try {
    const now = new Date();
    let booths;
    try {
      booths = await Event.find({
        type: 'Booth',
        status: 'published',
        $expr: { $gte: [{ $toDate: '$startDate' }, now] }
      })
        .select('title startDate endDate location capacity vendors type')
        .populate({ path: 'vendors', select: 'companyName email' });
    } catch (err) {
      booths = await Event.find({
        type: 'Booth',
        status: 'published',
        startDate: { $gte: now }
      })
        .select('title startDate endDate location capacity vendors type')
        .populate({ path: 'vendors', select: 'companyName email' });
    }
    return res.status(200).json({ success: true, message: 'Upcoming booths', booths });
  } catch (e) {
    next(e);
  }
};

// 2.a) List organizations (simple helper for frontend dropdown)
exports.listOrganizations = async (req, res, next) => {
  try {
    const orgs = await Organization.find().select('name email phone');
    return res.status(200).json({ success: true, organizations: orgs });
  } catch (e) {
    next(e);
  }
};

// 3) Apply to an Event (works for Bazaar or Booth)
// Body expects: { organizationId, boothSize, attendees?, setupDurationWeeks?, setupLocation?, notes? }

// 3) Apply to an Event
exports.applyToEvent = async (req, res, next) => {
  try {
    const body = req.body || {};
    let eventId = req.params.eventId || body.eventId || body.eventName || '';

    // Parse attendees if it comes as a string (FormData)
    let { attendees } = body;
    if (typeof attendees === 'string') {
      try {
        attendees = JSON.parse(attendees);
      } catch (e) {
        attendees = [];
      }
    }
    if (!Array.isArray(attendees)) attendees = [];

    const {
      organization,
      boothSize,
      setupDurationWeeks,
      setupLocation,
      notes
    } = body;

    // ... (rest of validation) ...
    // Basic validation logic
    let ev = null;
    if (isValidId(eventId)) {
      ev = await Event.findById(eventId).select('type status startDate title location');
    }
    if (!ev) {
      const titleToFind = body.eventName || eventId;
      if (titleToFind && typeof titleToFind === 'string') {
        ev = await Event.findOne({ title: titleToFind, status: 'published' }).select('type status startDate title location');
      }
    }
    if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });

    if (!['2x2', '4x4'].includes(boothSize)) return badReq(res, 'Invalid booth size');
    if (attendees.length > 5) return badReq(res, 'Max 5 attendees');

    // Attach file paths to attendees if available
    // We assume the frontend sends 'attendeeFiles' in the same order as attendees, OR
    // we just store them.
    // Better: If attendees have an 'idFileIndex' or similar? 
    // For now, let's just save the files in a separate list in the application or 
    // try to map them 1-to-1 if count matches.
    const files = req.files && req.files.attendeeFiles ? req.files.attendeeFiles : [];

    attendees.forEach((a, idx) => {
      if (!a.name || !a.email || !a.idNumber) {
        throw new Error('Missing attendee details');
      }
      // If file exists at this index, assign it??
      // This relies on frontend order.
      if (files[idx]) {
        a.idFileUrl = `/uploads/vendors/${files[idx].filename}`;
      }
    });

    const existingApp = await VendorApplication.findOne({ event: ev._id, organization });
    if (existingApp && existingApp.status !== 'cancelled') {
      return res.status(409).json({ success: false, message: 'Already applied' });
    }
    if (existingApp && existingApp.status === 'cancelled') {
      await VendorApplication.findByIdAndDelete(existingApp._id);
    }

    const app = await VendorApplication.create({
      event: ev._id,
      organization,
      vendorUser: req.user._id,
      attendees,
      boothSize,
      setupDurationWeeks: ev.type === 'Booth' ? setupDurationWeeks : undefined,
      setupLocation: ev.type === 'Booth' ? (setupLocation || ev.location) : undefined,
      notes
    });

    // Notify
    Notification.create({
      type: 'VendorApplicationSubmitted',
      message: `New vendor application for ${ev.title}`,
      recipientsRoles: ['Admin', 'EventOffice'],
      application: app._id,
      event: ev._id,
      organization
    }).catch(console.error);

    return res.status(201).json({ success: true, message: 'Application submitted', application: app });
  } catch (e) {
    if (e.message === 'Missing attendee details') return badReq(res, e.message);
    if (e.code === 11000) return res.status(409).json({ success: false, message: 'Already applied' });
    next(e);
  }
};

// 4) List my applications (for the logged-in vendor user)
exports.listMyApplications = async (req, res, next) => {
  try {
    const apps = await VendorApplication.find({ vendorUser: req.user._id })
      .sort({ createdAt: -1 })
      .populate('event', 'title startDate endDate type status')
      .populate('organization', 'name');
    return res.status(200).json({ success: true, message: 'My applications', applications: apps });
  } catch (e) {
    next(e);
  }
};

// 5) Upcoming I am participating in (approved only) for Bazaar/Booth
exports.listUpcomingParticipating = async (req, res, next) => {
  try {
    const now = new Date();
    const apps = await VendorApplication.find({
      vendorUser: req.user._id,
      status: 'approved',
    })
      .sort({ createdAt: -1 })
      .populate('event', 'title type status startDate endDate location')
      .populate('organization', 'name');

    const filtered = apps.filter(
      (a) =>
        a.event &&
        (a.event.type === 'Bazaar' || a.event.type === 'Booth') &&
        a.event.status === 'published' &&
        isUpcoming(a.event, now)
    );

    return res.status(200).json({ success: true, message: 'Upcoming approved participations', applications: filtered });
  } catch (e) {
    next(e);
  }
};

// 6) Upcoming requests I want to participate in (pending or rejected)
exports.listUpcomingRequests = async (req, res, next) => {
  try {
    const now = new Date();
    const apps = await VendorApplication.find({
      vendorUser: req.user._id,
      status: { $in: ['pending', 'rejected'] },
    })
      .sort({ createdAt: -1 })
      .populate('event', 'title type status startDate endDate location')
      .populate('organization', 'name');

    const filtered = apps.filter(
      (a) =>
        a.event &&
        (a.event.type === 'Bazaar' || a.event.type === 'Booth') &&
        a.event.status === 'published' &&
        isUpcoming(a.event, now)
    );

    return res.status(200).json({ success: true, message: 'Upcoming pending/rejected requests', applications: filtered });
  } catch (e) {
    next(e);
  }
};


exports.cancelVendorApplication = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const vendorId = req.user._id; // from auth

    // 1) find the application
    const application = await VendorApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // 2) ensure this is the vendor who created it
    if (application.vendorUser.toString() !== vendorId.toString()) {
      return res.status(403).json({ message: 'You cannot cancel someone else’s application' });
    }

    // 3) block if paid
    if (application.paid) {
      return res.status(400).json({ message: 'Cannot cancel: payment already completed.' });
    }

    // 4) mark as cancelled
    application.status = 'cancelled';
    await application.save();

    return res.json({ message: 'Application cancelled successfully.', application });
  } catch (err) {
    console.error('cancelVendorApplication error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// Vendor applies to GUC loyalty program
//reads the form fields you said: discount rate, promo code, terms and conditions ties it to the logged -in vendor(req.user._id),saves it as pending for review

exports.applyToLoyaltyProgram = async (req, res, next) => {
  try {
    const vendorId = req.user._id;
    const {
      organization,
      discountRate,
      promoCode,
      termsAndConditions
    } = req.body;

    // basic validation
    if (!organization) {
      return res.status(400).json({ success: false, message: 'Organization is required' });
    }
    if (discountRate == null || isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
      return res.status(400).json({ success: false, message: 'Discount rate must be between 0 and 100' });
    }
    if (!promoCode) {
      return res.status(400).json({ success: false, message: 'Promo code is required' });
    }
    if (!termsAndConditions) {
      return res.status(400).json({ success: false, message: 'Terms and conditions are required' });
    }

    // extra: prevent duplicate applications by same vendor
    const existing = await LoyaltyApplication.findOne({ vendorUser: vendorId, promoCode });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already applied with this promo code' });
    }

    const app = await LoyaltyApplication.create({
      vendorUser: vendorId,
      organization,
      discountRate,
      promoCode,
      termsAndConditions,
      status: 'approved'
    });

    try {
      const discountInfo = typeof discountRate === 'number' ? `${discountRate}%` : 'a special';
      const promoInfo = promoCode ? ` Use code ${promoCode}.` : '';
      await Notification.create({
        type: 'LoyaltyPartnerAdded',
        message: `${organization} has joined the GUC loyalty program offering ${discountInfo} off.${promoInfo}`,
        recipientsRoles: ['Student', 'Staff', 'TA', 'Professor', 'Vendor'],
        organization
      });
    } catch (notifyErr) {
      console.error('Failed to create instant loyalty notification:', notifyErr?.message || notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Loyalty program offer is live and visible to all users',
      application: app
    });
  } catch (err) {
    next(err);
  }
};


// List my loyalty applications
exports.listMyLoyaltyApplications = async (req, res, next) => {
  try {
    const vendorId = req.user._id;
    const applications = await LoyaltyApplication.find({ vendorUser: vendorId })
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error('Error listing loyalty applications:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Cancel a vendor's loyalty program application
exports.cancelLoyaltyApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user._id; // from auth middleware

    // Find the loyalty application
    const application = await LoyaltyApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Loyalty application not found' });
    }

    // Ensure this vendor owns the application
    if (application.vendorUser.toString() !== vendorId.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot cancel another vendor\'s application' });
    }

    // Only pending or approved applications can be cancelled
    if (application.status !== 'pending' && application.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Only pending or approved applications can be cancelled' });
    }

    // Store the previous status before cancelling
    const wasApproved = application.status === 'approved';
    const orgName = application.organization;

    // Mark as cancelled
    application.status = 'cancelled';
    await application.save();

    // If it was an approved application, create a notification about the cancellation
    if (wasApproved && orgName) {
      try {
        await Notification.create({
          type: 'LoyaltyPartnerAdded', // Reusing the type, but the message will indicate cancellation
          message: `${orgName} has been removed from the GUC loyalty program.`,
          recipientsRoles: ['Student', 'Staff', 'TA', 'Professor', 'Vendor'],
          organization: orgName
        });
      } catch (notifyErr) {
        console.error('Failed to create loyalty cancellation notification:', notifyErr?.message || notifyErr);
      }
    }

    return res.json({
      success: true,
      message: 'Loyalty application cancelled successfully',
      application
    });
  } catch (error) {
    console.error('Error cancelling loyalty application:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a cancelled loyalty application
exports.deleteLoyaltyApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user._id;

    const application = await LoyaltyApplication.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Loyalty application not found' });
    }

    if (application.vendorUser.toString() !== vendorId.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot delete another vendor\'s application' });
    }

    if ((application.status || '').toLowerCase() !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Only cancelled applications can be deleted' });
    }

    await LoyaltyApplication.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Loyalty application deleted successfully' });
  } catch (error) {
    console.error('Error deleting loyalty application:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Permanently delete a vendor application (only if it's cancelled and owned by the vendor)
exports.deleteVendorApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = req.user._id;

    const app = await VendorApplication.findById(id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (app.vendorUser.toString() !== vendorId.toString()) {
      return res.status(403).json({ success: false, message: 'You cannot delete another vendor\'s application' });
    }

    if ((app.status || '').toLowerCase() !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Only cancelled applications can be deleted' });
    }

    await VendorApplication.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Application deleted' });
  } catch (err) {
    console.error('Error deleting vendor application:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.uploadVendorDocuments = async (req, res, next) => {
  try {
    const vendorId = req.user._id;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // req.files is populated by multer.fields(...)
    if (req.files && req.files.taxCard && req.files.taxCard[0]) {
      const file = req.files.taxCard[0];
      vendor.taxCardUrl = `/uploads/vendors/${file.filename}`;
    }

    if (req.files && req.files.logo && req.files.logo[0]) {
      const file = req.files.logo[0];
      vendor.logoUrl = `/uploads/vendors/${file.filename}`;
    }

    await vendor.save();

    return res.json({
      success: true,
      message: 'Vendor documents uploaded successfully',
      vendor: {
        _id: vendor._id,
        companyName: vendor.companyName,
        taxCardUrl: vendor.taxCardUrl,
        logoUrl: vendor.logoUrl
      }
    });
  } catch (err) {
    console.error('uploadVendorDocuments error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// List all loyalty program partners with discount info, all parties are able to view
exports.listLoyaltyPartners = async (req, res, next) => {
  try {
    console.log('📋 listLoyaltyPartners called');
    
    // Check if LoyaltyApplication model is available
    if (!LoyaltyApplication) {
      console.error('❌ LoyaltyApplication model not found');
      return res.status(500).json({
        success: false,
        message: 'LoyaltyApplication model not available',
        error: 'Model not loaded'
      });
    }

    const apps = await LoyaltyApplication.find({ status: 'approved' })
      .populate('vendorUser', 'companyName email') // adjust fields based on Vendor model
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    console.log(`✅ Found ${apps.length} approved loyalty applications`);

    const partners = apps.map(app => ({
      loyaltyApplicationId: app._id,
      vendorId: app.vendorUser ? app.vendorUser._id : undefined,
      vendorName: app.vendorUser?.companyName || app.organization || 'Unknown Vendor',
      discountRate: app.discountRate || 0,
      promoCode: app.promoCode || 'N/A',
      termsAndConditions: app.termsAndConditions || ''
    }));

    console.log(`✅ Returning ${partners.length} partners`);

    return res.status(200).json({
      success: true,
      count: partners.length,
      partners
    });
  } catch (err) {
    console.error('❌ listLoyaltyPartners error:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving loyalty partners',
      error: err.message
    });
  }
};

// Generate QR for Visitor Pass
// GET /applications/:id/visitor-pass/qr
exports.generateVisitorQR = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { generateQRCode } = require('../utils/qrGenerator');
    const VendorApplication = require('../models/VendorApplication');

    const app = await VendorApplication.findById(id).populate('event');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    if (app.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Application must be approved to generate passes' });
    }

    // Generate a single QR payload for simplicity, or return list
    // Payload: { appId, eventId, organization, type: 'VisitorPass' }
    const payload = JSON.stringify({
      appId: app._id,
      eventId: app.event._id,
      org: app.organization,
      type: 'VisitorPass',
      timestamp: Date.now()
    });

    const qrDataUrl = await generateQRCode(payload);

    return res.json({
      success: true,
      qrCode: qrDataUrl,
      message: 'Visitor Pass QR generated'
    });
  } catch (err) {
    next(err);
  }
};
exports.uploadAttendeeId = async (req, res, next) => {
  try {
    const { applicationId, attendeeId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // VendorApplication is already imported at top of file
    const app = await VendorApplication.findById(applicationId);

    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Verify vendor owns app
    if (app.vendorUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let foundIndex = -1;
    if (app.attendees && app.attendees.id) {
      const sub = app.attendees.id(attendeeId);
      if (sub) {
        sub.idFileUrl = `/uploads/attendees/${file.filename}`;
        await app.save();
        return res.json({ success: true, idUrl: sub.idFileUrl, message: 'ID uploaded' });
      }
    }

    foundIndex = app.attendees.findIndex(a => (a._id && a._id.toString() === attendeeId) || (a.id === attendeeId));
    if (foundIndex === -1) {
      return res.status(404).json({ success: false, message: 'Attendee not found' });
    }

    app.attendees[foundIndex].idFileUrl = `/uploads/attendees/${file.filename}`;
    await app.save();

    return res.json({ success: true, idUrl: app.attendees[foundIndex].idFileUrl, message: 'ID uploaded' });

  } catch (err) {
    next(err);
  }
};

