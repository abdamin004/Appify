const mongoose = require('mongoose');
const Event = require('../models/Event');       // base model with discriminators
const Organization = require('../models/Organization');
const VendorApplication = require('../models/VendorApplication');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}
function badReq(res, msg) {
  return res.status(400).json({ message: msg });
}

// 1) List upcoming Bazaars (visible to vendors)
exports.listUpcomingBazaars = async (req, res, next) => {
  try {
    const now = new Date();
    const bazaars = await Event.find({
      type: 'Bazaar',             // discriminator type
      status: 'published',        // only open/visible events
      startDate: { $gte: now }    // future
    }).select('title startDate endDate location capacity');
    return res.json(bazaars);
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
    return res.json(booths);
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
    if (!ev) return res.status(404).json({ message: 'Event not found' });
    if (!['Bazaar', 'Booth'].includes(ev.type)) {
      return badReq(res, 'Only Bazaar or Booth events accept vendor applications');
    }
    if (ev.status !== 'published') return badReq(res, 'Event not open for applications');
    if (new Date(ev.startDate) < new Date()) return badReq(res, 'Event already started or finished');

    // Organization must exist
    const org = await Organization.findById(organizationId).select('name');
    if (!org) return res.status(404).json({ message: 'Organization not found' });

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

    return res.status(201).json({
      message: 'Application submitted',
      application: app
    });
  } catch (e) {
    // 11000 = duplicate key: unique index (event + organization) → already applied
    if (e && e.code === 11000) {
      return res.status(409).json({ message: 'Organization has already applied to this event' });
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
    return res.json(apps);
  } catch (e) {
    next(e);
  }
};
