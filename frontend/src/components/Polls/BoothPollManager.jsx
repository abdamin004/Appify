import React, { useState, useEffect } from 'react';
import { 
  getAllPolls, 
  createPoll, 
  updatePoll, 
  deletePoll, 
  voteOnPoll, 
  getUserVoteForPoll,
  getActivePolls 
} from '../../services/pollService';
import adminService from '../../services/adminService';

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

  const loadPolls = () => {
    const allPolls = getAllPolls();
    setPolls(allPolls);
  };

  const loadVendorRequests = async () => {
    try {
      const res = await adminService.listPendingVendorApplications();
      setVendorRequests(res.applications || []);
    } catch (err) {
      console.error('Error loading vendor requests:', err);
      setVendorRequests([]);
    }
  };

  const handleCreatePoll = () => {
    if (!pollTitle.trim()) {
      alert('Please enter a poll title');
      return;
    }
    if (selectedRequests.length < 2) {
      alert('Please select at least 2 vendor requests for the poll');
      return;
    }

    try {
      const pollData = {
        title: pollTitle,
        description: pollDescription,
        eventId: selectedEventId,
        vendorApplications: selectedRequests.map(req => ({
          id: req._id || req.id,
          organization: req.organization,
          boothSize: req.boothSize,
          attendees: req.attendees || [],
          notes: req.notes || '',
        })),
        voteCounts: {},
        totalVotes: 0,
      };

      createPoll(pollData);
      setShowCreatePoll(false);
      setPollTitle('');
      setPollDescription('');
      setSelectedRequests([]);
      setSelectedEventId('');
      loadPolls();
      alert('Poll created successfully!');
    } catch (err) {
      alert('Failed to create poll: ' + err.message);
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

  const handleClosePoll = (pollId) => {
    if (confirm('Are you sure you want to close this poll?')) {
      updatePoll(pollId, { status: 'closed' });
      loadPolls();
    }
  };

  const handleDeletePoll = (pollId) => {
    if (confirm('Are you sure you want to delete this poll?')) {
      deletePoll(pollId);
      loadPolls();
    }
  };

  // Group vendor requests by event
  const requestsByEvent = {};
  vendorRequests.forEach(req => {
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
    <div style={{ padding: '20px' }}>
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
              key={poll.id} 
              poll={poll} 
              onClose={() => handleClosePoll(poll.id)}
              onDelete={() => handleDeletePoll(poll.id)}
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
    const vote = getUserVoteForPoll(poll.id, userId);
    setUserVote(vote);
  }, [poll.id, userId]);

  const handleVote = (vendorApplicationId) => {
    try {
      voteOnPoll(poll.id, vendorApplicationId, userId);
      setUserVote(vendorApplicationId);
      onRefresh();
    } catch (err) {
      alert('Failed to vote: ' + err.message);
    }
  };

  const getVoteCount = (vendorId) => {
    return poll.voteCounts?.[vendorId] || 0;
  };

  const totalVotes = poll.totalVotes || 0;
  const maxVotes = Math.max(...poll.vendorApplications.map(va => getVoteCount(va.id)), 0);

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
          const voteCount = getVoteCount(vendorApp.id);
          const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : 0;
          const isVoted = userVote === vendorApp.id;
          const isWinner = poll.status === 'closed' && voteCount === maxVotes && maxVotes > 0;

          return (
            <div
              key={vendorApp.id || index}
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
                    onClick={() => handleVote(vendorApp.id)}
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

