const Court = require('../models/Court'); // Adjust path as needed

// GET /courts - Retrieve all courts
const getAllCourts = async (req, res) => {
    try {
        const courts = await Court.find(
            { status: 'available' }
        );
        res.status(200).json(courts);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving courts', error: error.message });
    }
};

module.exports = {
    getAllCourts,
};