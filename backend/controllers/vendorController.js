const mongoose = require('mongoose');
const Event = require('../models/Event');       // base model with discriminators
const Organization = require('../models/Organization');
const VendorApplication = require('../models/VendorApplication');
const Notification = require('../models/Notification');

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
    const bazaars = await Event.find({
      type: 'Bazaar',             // discriminator type
      status: 'published',        // only open/visible events
      startDate: { $gte: now }    // future
    }).select('title startDate endDate location capacity');
    return res.status(200).json({ success: true, message: 'Upcoming bazaars', bazaars });
  } catch (e) {
    next(e);
  }
};

// 2) List upcoming Booths in platform (also Events)
exports.listUpcomingBooths = async (req, res, next) => {
  try {
    const now = new Date();
    const booths = await Event.find({
      type: 'Booth',
      status: 'published',
      startDate: { $gte: now }
    }).select('title startDate endDate location capacity');
    return res.status(200).json({ success: true, message: 'Upcoming booths', booths });
  } catch (e) {
    next(e);
  }
};

// 3) Apply to an Event (works for Bazaar or Booth)
// Body expects: { organizationId, boothSize, attendees?, setupDurationWeeks?, setupLocation?, notes? }
exports.applyToEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const {
      organizationId,
      boothSize = '2x2',
      attendees = [],
      setupDurationWeeks,      // required only for Booth
      setupLocation,           // required only for Booth
      notes
    } = req.body;

    // Basic id validation early
    if (!isValidId(eventId) || !isValidId(organizationId)) {
      return badReq(res, 'Invalid eventId or organizationId');
    }

    // Load the event; must be Bazaar or Booth, published, and in the future
    const ev = await Event.findById(eventId).select('type status startDate title');
    if (!ev) return res.status(404).json({ success: false, message: 'Event not found' });
    if (!['Bazaar', 'Booth'].includes(ev.type)) {
      return badReq(res, 'Only Bazaar or Booth events accept vendor applications');
    }
    if (ev.status !== 'published') return badReq(res, 'Event not open for applications');
    if (new Date(ev.startDate) < new Date()) return badReq(res, 'Event already started or finished');

    // Organization must exist
    const org = await Organization.findById(organizationId).select('name');
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Common business rules
    if (!['2x2', '4x4'].includes(boothSize)) {
      return badReq(res, 'Invalid booth size (allowed: 2x2, 4x4)');
    }
    if (attendees.length > 5) {
      return badReq(res, 'Maximum 5 attendees allowed');
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

    // Create the application. The (event, organization) unique index will prevent duplicates.
    const app = await VendorApplication.create({
      event: ev._id,
      organization: org._id,
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
        organization: org._id,
      });
    } catch (notifyErr) {
      console.error('Notification create failed:', notifyErr && notifyErr.message ? notifyErr.message : notifyErr);
    }

    return res.status(201).json({ success: true, message: 'Application submitted', application: app });
  } catch (e) {
    // 11000 = duplicate key: unique index (event + organization) → already applied
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
