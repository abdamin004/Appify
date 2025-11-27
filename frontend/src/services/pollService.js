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
  try {
    // Try backend API first
    try {
      const res = await fetchJson(`${API_BASE}/polls/${pollId}`);
      if (res.poll) {
        return res.poll;
      }
    } catch (apiErr) {
      // Fallback to getAllPolls
    }
    
    const polls = await getAllPolls();
    return polls.find(p => (p.id === pollId || p._id === pollId));
  } catch (err) {
    console.error('Error getting poll by ID:', err);
    return null;
  }
}

export async function createPoll(pollData) {
  try {
    // Try backend API first
    try {
      const res = await fetchJson(`${API_BASE}/polls/create`, {
        method: 'POST',
        body: JSON.stringify(pollData)
      });
      if (res.poll) {
        return res.poll;
      }
      throw new Error(res.message || 'Failed to create poll');
    } catch (apiErr) {
      // If backend fails, throw the error (don't fallback to localStorage for creation)
      throw apiErr;
    }
  } catch (err) {
    console.error('Error creating poll:', err);
    throw err;
  }
}

export async function updatePoll(pollId, updates) {
  try {
    // Try backend API first
    try {
      const res = await fetchJson(`${API_BASE}/polls/${pollId}/close`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      if (res.poll) {
        return res.poll;
      }
    } catch (apiErr) {
      // Fallback to localStorage for updates
      const polls = await getAllPolls();
      const index = polls.findIndex(p => p.id === pollId || p._id === pollId);
      if (index === -1) throw new Error('Poll not found');
      
      polls[index] = { ...polls[index], ...updates };
      localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
      return polls[index];
    }
  } catch (err) {
    console.error('Error updating poll:', err);
    throw err;
  }
}

export async function deletePoll(pollId) {
  try {
    // Try backend API first
    const res = await fetchJson(`${API_BASE}/polls/${pollId}`, {
      method: 'DELETE'
    });
    return res;
  } catch (apiErr) {
    // If backend fails, try localStorage fallback
    try {
      const polls = await getAllPolls();
      const filtered = polls.filter(p => (p.id !== pollId && p._id !== pollId));
      localStorage.setItem(POLLS_KEY, JSON.stringify(filtered));
      return { success: true, message: 'Poll deleted from local storage' };
    } catch (localErr) {
      // Re-throw the original API error if both fail
      throw apiErr;
    }
  }
}

export async function voteOnPoll(pollId, vendorApplicationId, userId) {
  try {
    // Try backend API first
    try {
      // Backend uses authenticated user from JWT token, so we don't need to send userId
      const res = await fetchJson(`${API_BASE}/polls/${pollId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ vendorApplicationId })
      });
      if (res.poll || res.success) {
        return res.poll || res;
      }
      throw new Error(res.message || 'Failed to vote');
    } catch (apiErr) {
      // If it's a validation error, throw it instead of falling back to localStorage
      if (apiErr.message && !apiErr.message.includes('not available')) {
        throw apiErr;
      }
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

// Get vendor applications for poll creation (only pending applications for a specific event)
export async function getVendorApplicationsForPoll(eventId, setupDurationWeeks = null) {
  try {
    const params = new URLSearchParams({ eventId });
    if (setupDurationWeeks) {
      params.append('setupDurationWeeks', setupDurationWeeks);
    }
    const res = await fetchJson(`${API_BASE}/polls/vendor-applications?${params.toString()}`);
    return res.applications || [];
  } catch (err) {
    console.error('Error fetching vendor applications for poll:', err);
    return [];
  }
}

