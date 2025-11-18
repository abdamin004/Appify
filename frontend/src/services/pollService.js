// Frontend-only poll service using localStorage
const POLLS_KEY = 'boothPolls';
const VOTES_KEY = 'boothPollVotes';

export function getAllPolls() {
  try {
    const stored = localStorage.getItem(POLLS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Error loading polls:', err);
    return [];
  }
}

export function getPollById(pollId) {
  const polls = getAllPolls();
  return polls.find(p => p.id === pollId);
}

export function createPoll(pollData) {
  try {
    const polls = getAllPolls();
    const newPoll = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...pollData,
      createdAt: new Date().toISOString(),
      status: 'active', // active, closed
      votes: {},
    };
    polls.push(newPoll);
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
    return newPoll;
  } catch (err) {
    console.error('Error creating poll:', err);
    throw err;
  }
}

export function updatePoll(pollId, updates) {
  try {
    const polls = getAllPolls();
    const index = polls.findIndex(p => p.id === pollId);
    if (index === -1) throw new Error('Poll not found');
    
    polls[index] = { ...polls[index], ...updates };
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
    return polls[index];
  } catch (err) {
    console.error('Error updating poll:', err);
    throw err;
  }
}

export function deletePoll(pollId) {
  try {
    const polls = getAllPolls();
    const filtered = polls.filter(p => p.id !== pollId);
    localStorage.setItem(POLLS_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Error deleting poll:', err);
    throw err;
  }
}

export function voteOnPoll(pollId, vendorApplicationId, userId) {
  try {
    const polls = getAllPolls();
    const poll = polls.find(p => p.id === pollId);
    if (!poll) throw new Error('Poll not found');
    
    // Get user's existing votes for this poll
    const votes = getVotesForPoll(pollId);
    const userVoteKey = `${pollId}_${userId}`;
    
    // Update vote
    votes[userVoteKey] = vendorApplicationId;
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
    
    // Update poll vote counts
    const voteCounts = {};
    Object.values(votes).forEach(vendorId => {
      if (vendorId && poll.vendorApplications.some(va => va.id === vendorId)) {
        voteCounts[vendorId] = (voteCounts[vendorId] || 0) + 1;
      }
    });
    
    poll.voteCounts = voteCounts;
    poll.totalVotes = Object.keys(votes).length;
    
    const index = polls.findIndex(p => p.id === pollId);
    polls[index] = poll;
    localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
    
    return poll;
  } catch (err) {
    console.error('Error voting on poll:', err);
    throw err;
  }
}

export function getVotesForPoll(pollId) {
  try {
    const stored = localStorage.getItem(VOTES_KEY);
    const allVotes = stored ? JSON.parse(stored) : {};
    const pollVotes = {};
    Object.keys(allVotes).forEach(key => {
      if (key.startsWith(`${pollId}_`)) {
        pollVotes[key] = allVotes[key];
      }
    });
    return pollVotes;
  } catch (err) {
    console.error('Error loading votes:', err);
    return {};
  }
}

export function getUserVoteForPoll(pollId, userId) {
  const votes = getVotesForPoll(pollId);
  const userVoteKey = `${pollId}_${userId}`;
  return votes[userVoteKey] || null;
}

export function getPollsForEvent(eventId) {
  const polls = getAllPolls();
  return polls.filter(p => p.eventId === eventId);
}

export function getActivePolls() {
  const polls = getAllPolls();
  return polls.filter(p => p.status === 'active');
}

