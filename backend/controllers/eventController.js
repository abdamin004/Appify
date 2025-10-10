const Event = require('../models/Event');
const Vendor = require('../models/Vendor'); 
const User = require('../models/User');
const Workshop = require('../models/Workshop');
const Trip = require('../models/Trip');
const Bazaar = require('../models/Bazaar');

module.exports = {
    // POST /events/create - Create a new event
    async createEvent(req, res) {
        try {
            // Ensure the request is authenticated and we have a user id
            /*if (!req.user || !req.user._id) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }*/

            //has all the fields for all event types
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
                status,
                registrationDeadline, 
                professors, //starting here added fields for the different event types
                facultyName,
                requiredBudget,
                fundingSource,
                extraRequiredResourses,
                price
                //createdBy: req.user._id // for testing purposes
            } = req.body;
        
            //has only the parent class fields
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
                status
                //createdBy: req.user._id // for testing purposes
            };

            let event;

            switch (type) {
                //creates a workshop event
                case 'Workshop':
                    event = await Workshop.create({...eventData, professors, facultyName, requiredBudget, fundingSource, extraRequiredResourses});
                    break;
                //creates a trip event
                case 'Trip':
                    event = await Trip.create({...eventData, price});
                    break;
                //creates a bazaar event
                case 'Bazaar':  
                    event = await Bazaar.create({...eventData, vendors});
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

    // GET /events - View all upcoming events with details and vendors
    async getAllEvents(req, res) {
        try {
            const events = await Event.find({ startDate: { $gte: new Date() } , status:'published'})
                .populate({ path: 'vendors', options: { strictPopulate: false } })//adjusted as vendors only exist in bazaars now
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
                    { 'professorName': regex } // adjusted this as professor name only exists for workshops
                ]
            }).populate({ path: 'vendors', options: { strictPopulate: false } });//adjusted as vendors only exist in bazaars now
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
        if (professorName) filter['professors.name'] = { $regex: new RegExp(professorName, 'i') }; // adjusted this as professor name only exists for workshops
        

        const events = await Event.find(filter)
        .populate({ path: 'vendors', options: { strictPopulate: false } })//adjusted as vendors only exist in bazaars now
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
            const events = await Event.find().sort({ startDate: 1 }).populate({ path: 'vendors', options: { strictPopulate: false } });//adjusted as vendors only exist in bazaars now
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
                populate: { path: 'vendors', options: { strictPopulate: false } } //adjusted as vendors only exist in bazaars now
            });
            res.json(user.registeredEvents || []);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    //GET /events/workshops/mine - View a list of my created workshops (Professors only)
    async getMyWorkshops(req, res) {
        try {
            // Ensure the request is authenticated and the user is a professor
            /*if (!req.user || req.user.role !== 'professor') {
                return res.status(403).json({ error: 'Access denied. Only professors can view their workshops.' });
            }*/

            //const workshops = await Workshop.find({ createdBy: req.user._id });
            // TEMPORARY for testing without auth
            const professorId = req.query.professorId || '670abc12345...'; // put any test professor _id from your DB
            const workshops = await Workshop.find({ createdBy: professorId });

            res.status(200).json(workshops);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // PUT /events/update/:id - Update event details (Admin/Staff only)(as long as the event hasn't started yet)
    async updateEvent(req, res) {
        try {
            const {id} = req.params;
            const {type} = req.body;
            const event = await Event.findById(id);
            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }
            if (event.startDate <= new Date()) {
                return res.status(400).json({ error: 'Cannot update an event that has already started' });
            }
            const {title, shortDescription, description, category, tags, startDate, endDate, location, capacity, status, registrationDeadline,
                    // Child-specific fields
                    professors,
                    facultyName,
                    requiredBudget,
                    fundingSource,
                    extraRequiredResourses,
                    price,
                    vendors} = req.body;

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
            }

            const updatedEvent = await Event.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true }).populate({ path: 'vendors', options: { strictPopulate: false } });
            res.status(200).json({
                success: true,
                message: 'Event updated successfully',
                event: updatedEvent
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    //DELETE /events/delete/:id - Delete an event (Admin/Staff only)(as long as the event hasn't started yet)
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
            // Ensure only admins or the event creator can delete
            /*if (req.user.role != 'admin' && req.user.role != 'event office' && event.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to delete this event' });
            }*/
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
            default:
                await Event.findByIdAndDelete(id);
            }
            res.status(200).json({ success: true, message: 'Event deleted successfully' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};