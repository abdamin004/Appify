const Event = require('../models/Event');
const Vendor = require('../models/Vendor'); 
const VendorApplication = require('../models/VendorApplication');
const User = require('../models/User');
const Workshop = require('../models/Workshop');
const Trip = require('../models/Trip');
const Bazaar = require('../models/Bazaar');
const Conference = require('../models/Conference');
const GymSession = require('../models/GymSession'); // NEW
const { ObjectId } = require('mongoose').Types;

// Helper: attach approved vendor participants (from VendorApplication) to Bazaar/Booth events
async function attachApprovedParticipants(events) {
  try {
    if (!Array.isArray(events) || events.length === 0) return events;
    const ids = events.map(e => e && e._id).filter(Boolean);
    const apps = await VendorApplication.find({ event: { $in: ids }, status: 'approved' })
      .populate('vendorUser', 'companyName email')
      .select('event organization status vendorUser');
    const byEvent = new Map();
    for (const a of apps) {
      const key = String(a.event);
      if (!byEvent.has(key)) byEvent.set(key, []);
      byEvent.get(key).push({
        organization: a.organization,
        vendorCompany: a.vendorUser && a.vendorUser.companyName,
        vendorEmail: a.vendorUser && a.vendorUser.email,
        status: a.status,
      });
    }
    return events.map(e => {
      if (!e) return e;
      const isBazaarOrBooth = e.type === 'Bazaar' || e.type === 'Booth';
      if (!isBazaarOrBooth) return e;
      const key = String(e._id);
      const participants = byEvent.get(key) || [];
      // Ensure plain object so we can append fields safely
      const obj = typeof e.toObject === 'function' ? e.toObject() : { ...e };
      obj.participants = participants;
      obj.participantsCount = participants.length;
      return obj;
    });
  } catch (err) {
    // In case of error, return original events
    return events;
  }
}

module.exports = {
    // POST /events/create - Create a new event
    async createEvent(req, res) {
        try {
            const {
                title,
                shortDescription,
                description,
                category,
                tags,
                startDate,
                endDate,
                location,
                type,
                vendors,
                capacity,
                status,
                registrationDeadline, 
                professors,
                facultyName,
                requiredBudget,
                fundingSource,
                extraRequiredResourses,
                price,
                websiteLink,
                // GymSession fields
                sessionType,
                instructor,
                equipment,
                difficulty,
                durationMinutes,
                prerequisites
            } = req.body;
        
            const eventData = {
                title,
                shortDescription,
                description,
                category,
                tags,
                startDate,
                endDate,
                location,
                type,
                registrationDeadline,
                capacity,
                status,
                createdBy: req.user._id
            };

            let event;

            switch (type) {
                case 'Workshop':
                    event = await Workshop.create({...eventData, professors, facultyName, requiredBudget, fundingSource, extraRequiredResourses});
                    break;
                case 'Trip':
                    event = await Trip.create({...eventData, price});
                    break;
                case 'Bazaar':  
                    event = await Bazaar.create({...eventData, vendors});
                    break;
                case 'Conference':
                    event = await Conference.create({...eventData, websiteLink, requiredBudget, fundingSource, extraRequiredResourses});
                    break;
                case 'GymSession':
                    event = await GymSession.create({...eventData, sessionType, instructor, equipment, difficulty, durationMinutes, prerequisites});
                    break;
                default:
                    event = await Event.create(eventData);
            }

            res.status(201).json({
                success: true,
                message: `${type || 'Event'} created successfully.`,
                event
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    async getAllEvents(req, res) {
        try {
            const now = new Date();
            let events;
            try {
                events = await Event.find({
                    status: 'published',
                    $expr: { $gte: [ { $toDate: '$startDate' }, now ] }
                })
                .populate({ path: 'vendors', options: { strictPopulate: false } })
                .exec();
            } catch (e) {
                // Fallback if $toDate not supported
                events = await Event.find({ status: 'published', startDate: { $gte: now } })
                  .populate({ path: 'vendors', options: { strictPopulate: false } })
                  .exec();
            }

            events = await attachApprovedParticipants(events);
            res.json(events);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async searchEvents(req, res) {
        try {
            const { q } = req.query;
            const regex = new RegExp(q || '', 'i');
            const now = new Date();
            const baseMatch = {
                status: 'published',
                $or: [
                    { title: regex },
                    { description: regex },
                    { type: regex },
                    { category: regex }
                ]
            };
            let events;
            try {
                events = await Event.find({
                    ...baseMatch,
                    $expr: { $gte: [ { $toDate: '$startDate' }, now ] }
                })
                  .populate({ path: 'vendors', options: { strictPopulate: false } });
            } catch (e) {
                events = await Event.find({ ...baseMatch, startDate: { $gte: now } })
                  .populate({ path: 'vendors', options: { strictPopulate: false } });
            }
            events = await attachApprovedParticipants(events);
            res.json(events);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async filterEvents(req, res) { 
        try {
            const { category, location, type, startDate, professorName } = req.query;
            const base = { status: 'published' };
            if (category) base.category = new RegExp(category, 'i');
            if (location) base.location = new RegExp(location, 'i');
            if (type) base.type = new RegExp(type, 'i');
            if (professorName) base['professors.name'] = { $regex: new RegExp(professorName, 'i') };

            let events;
            if (startDate) {
                events = await Event.find({ ...base, startDate: { $gte: new Date(startDate) } })
                  .populate({ path: 'vendors', options: { strictPopulate: false } })
                  .sort({ startDate: 1 })
                  .exec();
            } else {
                const now = new Date();
                try {
                    events = await Event.find({
                        ...base,
                        $expr: { $gte: [ { $toDate: '$startDate' }, now ] }
                    })
                      .populate({ path: 'vendors', options: { strictPopulate: false } })
                      .sort({ startDate: 1 })
                      .exec();
                } catch (e) {
                    events = await Event.find({ ...base, startDate: { $gte: now } })
                      .populate({ path: 'vendors', options: { strictPopulate: false } })
                      .sort({ startDate: 1 })
                      .exec();
                }
            }

            events = await attachApprovedParticipants(events);
            res.json(events);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async sortEvents(req, res) {
        try {
            const events = await Event.find().sort({ startDate: 1 }).populate({ path: 'vendors', options: { strictPopulate: false } });
            res.json(events);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getRegisteredEvents(req, res) {
        try {
            const userId = req.user._id;
            const user = await User.findById(userId).populate({
                path: 'registeredEvents',
                populate: { path: 'vendors', options: { strictPopulate: false } }
            });
            res.json(user.registeredEvents || []);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getMyWorkshops(req, res) {
        try {
            const professorId = req.query.professorId || '670abc12345...';
            const workshops = await Workshop.find({ createdBy: professorId });
            res.status(200).json(workshops);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },// Add this to your eventController.js

async registerForEvent(req, res) {
    try {
        const eventId = req.params.eventId;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(eventId);
        console.log('Registering user', userId, 'for event', eventId);
        if (!event) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found' 
            });
        }

        // Check if event has already started
        if (new Date(event.startDate) <= new Date()) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot register for an event that has already started' 
            });
        }

        // Check if registration deadline has passed
        if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) {
            return res.status(400).json({ 
                success: false,
                message: 'Registration deadline has passed' 
            });
        }

        // Check if event is published
        if (event.status !== 'published') {
            return res.status(400).json({ 
                success: false,
                message: 'This event is not available for registration' 
            });
        }

        // Check if event is at capacity
        if (event.capacity && event.registeredUsers && event.registeredUsers.length >= event.capacity) {
            return res.status(400).json({ 
                success: false,
                message: 'Event is at full capacity' 
            });
        }

        // Check if user is already registered
        if (event.registeredUsers && event.registeredUsers.includes(userId)) {
            return res.status(400).json({ 
                success: false,
                message: 'You are already registered for this event' 
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Check if user already registered
        if (user.registeredEvents && user.registeredEvents.includes(eventId)) {
            return res.status(400).json({ 
                success: false,
                message: 'You are already registered for this event' 
            });
        }

        // Add user to event's registeredUsers array
        event.registeredUsers = event.registeredUsers || [];
        event.registeredUsers.push(userId);
        await event.save();

        // Add event to user's registeredEvents array
        user.registeredEvents = user.registeredEvents || [];
        user.registeredEvents.push(eventId);
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Successfully registered for the event',
            event: {
                id: event._id,
                title: event.title,
                startDate: event.startDate,
                location: event.location
            }
        });

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
},

async unregisterFromEvent(req, res) {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ 
                success: false,
                message: 'Event not found' 
            });
        }

        // Check if event has already started
        if (new Date(event.startDate) <= new Date()) {
            return res.status(400).json({ 
                success: false,
                message: 'Cannot unregister from an event that has already started' 
            });
        }

        // Check if user is registered
        if (!event.registeredUsers || !event.registeredUsers.includes(userId)) {
            return res.status(400).json({ 
                success: false,
                message: 'You are not registered for this event' 
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Remove user from event's registeredUsers array
        event.registeredUsers = event.registeredUsers.filter(
            id => id.toString() !== userId.toString()
        );
        await event.save();

        // Remove event from user's registeredEvents array
        user.registeredEvents = user.registeredEvents.filter(
            id => id.toString() !== eventId.toString()
        );
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Successfully unregistered from the event'
        });

    } catch (err) {
        console.error('Unregistration error:', err);
        res.status(500).json({ 
            success: false,
            message: err.message 
        });
    }
},

    async updateEvent(req, res) {
        try {
            const {id} = req.params;
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }
            if (event.startDate <= new Date()) {
                return res.status(400).json({ error: 'Cannot update an event that has already started' });
            }
            
            const {
                title, shortDescription, description, category, tags, startDate, endDate, 
                location, capacity, status, registrationDeadline,
                professors, facultyName, requiredBudget, fundingSource, extraRequiredResourses,
                price, websiteLink, vendors,
                sessionType, instructor, equipment, difficulty, durationMinutes, prerequisites
            } = req.body;

            const updatedData = {
                ...(title && { title }),
                ...(shortDescription && { shortDescription }),
                ...(description && { description }),
                ...(category && { category }),
                ...(tags && { tags }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(location && { location }),
                ...(capacity && { capacity }),
                ...(status && { status }),
                ...(registrationDeadline && { registrationDeadline })
            };

            switch (event.type) {
                case 'Workshop':
                    if (professors) updatedData.professors = professors;
                    if (facultyName) updatedData.facultyName = facultyName;
                    if (requiredBudget) updatedData.requiredBudget = requiredBudget;
                    if (fundingSource) updatedData.fundingSource = fundingSource;
                    if (extraRequiredResourses) updatedData.extraRequiredResourses = extraRequiredResourses;
                    break;
                case 'Trip':
                    if (price) updatedData.price = price;
                    break;
                case 'Bazaar':
                    if (vendors) updatedData.vendors = vendors;
                    break;
                case 'Conference':
                    if (websiteLink) updatedData.websiteLink = websiteLink;
                    if (requiredBudget) updatedData.requiredBudget = requiredBudget;
                    if (fundingSource) updatedData.fundingSource = fundingSource;
                    if (extraRequiredResourses) updatedData.extraRequiredResourses = extraRequiredResourses;
                    break;
                case 'GymSession':
                    if (sessionType) updatedData.sessionType = sessionType;
                    if (instructor) updatedData.instructor = instructor;
                    if (equipment) updatedData.equipment = equipment;
                    if (difficulty) updatedData.difficulty = difficulty;
                    if (durationMinutes) updatedData.durationMinutes = durationMinutes;
                    if (prerequisites) updatedData.prerequisites = prerequisites;
                    break;
            }

            const updatedEvent = await Event.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true })
                .populate({ path: 'vendors', options: { strictPopulate: false } });
            res.status(200).json({
                success: true,
                message: 'Event updated successfully',
                event: updatedEvent
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    async deleteEvent(req, res) {
        try {
            const {id} = req.params;
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }
            if (event.startDate <= new Date()) {
                return res.status(400).json({ error: 'Cannot delete an event that has already started' });
            }
            
            switch (event.type) {
                case 'Workshop':
                    await Workshop.findByIdAndDelete(id);
                    break;
                case 'Trip':
                    await Trip.findByIdAndDelete(id);
                    break;
                case 'Bazaar':
                    await Bazaar.findByIdAndDelete(id);
                    break;
                case 'Conference':
                    await Conference.findByIdAndDelete(id);
                    break;
                case 'GymSession':
                    await GymSession.findByIdAndDelete(id);
                    break;
                default:
                    await Event.findByIdAndDelete(id);
            }
            res.status(200).json({ success: true, message: 'Event deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async publishEvent(req, res) {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        event.status = 'published';
        await event.save();

        res.status(200).json({
            success: true,
            message: 'Event published successfully',
            event
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
};
