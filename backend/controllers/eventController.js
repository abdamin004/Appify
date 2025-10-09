const Event = require('../models/Event');
const Vendor = require('../models/Vendor'); 
const User = require('../models/User');

module.exports = {
    // POST /events/create - Create a new event
    async createEvent(req, res) {
        try {
            // Ensure the request is authenticated and we have a user id
            /*if (!req.user || !req.user._id) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }*/

            const{
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
                status
                //createdBy: req.user._id // for testing purposes
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
                vendors,
                capacity,
                status
                //createdBy: req.user._id // for testing purposes
            };

            const event = await Event.create(eventData);

            res.status(201).json({
                success: true,
                message: 'Event created successfully.',
                event
            });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
    },

    // GET /events - View all upcoming events with details and vendors
    async getAllEvents(req, res) {
        try {
            const events = await Event.find({ startDate: { $gte: new Date() } , status:'published'})
                .populate('vendors')
                .exec();
            res.json(events);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // GET /events/search - Search events by professor name, event name, or type
    async searchEvents(req, res) {
        try {
            const { q } = req.query;
            const regex = new RegExp(q, 'i');
            const events = await Event.find({
                $or: [
                    { title: regex },
                    { description: regex },
                    { type: regex },
                    { category: regex },
                    { professorName: regex }
                ]
            }).populate('vendors');
            res.json(events);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // GET /events/filter - Filter events by professor name, location, type, or date
    async filterEvents(req, res) { 
    try {
        const { category, location, type, startDate, professorName } = req.query;

        const filter = {};

        // Filter by category
        if (category) filter.category =  new RegExp(category, 'i');

        // Filter by location
        if (location) filter.location =  new RegExp(location, 'i');

        // Filter by type
        if (type) filter.type =  new RegExp(type, 'i');

        // Filter by date (>= startDate)
        if (startDate) filter.startDate = { $gte: new Date(startDate) };

        // Filter by professor name (case-insensitive, partial match)
        if (professorName) filter.professorName = new RegExp(professorName, 'i'); 
        

        const events = await Event.find(filter)
        .populate('vendors')
        .sort({ startDate: 1 })
        .exec();

        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
    },


    // GET /events/sort - Sort events by date
    async sortEvents(req, res) {
        try {
            const events = await Event.find().sort({ startDate: 1 }).populate('vendors');
            res.json(events);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // GET /events/registered - View a list of my registered events
    async getRegisteredEvents(req, res) {
        try {
            const userId = req.user._id; //dah 7aslo set bel auth middleware
            const user = await User.findById(userId).populate({
                path: 'registeredEvents',
                populate: { path: 'vendors' }
            });
            res.json(user.registeredEvents || []);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};