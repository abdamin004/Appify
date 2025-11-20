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
        $expr: { $gte: [ { $toDate: '$startDate' }, now ] }
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
        $expr: { $gte: [ { $toDate: '$startDate' }, now ] }
      })
        .select('title startDate endDate location capacity vendors')
        .populate({ path: 'vendors', select: 'companyName email' });
    } catch (err) {
      booths = await Event.find({
        type: 'Booth',
        status: 'published',
        startDate: { $gte: now }
      })
        .select('title startDate endDate location capacity vendors')
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
exports.applyToEvent = async (req, res, next) => {
  try {
    // Accept eventId from URL param or request body (defensive)
    const body = req.body || {};
    let eventId = req.params.eventId || body.eventId || body.eventName || '';
    const {
      organization,
      boothSize ,
      attendees = [],
      setupDurationWeeks,      // required only for Booth
      setupLocation,           // required only for Booth
      notes
    } = body;

    /*
    // Basic id validation early
    if (!isValidId(eventId) || !isValidId(organizationId)) {
      return badReq(res, 'Invalid eventId or organizationId');
    }
    */

    // Normalize input - if it's an id-like string we'll try by id first, otherwise try title
    let ev = null;
    if (isValidId(eventId)) {
      ev = await Event.findById(eventId).select('type status startDate title');
    }
    if (!ev) {
      // Treat eventId as title (exact match) or eventName provided
      const titleToFind = body.eventName || eventId;
      if (titleToFind && typeof titleToFind === 'string') {
        ev = await Event.findOne({ title: titleToFind, status: 'published' }).select('type status startDate title');
      }
    }
    if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });

    /*
    // Organization must exist
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    */
    // Common business rules
    if (!['2x2', '4x4'].includes(boothSize)) {
      return badReq(res, 'Invalid booth size (allowed: 2x2, 4x4)');
    }
      // Validate attendees (max 5, and must include ID number)
      if (attendees.length > 5) {
          return badReq(res, 'Maximum 5 attendees allowed');
      }

      for (const a of attendees) {
          if (!a.name || !a.email || !a.idNumber) {
              return badReq(res,
                  'Each attendee must have name, email, and idNumber'
              );
          }
      }


    // Booth-only rules
    if (ev.type === 'Booth') {
      const okInt = Number.isInteger(setupDurationWeeks);
      if (!okInt || setupDurationWeeks < 1 || setupDurationWeeks > 4) {
        return badReq(res, 'setupDurationWeeks must be an integer between 1 and 4');
      }
      if (!setupLocation || typeof setupLocation !== 'string') {
        return badReq(res, 'setupLocation is required (map slot id/code)');
      }
    }

    // Check if there's an existing application (including cancelled ones)
    const existingApp = await VendorApplication.findOne({
      event: ev._id,
      organization: organization
    });

    // If there's an existing non-cancelled application, prevent duplicate
    if (existingApp && existingApp.status !== 'cancelled') {
      return res.status(409).json({ 
        success: false, 
        message: `Organization has already applied to this event (status: ${existingApp.status})` 
      });
    }

    // If there's a cancelled application, delete it first to allow re-application
    if (existingApp && existingApp.status === 'cancelled') {
      await VendorApplication.findByIdAndDelete(existingApp._id);
    }

    // Create the application
    const app = await VendorApplication.create({
      event: ev._id,
      organization: organization,
      vendorUser: req.user._id,     // the logged-in Vendor who submitted
      attendees,
      boothSize,
      setupDurationWeeks: ev.type === 'Booth' ? setupDurationWeeks : undefined,
      setupLocation:      ev.type === 'Booth' ? setupLocation      : undefined,
      notes
    });

    // create a notification for Admin/EventOffice to review this application
    try {
      await Notification.create({
        type: 'VendorApplicationSubmitted',
        message: `New vendor application submitted for ${ev.type} '${ev.title}'.`,
        recipientsRoles: ['Admin', 'EventOffice'],
        application: app._id,
        event: ev._id,
        organization: organization || undefined,
      });
    } catch (notifyErr) {
      console.error('Notification create failed:', notifyErr && notifyErr.message ? notifyErr.message : notifyErr);
    }

    return res.status(201).json({ success: true, message: 'Application submitted', application: app });
  } catch (e) {
    // 11000 = duplicate key: unique index (event + organization) → should not happen now, but handle just in case
    if (e && e.code === 11000) {
      return res.status(409).json({ success: false, message: 'Organization has already applied to this event' });
    }
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
            termsAndConditions
        });

        return res.status(201).json({
            success: true,
            message: 'Loyalty program application submitted',
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

        // Only pending applications can be cancelled
        if (application.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Only pending applications can be cancelled' });
        }

        // Mark as cancelled
        application.status = 'cancelled';
        await application.save();

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
        const apps = await LoyaltyApplication.find({ status: 'approved' })
            .populate('vendorUser', 'companyName email') // adjust fields based on Vendor model
            .sort({ createdAt: -1 });

        const partners = apps.map(app => ({
            loyaltyApplicationId: app._id,
            vendorId: app.vendorUser ? app.vendorUser._id : undefined,
            vendorName: app.vendorUser?.companyName || app.organization,
            discountRate: app.discountRate,
            promoCode: app.promoCode,
            termsAndConditions: app.termsAndConditions
        }));

        return res.status(200).json({
            success: true,
            count: partners.length,
            partners
        });
    } catch (err) {
        console.error('listLoyaltyPartners error:', err);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving loyalty partners',
            error: err.message
        });
    }
};

