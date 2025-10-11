const GymSession = require('../models/GymSession');

module.exports = {
    // Create a new gym session
    async createGymSession(req, res){
        try {
            const { date, time, duration, type, capacity } = req.body;
            if (!date || !time || !duration || !type || !capacity) {
                return res.status(400).json({ message: 'All fields are required' });
            }
            const gymSession = await GymSession.create({ date, time, duration, type, capacity });
            res.status(201).json(gymSession);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Update a gym session
    async updateGymSession(req, res){
        try {
            const { id } = req.params;
            const { date, time, duration } = req.body;

            const gymSession = await GymSession.findById(id);
            if (!gymSession) {
                return res.status(404).json({ message: 'Gym session not found' });
            }

            if (date) gymSession.date = date;
            if (time) gymSession.time = time;
            if (duration) gymSession.duration = duration;

            await gymSession.save();
            res.status(200).json(gymSession);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Delete a gym session
    async deleteGymSession(req, res){
        try {
            const { id } = req.params;
            const gymSession = await GymSession.findByIdAndDelete(id);
            if (!gymSession) {
                return res.status(404).json({ message: 'Gym session not found' });
            }
            res.status(200).json({ message: 'Gym session deleted' });
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // View gym sessions monthly schedule default is current month
    async getMonthlySchedule(req, res){
        try {
            const now = new Date();
            const month = parseInt(req.query.month, 10) || now.getMonth()+1; // 1-12
            const year = parseInt(req.query.year, 10) || now.getFullYear(); // e.g., 2024

            // Calculate start and end dates for the month
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const sessions = await GymSession.find({
                date: { $gte: startDate, $lte: endDate }
            }).sort({ date: 1, time: 1 });

            res.status(200).json(sessions);
        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
}