import React, { useState, useEffect } from 'react';
import { 
  getAllPolls, 
  createPoll, 
  updatePoll, 
  deletePoll, 
  voteOnPoll, 
  getUserVoteForPoll,
  getActivePolls,
  getVendorApplicationsForPoll
} from '../../services/pollService';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';

function BoothPollManager() {
  const [polls, setPolls] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    loadPolls();
    loadVendorRequests();
  }, []);

  const loadPolls = async () => {
    try {
      const allPolls = await getAllPolls();
      setPolls(allPolls);
    } catch (err) {
      console.error('Error loading polls:', err);
      setPolls([]);
    }
  };

  const loadVendorRequests = async () => {
    try {
      // Only load pending vendor applications (approved should not appear in polls)
      const pendingRes = await adminService.listPendingVendorApplications();

      const pendingList = Array.isArray(pendingRes?.applications)
        ? pendingRes.applications
        : Array.isArray(pendingRes)
          ? pendingRes
          : [];

      // Filter to only include pending applications and ensure status is pending
      const normalizedPending = pendingList
        .filter(req => (req.status || 'pending') === 'pending')
        .map((req) => ({
          ...req,
          status: 'pending', // Ensure status is explicitly pending
        }));

      setVendorRequests(normalizedPending);
    } catch (err) {
      console.error('Error loading vendor requests:', err);
      setVendorRequests([]);
    }
  };

  const handleCreatePoll = async () => {
    if (!pollTitle.trim()) {
      showToast.warning('Please enter a poll title');
      return;
    }
    if (selectedRequests.length < 2) {
      showToast.warning('Please select at least 2 vendor requests for the poll');
      return;
    }

    try {
      // Prepare data in the format expected by the backend API
      const vendorApplicationIds = selectedRequests.map(req => req._id || req.id);
      
      // Set voting dates (default to now + 7 days for end date)
      const votingStartDate = new Date();
      const votingEndDate = new Date();
      votingEndDate.setDate(votingEndDate.getDate() + 7); // 7 days from now

      const pollData = {
        title: pollTitle,
        description: pollDescription || '',
        eventId: selectedEventId,
        vendorApplicationIds: vendorApplicationIds, // Array of IDs, not objects
        votingStartDate: votingStartDate.toISOString(),
        votingEndDate: votingEndDate.toISOString(),
      };

      await createPoll(pollData);
      setShowCreatePoll(false);
      setPollTitle('');
      setPollDescription('');
      setSelectedRequests([]);
      setSelectedEventId('');
      loadPolls();
      showToast.success('Poll created successfully!');
    } catch (err) {
      showToast.error('Failed to create poll: ' + err.message);
    }
  };

  const handleToggleRequest = (request) => {
    setSelectedRequests(prev => {
      const exists = prev.find(r => (r._id || r.id) === (request._id || request.id));
      if (exists) {
        return prev.filter(r => (r._id || r.id) !== (request._id || request.id));
      } else {
        return [...prev, request];
      }
    });
  };

  const handleClosePoll = async (pollId) => {
    const confirmed = await confirmDialog('Are you sure you want to close this poll?', 'Close Poll');
    if (!confirmed) return;
    try {
      await updatePoll(pollId, { status: 'closed' });
      loadPolls();
      showToast.success('Poll closed successfully');
    } catch (err) {
      showToast.error('Failed to close poll: ' + err.message);
    }
  };

  const handleDeletePoll = async (pollId) => {
    const confirmed = await confirmDialog('Are you sure you want to delete this poll?', 'Delete Poll');
    if (!confirmed) return;
    try {
      const result = await deletePoll(pollId);
      if (result && result.success !== false) {
        showToast.success('Poll deleted successfully!');
        loadPolls();
      } else {
        showToast.error('Failed to delete poll: ' + (result?.message || 'Unknown error'));
      }
    } catch (err) {
      const errorMsg = err?.message || err?.error?.message || 'Failed to delete poll';
      showToast.error('Failed to delete poll: ' + errorMsg);
      console.error('Delete poll error:', err);
    }
  };

  // Filter out any non-pending applications (safety check - only pending should be used in polls)
  const pendingOnlyRequests = vendorRequests.filter(req => 
    (req.status || 'pending') === 'pending'
  );

  // Group vendor requests by event
  const requestsByEvent = {};
  pendingOnlyRequests.forEach(req => {
    const eventId = req.event?._id || req.event || 'unknown';
    if (!requestsByEvent[eventId]) {
      requestsByEvent[eventId] = {
        event: req.event,
        requests: []
      };
    }
    requestsByEvent[eventId].requests.push(req);
  });

  // Get events with multiple requests (potential conflicts)
  const conflictingEvents = Object.entries(requestsByEvent)
    .filter(([_, data]) => data.requests.length >= 2)
    .map(([eventId, data]) => ({ eventId, ...data }));

  return (
    <div id="booth-polls-section">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{ color: '#003366', margin: 0 }}>Booth Request Polls</h2>
        <button
          onClick={() => setShowCreatePoll(!showCreatePoll)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            color: '#003366',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          + Create New Poll
        </button>
      </div>

      {showCreatePoll && (
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '25px',
          borderRadius: '15px',
          marginBottom: '30px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ color: '#003366', marginBottom: '20px' }}>Create New Poll</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#003366', fontWeight: 600 }}>
              Poll Title *
            </label>
            <input
              type="text"
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
              placeholder="e.g., Vendor Selection for Spring Bazaar"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#003366', fontWeight: 600 }}>
              Description
            </label>
            <textarea
              value={pollDescription}
              onChange={(e) => setPollDescription(e.target.value)}
              placeholder="Optional description for the poll"
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#003366', fontWeight: 600 }}>
              Select Vendor Requests (at least 2) *
            </label>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '10px',
            }}>
              {conflictingEvents.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                  No events with multiple vendor requests found. Create events with multiple vendor applications first.
                </p>
              ) : (
                conflictingEvents.map(({ eventId, event, requests }) => (
                  <div key={eventId} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e5e7eb' }}>
                    <h4 style={{ color: '#003366', marginBottom: '10px' }}>
                      {event?.title || 'Unknown Event'} ({requests.length} requests)
                    </h4>
                    {requests.map(req => {
                      const isSelected = selectedRequests.some(r => (r._id || r.id) === (req._id || req.id));
                      return (
                        <div
                          key={req._id || req.id}
                          onClick={() => {
                            handleToggleRequest(req);
                            if (!selectedEventId) setSelectedEventId(eventId);
                          }}
                          style={{
                            padding: '12px',
                            marginBottom: '8px',
                            background: isSelected ? 'rgba(212, 175, 55, 0.15)' : '#f9fafb',
                            border: `2px solid ${isSelected ? '#d4af37' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ color: '#003366' }}>{req.organization}</strong>
                              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                                Booth Size: {req.boothSize} • Attendees: {req.attendees?.length || 0}
                              </div>
                            </div>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: `2px solid ${isSelected ? '#d4af37' : '#9ca3af'}`,
                              background: isSelected ? '#d4af37' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {isSelected && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                            Status: {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : 'pending'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            {selectedRequests.length > 0 && (
              <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '0.85rem' }}>
                {selectedRequests.length} vendor request(s) selected
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCreatePoll}
              disabled={!pollTitle.trim() || selectedRequests.length < 2}
              style={{
                padding: '12px 24px',
                background: (!pollTitle.trim() || selectedRequests.length < 2) 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                color: '#003366',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: (!pollTitle.trim() || selectedRequests.length < 2) ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Create Poll
            </button>
            <button
              onClick={() => {
                setShowCreatePoll(false);
                setPollTitle('');
                setPollDescription('');
                setSelectedRequests([]);
                setSelectedEventId('');
              }}
              style={{
                padding: '12px 24px',
                background: '#e5e7eb',
                color: '#003366',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 style={{ color: '#003366', marginBottom: '20px' }}>
          Active Polls ({polls.filter(p => p.status === 'active').length})
        </h3>
        {polls.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            padding: '40px',
            borderRadius: '15px',
            textAlign: 'center',
            color: '#6b7280',
          }}>
            <p>No polls created yet. Create a poll to start voting on vendor requests.</p>
          </div>
        ) : (
          polls.map(poll => (
            <PollCard 
              key={poll._id || poll.id} 
              poll={poll} 
              onClose={() => handleClosePoll(poll._id || poll.id)}
              onDelete={() => handleDeletePoll(poll._id || poll.id)}
              onRefresh={loadPolls}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PollCard({ poll, onClose, onDelete, onRefresh }) {
  const [userVote, setUserVote] = useState(null);
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?._id || user?.id || 'anonymous';

  useEffect(() => {
    const pollId = poll._id || poll.id;
    const vote = getUserVoteForPoll(pollId, userId);
    setUserVote(vote);
  }, [poll._id, poll.id, userId]);

  const handleVote = async (vendorApplicationId) => {
    try {
      const pollId = poll._id || poll.id;
      await voteOnPoll(pollId, vendorApplicationId, userId);
      setUserVote(vendorApplicationId);
      onRefresh();
      showToast.success('Vote submitted successfully!');
    } catch (err) {
      showToast.error('Failed to vote: ' + err.message);
    }
  };

  const getVoteCount = (vendorId) => {
    // Backend uses String(_id) as key in voteCounts
    const vendorIdStr = String(vendorId);
    return poll.voteCounts?.[vendorIdStr] || poll.voteCounts?.[vendorId] || 0;
  };

  const totalVotes = poll.totalVotes || 0;
  const maxVotes = Math.max(...poll.vendorApplications.map(va => {
    const appId = va._id || va.id;
    return getVoteCount(appId);
  }), 0);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#003366', margin: '0 0 8px 0' }}>{poll.title}</h3>
          {poll.description && (
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 10px 0' }}>
              {poll.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#6b7280' }}>
            <span>📊 Total Votes: {totalVotes}</span>
            <span>📅 Created: {new Date(poll.createdAt).toLocaleDateString()}</span>
            <span style={{
              padding: '4px 8px',
              background: poll.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
              color: poll.status === 'active' ? '#10b981' : '#6b7280',
              borderRadius: '6px',
              fontWeight: 600,
            }}>
              {poll.status === 'active' ? 'Active' : 'Closed'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {poll.status === 'active' && (
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#e5e7eb',
                color: '#003366',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close Poll
            </button>
          )}
          <button
            onClick={onDelete}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        {poll.vendorApplications.map((vendorApp, index) => {
          const vendorAppId = vendorApp._id || vendorApp.id;
          const voteCount = getVoteCount(vendorAppId);
          const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : 0;
          const isVoted = String(userVote) === String(vendorAppId);
          const isWinner = poll.status === 'closed' && voteCount === maxVotes && maxVotes > 0;

          return (
            <div
              key={vendorAppId || index}
              style={{
                padding: '15px',
                marginBottom: '12px',
                background: isVoted ? 'rgba(212, 175, 55, 0.1)' : '#f9fafb',
                border: `2px solid ${isVoted ? '#d4af37' : '#e5e7eb'}`,
                borderRadius: '10px',
                position: 'relative',
              }}
            >
              {isWinner && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#10b981',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  🏆 Winner
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <strong style={{ color: '#003366', fontSize: '1.1rem' }}>
                    {vendorApp.organization}
                  </strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                    Booth Size: {vendorApp.boothSize} • Attendees: {vendorApp.attendees?.length || 0}
                  </div>
                  {vendorApp.notes && (
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px', fontStyle: 'italic' }}>
                      {vendorApp.notes}
                    </div>
                  )}
                </div>
                {poll.status === 'active' && (
                  <button
                    onClick={() => handleVote(vendorAppId)}
                    disabled={isVoted}
                    style={{
                      padding: '10px 20px',
                      background: isVoted 
                        ? 'rgba(212, 175, 55, 0.3)' 
                        : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                      color: '#003366',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: isVoted ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {isVoted ? '✓ Voted' : 'Vote'}
                  </button>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {voteCount} vote{voteCount !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>
                    {percentage}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: isWinner ? '#10b981' : 'linear-gradient(90deg, #d4af37 0%, #b8941f 100%)',
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BoothPollManager;

