// Poll service - tries backend API first, falls back to localStorage
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const POLLS_KEY = 'boothPolls';
const VOTES_KEY = 'boothPollVotes';

async function fetchJson(url, opts = {}) {
  const token = localStorage.getItem('token') || '';
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// Try backend API first, fall back to localStorage
export async function getAllPolls() {
  try {
    // Try backend API
    const res = await fetchJson(`${API_BASE}/polls`);
    if (res.polls && Array.isArray(res.polls)) {
      return res.polls;
    }
  } catch (err) {
    console.log('Backend API not available, using localStorage:', err.message);
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem(POLLS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error('Error loading polls from localStorage:', err);
    return [];
  }
}

export async function getPollById(pollId) {
  const polls = await getAllPolls();
  return polls.find(p => p.id === pollId);
}

export async function createPoll(pollData) {
  try {
    const polls = await getAllPolls();
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

export async function updatePoll(pollId, updates) {
  try {
    const polls = await getAllPolls();
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

export async function deletePoll(pollId) {
  try {
    const polls = await getAllPolls();
    const filtered = polls.filter(p => p.id !== pollId);
    localStorage.setItem(POLLS_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Error deleting poll:', err);
    throw err;
  }
}

export async function voteOnPoll(pollId, vendorApplicationId, userId) {
  try {
    // Try backend API first
    try {
      const res = await fetchJson(`${API_BASE}/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vendorApplicationId, userId })
      });
      if (res.poll) {
        // Update localStorage cache
        const polls = await getAllPolls();
        const index = polls.findIndex(p => p.id === pollId);
        if (index !== -1) {
          polls[index] = res.poll;
          localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
        }
        return res.poll;
      }
    } catch (apiErr) {
      console.log('Backend vote API not available, using localStorage:', apiErr.message);
    }
    
    // Fallback to localStorage
    const polls = await getAllPolls();
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

export async function getPollsForEvent(eventId) {
  const polls = await getAllPolls();
  return polls.filter(p => p.eventId === eventId);
}

export async function getActivePolls() {
  const polls = await getAllPolls();
  return polls.filter(p => p.status === 'active');
}

