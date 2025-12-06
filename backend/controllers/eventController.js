const Event = require('../models/Event');
const Vendor = require('../models/Vendor');
const VendorApplication = require('../models/VendorApplication');
const User = require('../models/User');
const Workshop = require('../models/Workshop');
const Trip = require('../models/Trip');
const Bazaar = require('../models/Bazaar');
const Booth = require('../models/Booth');
const Conference = require('../models/Conference');
const GymSession = require('../models/GymSession'); // NEW
const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const { ObjectId } = require('mongoose').Types;
const Payment = require('../models/Payment');
const {
    sendGymSessionCancellationEmail,
    sendGymSessionUpdateEmail,
    sendVendorVisitorPassesEmail,
    sendIndividualVisitorPassEmail
} = require('../utils/sendEmail');
const Notification = require('../models/Notification');
const VisitorPass = require('../models/VisitorPass');
const QRCode = require('qrcode');
const crypto = require('crypto');

const USER_ROLE_OPTIONS = ['Student', 'Staff', 'TA', 'Professor', 'Admin', 'EventOffice'];

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

function qualifiesForExternalVisitors(event) {
    if (!event) return { allowed: false };
    if (event.type === 'Bazaar') {
        return { allowed: true, category: 'Bazaar' };
    }
    const haystack = [
        event.category || '',
        event.title || '',
        Array.isArray(event.tags) ? event.tags.join(' ') : ''
    ]
        .join(' ')
        .toLowerCase();

    if (haystack.includes('career') && haystack.includes('fair')) {
        return { allowed: true, category: 'CareerFair' };
    }

    return { allowed: false };
}

function parseAllowedRoles(input) {
    if (input === undefined) return null;
    if (input === null) return [];

    let list;
    if (Array.isArray(input)) {
        list = input;
    } else if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return [];
        list = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
    } else {
        return null;
    }

    if (list.length === 0) return [];

    const normalized = [];
    list.forEach((role) => {
        if (!role) return;
        const match = USER_ROLE_OPTIONS.find(
            (opt) => opt.toLowerCase() === role.toString().toLowerCase()
        );
        if (match && !normalized.includes(match)) {
            normalized.push(match);
        }
    });

    if (normalized.length === 0) {
        throw new Error(
            `allowedRoles contains invalid values. Valid options: ${USER_ROLE_OPTIONS.join(', ')}`
        );
    }

    return normalized;
}

module.exports = {
    // GET /events/:id - Get a single event by id
    async getEventById(req, res) {
        try {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid event id' });
            const event = await Event.findById(id)
                .populate({ path: 'vendors', options: { strictPopulate: false } })
                .populate({ path: 'registeredUsers', select: 'firstName lastName email' });
            if (!event) return res.status(404).json({ message: 'Event not found' });
            res.json(event);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
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
        
            // Check for duplicate events (same title, location, and startDate)
            if (title && location && startDate) {
                const existingEvent = await Event.findOne({
                    title: title.trim(),
                    location: location.trim(),
                    startDate: new Date(startDate),
                    status: { $ne: 'cancelled' } // Don't count cancelled events as duplicates
                });
                
                if (existingEvent) {
                    return res.status(409).json({ 
                        error: 'An event with the same title, location, and start date already exists' 
                    });
                }
            }
        
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
                status: typeof status === 'string' ? status.toLowerCase() : undefined,
                createdBy: req.user._id
            };

            const allowedRoles = parseAllowedRoles(req.body.allowedRoles);
            if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
                eventData.allowedRoles = allowedRoles;
            }

            let event;

            switch (type) {
                case 'Workshop':
                    event = await Workshop.create({ ...eventData, professors, facultyName, requiredBudget, fundingSource, extraRequiredResourses });
                    const eventOffice = await User.find({ role: 'EventOffice' });
                    eventOffice.forEach(office => {
                        office.notifications.push({
                            message: `New workshop titled "${event.title}" has been submitted for approval.`,
                            date: new Date(),
                            read: false,
                        });
                        office.save();
                    });
                    break;
                case 'Trip':
                    event = await Trip.create({ ...eventData, price });
                    break;
                case 'Bazaar':
                    event = await Bazaar.create({ ...eventData, vendors });
                    break;
                case 'Booth':
                    event = await Booth.create({ ...eventData, vendors });
                    break;
                case 'Conference':
                    event = await Conference.create({ ...eventData, websiteLink, requiredBudget, fundingSource, extraRequiredResourses });
                    break;
                case 'GymSession':
                    event = await GymSession.create({ ...eventData, sessionType, instructor, equipment, difficulty, durationMinutes, prerequisites });
                    break;
                default:
                    event = await Event.create(eventData);
            }
            //  NEW EVENT NOTIFICATION � ONLY if published
            if (event.status === 'published') {
                try {
                    await Notification.create({
                        type: 'NewEventPublished',
                        message: `A new ${event.type || 'event'} has been added: ${event.title}`,
                        event: event._id,
                        recipientsRoles: ['Student', 'Staff', 'EventOffice', 'TA', 'Professor']
                    });
                } catch (notifyErr) {
                    // do NOT fail the request
                }
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
            // Show all published events (past and future)
            const events = await Event.find({ status: 'published' })
                .populate({ path: 'vendors', options: { strictPopulate: false } })
                .populate({ path: 'registeredUsers', select: 'firstName lastName email _id' })
                .sort({ startDate: 1 })
                .exec();
            const enriched = await attachApprovedParticipants(events);
            res.json(enriched);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async searchEvents(req, res) {
        try {
            const { q } = req.query;
            const regex = new RegExp(q || '', 'i');
            const baseMatch = {
                status: 'published',
                $or: [
                    { title: regex },
                    { description: regex },
                    { type: regex },
                    { category: regex }
                ]
            };
            const events = await Event.find(baseMatch)
                .populate({ path: 'vendors', options: { strictPopulate: false } })
                .populate({ path: 'registeredUsers', select: 'firstName lastName email _id' })
                .sort({ startDate: 1 })
                .exec();
            const enriched = await attachApprovedParticipants(events);
            res.json(enriched);
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
                    .populate({ path: 'registeredUsers', select: 'firstName lastName email _id' })
                    .sort({ startDate: 1 })
                    .exec();
            } else {
                // No startDate filter provided: include all published events (past and future)
                events = await Event.find(base)
                    .populate({ path: 'vendors', options: { strictPopulate: false } })
                    .populate({ path: 'registeredUsers', select: 'firstName lastName email _id' })
                    .sort({ startDate: 1 })
                    .exec();
            }

            const enriched = await attachApprovedParticipants(events);
            res.json(enriched);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async sortEvents(req, res) {
        try {
            const events = await Event.find()
                .sort({ startDate: 1 })
                .populate({ path: 'vendors', options: { strictPopulate: false } })
                .populate({ path: 'registeredUsers', select: 'firstName lastName email _id' });
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
            const events = Array.isArray(user?.registeredEvents) ? user.registeredEvents : [];
            if (events.length === 0) return res.json([]);

            const ids = events.map(e => e && e._id).filter(Boolean);
            let paidSet = new Set();
            try {
                const payments = await Payment.find({ user: userId, event: { $in: ids }, status: 'paid' }).select('event');
                paidSet = new Set(payments.map(p => String(p.event)));
            } catch (_) { /* ignore payment lookup errors */ }

            const enriched = events.map(e => {
                if (!e) return e;
                const obj = typeof e.toObject === 'function' ? e.toObject() : { ...e };
                obj.paid = paidSet.has(String(e._id));
                return obj;
            });
            res.json(enriched);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async getMyWorkshops(req, res) {
        try {
            const professorId = req.user._id;
            console.log('Fetching workshops for professor:', professorId);
            const workshops = await Workshop.find({ createdBy: professorId });
            console.log('Found workshops:', workshops.length, 'workshops');
            // Debug: Check if descriptions are present
            const workshopsWithDesc = workshops.filter(w => w.description).length;
            const workshopsWithEditRequest = workshops.filter(w => w.description && w.description.includes('EDIT REQUEST')).length;
            console.log('Workshop details:', {
                total: workshops.length,
                withDescription: workshopsWithDesc,
                withEditRequest: workshopsWithEditRequest,
                statuses: workshops.map(w => ({ title: w.title, status: w.status, hasDescription: !!w.description, descLength: w.description ? w.description.length : 0 }))
            });
            res.status(200).json(workshops);
        } catch (err) {
            console.error('Error in getMyWorkshops:', err);
            res.status(500).json({ error: err.message });
        }
    },// Add this to your eventController.js

    // GET /events/workshops/registrations - Get registered users & remaining spots for my workshops
    async getWorkshopRegistrations(req, res) {
        try {
            const professorId = req.user._id;

            // Find workshops created by this professor
            const workshops = await Workshop.find({ createdBy: professorId })
                .populate('registeredUsers', 'firstName lastName email') // populate user details
                .exec();

            // Map each workshop to include registered users and remaining spots
            const workshopsInfo = workshops.map(ws => {
                const registeredUsers = ws.registeredUsers || [];
                const capacity = ws.capacity || 0;
                const remainingSpots = capacity - registeredUsers.length;

                return {
                    id: ws._id,
                    title: ws.title,
                    startDate: ws.startDate,
                    endDate: ws.endDate,
                    location: ws.location,
                    capacity,
                    remainingSpots,
                    registeredUsers
                };
            });

            res.status(200).json({
                success: true,
                workshops: workshopsInfo
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    async viewWorkshopStatusAndEditRequests(req, res) {
        try {
            const workshopId = req.params.id;
            const workshop = await Workshop.findById(workshopId);
            if (!workshop) {
                return res.status(404).json({ error: 'Workshop not found' });
            }
            res.status(200).json({
                success: true,
                status: workshop.status,
                editRequests: workshop.editRequests
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    async registerForEvent(req, res) {
        try {
            const eventId = req.params.eventId;
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

            if (Array.isArray(event.allowedRoles) && event.allowedRoles.length > 0) {
                if (!event.allowedRoles.includes(user.role)) {
                    return res.status(403).json({
                        success: false,
                        message: `This event is restricted to: ${event.allowedRoles.join(', ')}`
                    });
                }
            }

            // Check if user already registered
            if (user.registeredEvents && user.registeredEvents.includes(eventId)) {
                return res.status(400).json({
                    success: false,
                    message: 'You are already registered for this event'
                });
            }

            // Add user to event's registeredUsers array using findByIdAndUpdate
            // This avoids full document validation which can fail for Workshop discriminators
            const updatedEvent = await Event.findByIdAndUpdate(
                eventId,
                { $addToSet: { registeredUsers: userId } },
                { new: true, runValidators: false }
            );

            if (!updatedEvent) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // Add event to user's registeredEvents array
            user.registeredEvents = user.registeredEvents || [];
            user.registeredEvents.push(eventId);
            await user.save();

            res.status(200).json({
                success: true,
                message: 'Successfully registered for the event',
                event: {
                    id: updatedEvent._id,
                    title: updatedEvent.title,
                    startDate: updatedEvent.startDate,
                    location: updatedEvent.location
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

            // Remove user from event's registeredUsers array using findByIdAndUpdate
            // This avoids full document validation which can fail for Workshop discriminators
            const updatedEvent = await Event.findByIdAndUpdate(
                eventId,
                { $pull: { registeredUsers: userId } },
                { new: true, runValidators: false }
            );

            if (!updatedEvent) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

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
            const { id } = req.params;
            const event = await Event.findById(id).populate('registeredUsers', 'email firstName lastName');
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }
            if (event.startDate <= new Date()) {
                return res.status(400).json({ error: 'Cannot update an event that has already started' });
            }

            // Store original values for comparison (especially for gym sessions)
            const originalEvent = {
                status: event.status,
                startDate: event.startDate,
                endDate: event.endDate,
                location: event.location,
                sessionType: event.sessionType,
                instructor: event.instructor,
                capacity: event.capacity
            };

            const {
                title, shortDescription, description, category, tags, startDate, endDate,
                location, capacity, status, registrationDeadline,
                professors, facultyName, requiredBudget, fundingSource, extraRequiredResourses,
                price, websiteLink, vendors,
                sessionType, instructor, equipment, difficulty, durationMinutes, prerequisites
            } = req.body;

            const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : undefined;

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
                ...(normalizedStatus && { status: normalizedStatus }),
                ...(registrationDeadline && { registrationDeadline })
            };

            if (Object.prototype.hasOwnProperty.call(req.body, 'allowedRoles')) {
                const parsedRoles = parseAllowedRoles(req.body.allowedRoles);
                if (parsedRoles === null || parsedRoles.length === 0) {
                    updatedData.allowedRoles = [];
                } else {
                    updatedData.allowedRoles = parsedRoles;
                }
            }

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

            // Check if workshop was updated after edit requests were made
            if (event.type === 'Workshop' && description !== undefined) {
                const originalDescription = event.description || '';
                const newDescription = description || '';
                
                // Check if original description had edit request markers
                const editRequestRegex = /--- EDIT REQUEST FROM EVENTS OFFICE \([^)]+\) ---[\s\S]*?--- END EDIT REQUEST ---/g;
                const originalHadEditRequests = editRequestRegex.test(originalDescription);
                const newHasEditRequests = editRequestRegex.test(newDescription);
                
                // If original had edit requests but new one doesn't, professor addressed them
                if (originalHadEditRequests && !newHasEditRequests) {
                    try {
                        // Get all EventOffice users
                        const eventOfficeUsers = await User.find({ role: 'EventOffice' });
                        
                        // Create backend notification
                        await Notification.create({
                            type: 'WorkshopEditSubmitted',
                            message: `Professor has updated workshop "${event.title}" after receiving edit requests. Please review the changes.`,
                            event: event._id,
                            recipientsRoles: ['EventOffice']
                        });
                        
                        // Also add to each EventOffice user's notifications array (legacy support)
                        for (const officeUser of eventOfficeUsers) {
                            officeUser.notifications.push({
                                message: `Professor has updated workshop "${event.title}" after receiving edit requests. Please review the changes.`,
                                date: new Date(),
                                read: false
                            });
                            await officeUser.save();
                        }
                    } catch (notifyErr) {
                        // Don't fail the update if notification fails
                        console.error('Failed to create workshop edit notification:', notifyErr);
                    }
                }
            }

            // Send email notifications for gym sessions
            if (event.type === 'GymSession' && event.registeredUsers && event.registeredUsers.length > 0) {
                // Check if session was cancelled
                if (status === 'cancelled' && originalEvent.status !== 'cancelled') {
                    // Send cancellation emails to all registered users
                    const emailPromises = event.registeredUsers
                        .filter(user => user && user.email)
                        .map(user => {
                            try {
                                return sendGymSessionCancellationEmail(user, updatedEvent || event);
                            } catch (emailError) {
                                return Promise.resolve(); // Don't fail the whole operation
                            }
                        });
                    await Promise.allSettled(emailPromises);
                }
                // Check if session was edited (not cancelled)
                else if (status !== 'cancelled' && originalEvent.status !== 'cancelled') {
                    // Detect changes - only check fields that were actually provided in the request
                    const changes = [];

                    if (startDate !== undefined) {
                        const newStart = new Date(startDate).getTime();
                        const oldStart = new Date(originalEvent.startDate).getTime();
                        if (newStart !== oldStart) {
                            changes.push(`Start date changed to ${new Date(startDate).toLocaleString()}`);
                        }
                    }

                    if (endDate !== undefined) {
                        const newEnd = new Date(endDate).getTime();
                        const oldEnd = originalEvent.endDate ? new Date(originalEvent.endDate).getTime() : null;
                        if (newEnd !== oldEnd) {
                            changes.push(`End date changed to ${new Date(endDate).toLocaleString()}`);
                        }
                    }

                    if (location !== undefined && location !== originalEvent.location) {
                        changes.push(`Location changed to ${location}`);
                    }

                    if (sessionType !== undefined && sessionType !== originalEvent.sessionType) {
                        changes.push(`Session type changed to ${sessionType}`);
                    }

                    if (instructor !== undefined && instructor !== originalEvent.instructor) {
                        changes.push(`Instructor changed to ${instructor}`);
                    }

                    if (capacity !== undefined && capacity !== originalEvent.capacity) {
                        changes.push(`Capacity changed to ${capacity}`);
                    }

                    // Only send update email if there are actual changes
                    if (changes.length > 0) {
                        const emailPromises = event.registeredUsers
                            .filter(user => user && user.email)
                            .map(user => {
                                try {
                                    return sendGymSessionUpdateEmail(user, updatedEvent || event, changes);
                                } catch (emailError) {
                                    return Promise.resolve(); // Don't fail the whole operation
                                }
                            });
                        await Promise.allSettled(emailPromises);
                    }
                }
            }

            res.status(200).json({
                success: true,
                message: 'Event updated successfully',
                event: updatedEvent
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    async archiveEvent(req, res) {
        try {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: 'Invalid event id' });
            }

            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }

            const now = new Date();
            const end = event.endDate ? new Date(event.endDate) : null;
            const start = event.startDate ? new Date(event.startDate) : null;
            const hasPassed = (end && end <= now) || (!end && start && start <= now);

            if (!hasPassed) {
                return res.status(400).json({
                    success: false,
                    message: 'Only past events can be archived'
                });
            }

            if (event.status === 'archived') {
                return res.status(200).json({
                    success: true,
                    message: 'Event already archived',
                    event
                });
            }

            event.status = 'archived';
            await event.save();

            res.status(200).json({
                success: true,
                message: 'Event archived successfully',
                event
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    async acceptOrRejectWorkshopRequests(req, res) {
        try {
            const { workshopId } = req.params;
            const { action } = req.body; // "accept" or "reject"

            // Only Admin or EventOffice can do this
            if (!['Admin', 'EventOffice'].includes(req.user.role)) {
                return res.status(403).json({ error: "Not authorized" });
            }

            const workshop = await Workshop.findById(workshopId).populate("createdBy");
            if (!workshop) {
                return res.status(404).json({ error: "Workshop not found" });
            }

            const professor = workshop.createdBy;
            if (!professor) {
                return res.status(404).json({ error: "Workshop creator not found" });
            }

            if (action === "accept") {
                workshop.status = "published";
                await workshop.save();

                // Send notification to professor
                professor.notifications.push({
                    message: `Your workshop "${workshop.title}" has been accepted and published.`,
                    date: new Date(),
                    read: false
                });
                await professor.save();

                return res.status(200).json({
                    success: true,
                    message: "Workshop approved and published",
                    workshop
                });

            } else if (action === "reject") {
                workshop.status = "rejected";
                await workshop.save();

                professor.notifications.push({
                    message: `Your workshop "${workshop.title}" has been rejected.`,
                    date: new Date(),
                    read: false
                });
                await professor.save();

                return res.status(200).json({
                    success: true,
                    message: "Workshop rejected.",
                    workshop
                });
            }

            return res.status(400).json({ error: 'Invalid action. Use "accept" or "reject".' });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },


    async requestWorkshopEdit(req, res) {
        try {
            const { workshopId } = req.params;
            const { field, requestedValue } = req.body;

            // Only EventOffice can request edits
            if (req.user.role !== "EventOffice") {
                return res.status(403).json({ error: "Only Event Office can request workshop edits" });
            }

            const workshop = await Workshop.findById(workshopId).populate("createdBy");
            if (!workshop) {
                return res.status(404).json({ error: "Workshop not found" });
            }

            const professor = workshop.createdBy;

            workshop.editRequests.push({
                field,
                requestedValue,
                requestedBy: req.user._id,
                date: new Date(),
                resolved: false
            });

            await workshop.save();

            // Notify professor
            professor.notifications.push({
                message: `The Event Office requested changes to your workshop "${workshop.title}" (Field: ${field}).`,
                date: new Date(),
                read: false
            });
            await professor.save();

            return res.status(200).json({
                success: true,
                message: "Edit request submitted successfully.",
                workshop
            });

        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },


    async deleteEvent(req, res) {
        try {
            const { id } = req.params;
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

        //  New Event Published notification
        try {
            await Notification.create({
                type: 'NewEventPublished',
                message: `A new ${event.type || 'event'} has been published: ${event.title}`,
                event: event._id,
                recipientsRoles: ['Student', 'Staff', 'EventOffice', 'TA', 'Professor']
            });
        } catch (notifyErr) {
            // don't fail the request because of a notification error
        }

        res.status(200).json({ success: true, message: 'Event published successfully', event });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },
    async addComment(req, res) {
        try {
            const { eventId } = req.params;
            const { content } = req.body;
            const userId = req.user._id;

            // First check if the event exists
            const eventObj = await Event.findById(eventId);
            if (!eventObj) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }

            // Check if the user is registered/attending this event before creating comment
            // Assuming event has a registeredUsers array of user IDs
            if (!eventObj.registeredUsers || !eventObj.registeredUsers.some(u => u.toString() === userId.toString())) {
                return res.status(403).json({ success: false, message: 'You must be registered for this event to comment.' });
            }

            // Only create comment if validation passes
            const comment = await Comment.create({ content, event: eventId, user: userId });
            res.status(201).json({ success: true, message: 'Comment added successfully', comment });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    async deleteComment(req, res) {
        try {
            const { commentId } = req.params;
            const comment = await Comment.findByIdAndDelete(commentId);
            res.status(200).json({ success: true, message: 'Comment deleted successfully', comment });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },
    async getEventComments(req, res) {
        try {
            const eventId = req.params.id;

            // Make sure event exists
            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            const comments = await Comment.find({ event: eventId })
                .populate('user', 'firstName lastName email') // adjust to your User fields
                .sort({ createdAt: -1 }); // newest first

            return res.status(200).json({
                success: true,
                count: comments.length,
                comments
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    async getEventRatings(req, res) {
        try {
            const eventId = req.params.id;

            // Make sure event exists
            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            const ratings = await Rating.find({ event: eventId })
                .populate('user', 'firstName lastName email') // adjust to your User fields
                .sort({ createdAt: -1 });

            const count = ratings.length;
            const average =
                count === 0
                    ? null
                    : ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / count;

            return res.status(200).json({
                success: true,
                count,
                averageRating: average,
                ratings
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },



    // Wrapper function for route /:id/ratings (maps id to eventId)
    async addEventRating(req, res) {
        const eventId = req.params.id;
        const { rating } = req.body;
        const userId = req.user._id;

        try {
            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            const now = new Date();

            if (!event.endDate || new Date(event.endDate) > now) {
                return res.status(400).json({
                    success: false,
                    message: 'You can only rate this event after it has ended.'
                });
            }

            if (!event.registeredUsers || !event.registeredUsers.some(u => u.toString() === userId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'You must be registered for this event to rate it.'
                });
            }

            const numericRating = Number(rating);
            if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be a number between 1 and 5.'
                });
            }

            const existing = await Rating.findOne({ event: eventId, user: userId });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already rated this event.'
                });
            }

            const newRating = await Rating.create({
                event: eventId,
                user: userId,
                rating: numericRating
            });

            return res.status(201).json({
                success: true,
                message: 'Rating added successfully',
                rating: newRating
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    async addEventToFavorites(req, res) {
        try {
            const { eventId } = req.params;
            const userId = req.user._id;

            // 1) Ensure event exists and is published (optional but makes sense)
            const event = await Event.findById(eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Event not found'
                });
            }

            // 2) Load user
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            user.favoriteEvents = user.favoriteEvents || [];

            // 3) Prevent duplicates
            const alreadyFav = user.favoriteEvents.some(
                (id) => id.toString() === eventId.toString()
            );
            if (alreadyFav) {
                return res.status(400).json({
                    success: false,
                    message: 'Event is already in your favorites list'
                });
            }

            // 4) Add to favorites and save
            user.favoriteEvents.push(eventId);
            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Event added to favorites successfully',
                event: {
                    id: event._id,
                    title: event.title,
                    type: event.type,
                    startDate: event.startDate,
                    location: event.location
                }
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    async getMyFavoriteEvents(req, res) {
        try {
            const userId = req.user._id;

            const user = await User.findById(userId).populate({
                path: 'favoriteEvents',
                populate: { path: 'vendors', options: { strictPopulate: false } }
            });

            const events = Array.isArray(user?.favoriteEvents) ? user.favoriteEvents : [];

            if (events.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'No favorite events yet',
                    events: []
                });
            }

            const enriched = await attachApprovedParticipants(events);

            return res.status(200).json({
                success: true,
                count: enriched.length,
                events: enriched
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    async generateVendorAttendeePasses(req, res) {
        try {
            const { applicationId } = req.params;

            if (!applicationId || !ObjectId.isValid(applicationId)) {
                return res.status(400).json({ success: false, message: 'Invalid vendor application id' });
            }

            const application = await VendorApplication.findById(applicationId)
                .populate('event', 'title type category tags status location startDate')
                .populate('vendorUser', 'email companyName');

            if (!application) {
                return res.status(404).json({ success: false, message: 'Vendor application not found' });
            }

            const event = application.event;
            if (!event) {
                return res.status(404).json({ success: false, message: 'Event linked to application not found' });
            }

            const eligibility = qualifiesForExternalVisitors(event);
            if (!eligibility.allowed) {
                return res.status(400).json({
                    success: false,
                    message: 'Only Bazaar or Career Fair events support attendee QR generation'
                });
            }

            if (!Array.isArray(application.attendees) || application.attendees.length === 0) {
                return res.status(400).json({ success: false, message: 'No attendees found on this vendor application' });
            }

            const created = [];
            const skipped = [];

            for (const attendee of application.attendees) {
                if (!attendee || !attendee.name) continue;

                const existing = await VisitorPass.findOne({
                    $or: [
                        {
                            vendorApplication: application._id,
                            visitorEmail: attendee.email || undefined,
                            visitorName: attendee.name
                        },
                        {
                            vendorApplication: { $exists: false },
                            event: event._id,
                            visitorEmail: attendee.email || undefined,
                            visitorName: attendee.name
                        }
                    ]
                });

                if (existing) {
                    skipped.push({ visitorName: attendee.name, reason: 'Already generated' });
                    continue;
                }

                const passCode = crypto.randomBytes(8).toString('hex').toUpperCase();
                const payload = {
                    eventId: event._id.toString(),
                    eventTitle: event.title,
                    eventType: event.type,
                    vendorApplicationId: application._id.toString(),
                    organization: application.organization,
                    visitorName: attendee.name,
                    visitorEmail: attendee.email,
                    visitorIdNumber: attendee.idNumber,
                    passCode,
                    issuedAt: new Date().toISOString()
                };

                const qrData = JSON.stringify(payload);
                const qrImageDataUrl = await QRCode.toDataURL(qrData, {
                    width: 320,
                    margin: 1,
                    errorCorrectionLevel: 'H'
                });

                const pass = await VisitorPass.create({
                    event: event._id,
                    vendorApplication: application._id,
                    eventTitle: event.title,
                    eventType: event.type,
                    visitorName: attendee.name,
                    visitorEmail: attendee.email,
                    visitorOrganization: application.organization,
                    visitorIdNumber: attendee.idNumber,
                    purpose: `Vendor attendee for ${event.title}`,
                    passCode,
                    qrData,
                    qrImageDataUrl,
                    createdBy: req.user._id
                });

                created.push(pass);
            }

            let emailError = null;
            let visitorEmailsSent = 0;
            try {
                const passesForEmail = await VisitorPass.find({
                    $or: [
                        { vendorApplication: application._id },
                        {
                            vendorApplication: { $exists: false },
                            event: event._id,
                            visitorOrganization: application.organization
                        }
                    ]
                })
                    .select('visitorName visitorEmail visitorIdNumber passCode qrImageDataUrl')
                    .sort({ createdAt: 1 })
                    .lean();

                if (passesForEmail.length) {
                    if (application.vendorUser?.email) {
                        await sendVendorVisitorPassesEmail(
                            application.vendorUser,
                            event,
                            application.organization,
                            passesForEmail
                        );
                    } else {
                        console.warn('Vendor email not found for application:', applicationId);
                    }

                    const passesWithEmails = passesForEmail.filter(p => Boolean(p.visitorEmail));
                    if (passesWithEmails.length) {
                        const emailResults = await Promise.allSettled(
                            passesWithEmails.map(pass =>
                                sendIndividualVisitorPassEmail(pass, event, application.organization)
                            )
                        );
                        visitorEmailsSent = emailResults.filter(r => r.status === 'fulfilled').length;
                        const failedEmails = emailResults.filter(r => r.status === 'rejected');
                        if (failedEmails.length) {
                            console.error('Failed to email some visitor passes individually:', failedEmails);
                        }
                    }
                }
            } catch (err) {
                emailError = err;
                console.error('Failed to email vendor visitor passes:', err);
            }

            res.status(201).json({
                success: true,
                message: `Generated ${created.length} attendee QR codes`,
                createdCount: created.length,
                skipped,
                passes: created,
                emailDelivered: !emailError,
                visitorEmailsSent
            });
        } catch (error) {
            console.error('generateVendorAttendeePasses error:', error);
            res.status(500).json({ success: false, message: 'Failed to generate attendee QR codes', error: error.message });
        }
    },
    // POST /events/workshops/:id/resources
    // Professor uploads resources (PDFs, slides, materials) for a workshop
    async uploadWorkshopResources(req, res) {
        try {
            const workshopId = req.params.id;

            const workshop = await Workshop.findById(workshopId);
            if (!workshop) {
                return res.status(404).json({
                    success: false,
                    message: 'Workshop not found'
                });
            }

            // Role is already enforced via route-level roleCheck('Professor')

            const files = req.files || [];
            if (!files.length) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            const newResources = files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url: `/uploads/workshop-resources/${file.filename}`,
                uploadedAt: new Date()
            }));

            if (!Array.isArray(workshop.resources)) {
                workshop.resources = [];
            }
            workshop.resources.push(...newResources);

            await workshop.save();

            return res.status(201).json({
                success: true,
                message: 'Workshop resources uploaded successfully',
                data: workshop.resources
            });
        } catch (err) {
            console.error('Error in uploadWorkshopResources:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload workshop resources',
                error: err.message
            });
        }
    },

    // GET /events/workshops/:id/resources
    // Only participants who attended can access the list of resources
    async getWorkshopResources(req, res) {
        try {
            const workshopId = req.params.id;
            const userId = req.user._id;

            const workshop = await Workshop.findById(workshopId).populate(
                'attendedParticipants',
                '_id firstName lastName email'
            );
            if (!workshop) {
                return res.status(404).json({
                    success: false,
                    message: 'Workshop not found'
                });
            }

            const attendedList = Array.isArray(workshop.attendedParticipants)
                ? workshop.attendedParticipants
                : [];

            const hasAttended = attendedList.some(
                u => u && u._id && u._id.toString() === userId.toString()
            );

            if (!hasAttended) {
                return res.status(403).json({
                    success: false,
                    message: 'Only participants who attended this workshop can access its resources'
                });
            }

            return res.status(200).json({
                success: true,
                data: workshop.resources || []
            });
        } catch (err) {
            console.error('Error in getWorkshopResources:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve workshop resources',
                error: err.message
            });
        }
    }



};
