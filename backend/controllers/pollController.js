const mongoose = require('mongoose');
const Poll = require('../models/Poll');
const VendorApplication = require('../models/VendorApplication');
const Event = require('../models/Event');
const User = require('../models/User');

// Get vendor applications that can be used for creating polls
// (pending booth applications for a specific event)
exports.getVendorApplicationsForPoll = async (req, res) => {
  try {
    const { eventId, setupDurationWeeks } = req.query;

    if (!eventId) {
      return res.status(400).json({ 
        success: false,
        message: 'eventId is required' 
      });
    }

    // Validate event exists and is a Booth
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    if (event.type !== 'Booth') {
      return res.status(400).json({ 
        success: false,
        message: 'Polls can only be created for Booth events' 
      });
    }

    // Build filter for pending vendor applications
    const filter = {
      event: eventId,
      status: 'pending'
    };

    // Optionally filter by setup duration
    if (setupDurationWeeks) {
      filter.setupDurationWeeks = parseInt(setupDurationWeeks);
    }

    const applications = await VendorApplication.find(filter)
      .populate('vendorUser', 'companyName email')
      .populate('event', 'title type startDate endDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications: applications.map(app => ({
        _id: app._id,
        organization: app.organization,
        vendorUser: app.vendorUser,
        event: app.event,
        boothSize: app.boothSize,
        setupDurationWeeks: app.setupDurationWeeks,
        setupLocation: app.setupLocation,
        attendees: app.attendees,
        createdAt: app.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting vendor applications for poll:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

// Create a poll for vendor booth applications
exports.createPoll = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      eventId, 
      vendorApplicationIds, 
      votingStartDate, 
      votingEndDate 
    } = req.body;

    // Validation
    if (!title || !eventId || !vendorApplicationIds || !Array.isArray(vendorApplicationIds) || vendorApplicationIds.length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, eventId, and at least 2 vendor application IDs are required' 
      });
    }

    if (!votingStartDate || !votingEndDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Voting dates (votingStartDate, votingEndDate) are required' 
      });
    }

    // Validate event exists and is a Booth event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found' 
      });
    }

    if (event.type !== 'Booth') {
      return res.status(400).json({ 
        success: false,
        message: 'Polls can only be created for Booth events' 
      });
    }

    // Validate all vendor application IDs are valid ObjectIds and convert to ObjectIds
    const invalidIds = vendorApplicationIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Invalid vendor application IDs: ${invalidIds.join(', ')}` 
      });
    }

    // Convert all IDs to ObjectIds for consistent comparison
    const vendorAppObjectIds = vendorApplicationIds.map(id => new mongoose.Types.ObjectId(id));
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Check for duplicates in input first
    const uniqueInputIds = [...new Set(vendorApplicationIds.map(String))];
    if (uniqueInputIds.length !== vendorApplicationIds.length) {
      return res.status(400).json({ 
        success: false,
        message: 'Duplicate vendor application IDs in request' 
      });
    }

    // Check if all vendor applications exist
    const allApplications = await VendorApplication.find({ 
      _id: { $in: vendorAppObjectIds }
    });

    if (allApplications.length !== vendorApplicationIds.length) {
      // Convert found IDs to strings for comparison
      const foundIds = allApplications.map(app => String(app._id));
      // Convert input IDs to strings and find missing ones
      const inputIdsAsStrings = vendorApplicationIds.map(String);
      const missingIds = inputIdsAsStrings.filter(id => !foundIds.includes(id));
      
      console.log('Debug - Input IDs:', vendorApplicationIds);
      console.log('Debug - Found IDs:', foundIds);
      console.log('Debug - Missing IDs:', missingIds);
      
      return res.status(400).json({ 
        success: false,
        message: missingIds.length > 0 
          ? `Vendor applications not found: ${missingIds.join(', ')}` 
          : `Expected ${vendorApplicationIds.length} vendor applications, found ${allApplications.length}. Please verify the IDs are correct.`
      });
    }

    // Check if all vendor applications are for the specified event
    const vendorApplications = allApplications.filter(app => 
      String(app.event) === String(eventId)
    );

    if (vendorApplications.length !== vendorApplicationIds.length) {
      const wrongEventIds = allApplications
        .filter(app => String(app.event) !== String(eventId))
        .map(app => ({
          id: String(app._id),
          eventId: String(app.event)
        }));
      
      return res.status(400).json({ 
        success: false,
        message: `Some vendor applications are not for this event. Found ${wrongEventIds.length} application(s) for different event(s). Application IDs: ${wrongEventIds.map(w => w.id).join(', ')}` 
      });
    }

    // Check if vendor applications have overlapping durations
    // This is the key requirement - they should be requesting the same duration
    const setupDurations = vendorApplications.map(app => ({
      appId: app._id,
      duration: app.setupDurationWeeks,
      location: app.setupLocation
    }));

    // Check if all have the same setup duration (optional validation)
    const uniqueDurations = [...new Set(setupDurations.map(d => d.duration))];
    if (uniqueDurations.length > 1) {
      // Allow different durations but warn
      console.log('Warning: Vendor applications have different setup durations');
    }

    // Validate voting date ranges
    const votingStart = new Date(votingStartDate);
    const votingEnd = new Date(votingEndDate);

    if (votingStart >= votingEnd) {
      return res.status(400).json({ 
        success: false,
        message: 'Voting start date must be before voting end date' 
      });
    }

    // Create the poll
    const poll = await Poll.create({
      title,
      description,
      createdBy: req.user._id,
      event: eventId,
      vendorApplications: vendorApplicationIds,
      votingStartDate: votingStart,
      votingEndDate: votingEnd,
      status: 'active',
      votes: []
    });

    // Populate for response
    await poll.populate([
      { path: 'event', select: 'title type startDate endDate location' },
      { path: 'vendorApplications', populate: { path: 'vendorUser', select: 'companyName email' } },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Poll created successfully',
      poll
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

// List all polls
exports.listPolls = async (req, res) => {
  try {
    const { status, eventId, activeOnly, votingOpen } = req.query;
    
    const filter = {};
    
    // Status filter
    if (status) {
      filter.status = status;
    } else if (activeOnly === 'true') {
      // activeOnly means show polls with active status
      filter.status = 'active';
    }
    
    // Event filter
    if (eventId) filter.event = eventId;
    
    // Voting period filter - separate from status filter
    // Only filter by voting period if votingOpen is explicitly requested
    if (votingOpen === 'true') {
      const now = new Date();
      // Voting period must have started and not ended
      if (filter.$and) {
        filter.$and.push(
          { votingStartDate: { $lte: now } },
          { votingEndDate: { $gte: now } }
        );
      } else {
        filter.$and = [
          { votingStartDate: { $lte: now } },
          { votingEndDate: { $gte: now } }
        ];
      }
    }

    console.log('Poll filter:', JSON.stringify(filter, null, 2));
    const polls = await Poll.find(filter)
      .populate('event', 'title type startDate endDate location')
      .populate({
        path: 'vendorApplications',
        populate: { path: 'vendorUser', select: 'companyName email' }
      })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log(`Found ${polls.length} polls matching filter`);

    // Calculate vote counts for each poll and check if user has voted
    const userId = req.user ? req.user._id : null;
    const pollsWithVotes = polls.map(poll => {
      const voteCounts = {};
      poll.votes.forEach(vote => {
        const appId = String(vote.vendorApplication);
        voteCounts[appId] = (voteCounts[appId] || 0) + 1;
      });

      // Check if current user has voted
      const userVote = userId ? poll.votes.find(v => String(v.user) === String(userId)) : null;

      const pollObj = poll.toObject();
      pollObj.voteCounts = voteCounts;
      pollObj.totalVotes = poll.votes.length;
      pollObj.hasVoted = !!userVote;
      pollObj.userVote = userVote ? String(userVote.vendorApplication) : null;
      
      return pollObj;
    });

    res.status(200).json({
      success: true,
      count: pollsWithVotes.length,
      polls: pollsWithVotes
    });
  } catch (error) {
    console.error('Error listing polls:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

// Get a specific poll with vote counts
exports.getPoll = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findById(pollId)
      .populate('event', 'title type startDate endDate location')
      .populate({
        path: 'vendorApplications',
        populate: { path: 'vendorUser', select: 'companyName email' }
      })
      .populate('createdBy', 'firstName lastName email')
      .populate('votes.user', 'firstName lastName email role');

    if (!poll) {
      return res.status(404).json({ 
        success: false,
        message: 'Poll not found' 
      });
    }

    // Calculate vote counts
    const voteCounts = {};
    poll.votes.forEach(vote => {
      const appId = String(vote.vendorApplication);
      voteCounts[appId] = (voteCounts[appId] || 0) + 1;
    });

    // Get vote breakdown per vendor application
    const voteBreakdown = poll.vendorApplications.map(app => ({
      vendorApplication: app,
      voteCount: voteCounts[String(app._id)] || 0,
      votes: poll.votes
        .filter(v => String(v.vendorApplication) === String(app._id))
        .map(v => ({
          user: v.user,
          votedAt: v.votedAt
        }))
    }));

    // Check if current user has voted
    const userId = req.user ? req.user._id : null;
    const userVote = userId ? poll.votes.find(v => String(v.user) === String(userId)) : null;

    const pollObj = poll.toObject();
    pollObj.voteCounts = voteCounts;
    pollObj.totalVotes = poll.votes.length;
    pollObj.voteBreakdown = voteBreakdown;
    pollObj.hasVoted = !!userVote;
    pollObj.userVote = userVote ? String(userVote.vendorApplication) : null;

    res.status(200).json({
      success: true,
      poll: pollObj
    });
  } catch (error) {
    console.error('Error getting poll:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

// Vote on a poll
exports.voteOnPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { vendorApplicationId } = req.body;

    if (!vendorApplicationId) {
      return res.status(400).json({ 
        success: false,
        message: 'vendorApplicationId is required' 
      });
    }

    // Get poll
    const poll = await Poll.findById(pollId)
      .populate('vendorApplications');

    if (!poll) {
      return res.status(404).json({ 
        success: false,
        message: 'Poll not found' 
      });
    }

    // Check if poll is active
    if (poll.status !== 'active') {
      return res.status(400).json({ 
        success: false,
        message: 'Poll is not active' 
      });
    }

    // Check if voting period is open
    const now = new Date();
    if (now < poll.votingStartDate || now > poll.votingEndDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Voting period is not open' 
      });
    }

    // Validate vendor application is in this poll
    const isValidApplication = poll.vendorApplications.some(
      app => String(app._id) === String(vendorApplicationId)
    );

    if (!isValidApplication) {
      return res.status(400).json({ 
        success: false,
        message: 'Vendor application is not part of this poll' 
      });
    }

    // Check if user has already voted
    const existingVote = poll.votes.find(
      vote => String(vote.user) === String(req.user._id)
    );

    if (existingVote) {
      // Update existing vote
      existingVote.vendorApplication = vendorApplicationId;
      existingVote.votedAt = now;
    } else {
      // Add new vote
      poll.votes.push({
        user: req.user._id,
        vendorApplication: vendorApplicationId,
        votedAt: now
      });
    }

    await poll.save();

    // Get updated poll with vote counts
    await poll.populate([
      { path: 'event', select: 'title type' },
      { path: 'vendorApplications', populate: { path: 'vendorUser', select: 'companyName email' } }
    ]);

    const voteCounts = {};
    poll.votes.forEach(vote => {
      const appId = String(vote.vendorApplication);
      voteCounts[appId] = (voteCounts[appId] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      message: existingVote ? 'Vote updated successfully' : 'Vote submitted successfully',
      poll: {
        _id: poll._id,
        title: poll.title,
        voteCounts,
        totalVotes: poll.votes.length,
        yourVote: vendorApplicationId
      }
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

// Close/complete a poll (EventOffice only)
exports.closePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { status } = req.body; // 'closed' or 'completed'

    if (!['closed', 'completed'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Status must be "closed" or "completed"' 
      });
    }

    const poll = await Poll.findByIdAndUpdate(
      pollId,
      { status },
      { new: true }
    )
      .populate('event', 'title type')
      .populate({
        path: 'vendorApplications',
        populate: { path: 'vendorUser', select: 'companyName email' }
      });

    if (!poll) {
      return res.status(404).json({ 
        success: false,
        message: 'Poll not found' 
      });
    }

    // Calculate vote counts
    const voteCounts = {};
    poll.votes.forEach(vote => {
      const appId = String(vote.vendorApplication);
      voteCounts[appId] = (voteCounts[appId] || 0) + 1;
    });

    // Find winner (vendor application with most votes)
    let winner = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([appId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = appId;
      }
    });

    const pollObj = poll.toObject();
    pollObj.voteCounts = voteCounts;
    pollObj.totalVotes = poll.votes.length;
    pollObj.winner = winner ? poll.vendorApplications.find(app => String(app._id) === winner) : null;

    res.status(200).json({
      success: true,
      message: `Poll ${status} successfully`,
      poll: pollObj
    });
  } catch (error) {
    console.error('Error closing poll:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal Server Error', 
      error: error.message 
    });
  }
};

