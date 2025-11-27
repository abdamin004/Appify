import React, { useState, useEffect } from 'react';
import { getActivePolls, voteOnPoll, getUserVoteForPoll } from '../../services/pollService';

const VISITOR_ID_KEY = 'boothPollVisitorId';

function getVisitorVoteId() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return `visitor_${Date.now()}`;
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

function StudentPollVoting() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?._id || user?.id || user?.email || user?.username || getVisitorVoteId();

  useEffect(() => {
    loadPolls();
    // Refresh polls every 30 seconds
    const interval = setInterval(loadPolls, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPolls = async () => {
    try {
      setLoading(true);
      setError(null);
      const activePolls = await getActivePolls();
      setPolls(activePolls);
    } catch (err) {
      console.error('Error loading polls:', err);
      setError('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId, vendorApplicationId) => {
    try {
      await voteOnPoll(pollId, vendorApplicationId, userId);
      await loadPolls(); // Refresh to show updated vote counts
    } catch (err) {
      const errorMsg = err?.message || err?.error?.message || 'Failed to vote';
      alert('Failed to vote: ' + errorMsg);
      console.error('Vote error:', err);
    }
  };

  if (loading && polls.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
        Loading polls...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '10px', color: '#dc2626' }}>
        {error}
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '60px 40px',
        borderRadius: '15px',
        textAlign: 'center',
        color: '#6b7280',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
        <h3 style={{ color: '#003366', marginBottom: '10px' }}>No Active Polls</h3>
        <p>There are currently no active vendor booth polls available for voting.</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Check back later or contact the Event Office for more information.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#003366', marginBottom: '25px', fontSize: '1.8rem' }}>
        📊 Vendor Booth Polls
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '30px', fontSize: '0.95rem' }}>
        Vote for vendors you'd like to see set up booths at upcoming events. Your vote helps decide which vendors will be selected!
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {polls.map(poll => (
          <PollCard
            key={poll._id || poll.id}
            poll={poll}
            userId={userId}
            onVote={handleVote}
          />
        ))}
      </div>
    </div>
  );
}

function PollCard({ poll, userId, onVote }) {
  const [userVote, setUserVote] = useState(null);

  useEffect(() => {
    const pollId = poll._id || poll.id;
    const vote = getUserVoteForPoll(pollId, userId);
    setUserVote(vote);
  }, [poll._id, poll.id, userId]);

  const handleVoteClick = (vendorApplicationId) => {
    const pollId = poll._id || poll.id;
    onVote(pollId, vendorApplicationId);
    setUserVote(vendorApplicationId);
  };

  const getVoteCount = (vendorId) => {
    // voteCounts uses string IDs, so convert to string for lookup
    const vendorIdStr = String(vendorId);
    // Check both the direct key and try to find by matching _id or id
    return poll.voteCounts?.[vendorIdStr] || 
           poll.voteCounts?.[vendorId] || 
           0;
  };

  const totalVotes = poll.totalVotes || 0;
  const maxVotes = Math.max(...poll.vendorApplications.map(va => getVoteCount(va.id)), 0);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      padding: '25px',
      borderRadius: '15px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#003366', margin: '0 0 8px 0', fontSize: '1.3rem' }}>
          {poll.title}
        </h3>
        {poll.description && (
          <p style={{ color: '#6b7280', fontSize: '0.95rem', margin: '0 0 12px 0' }}>
            {poll.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#6b7280', flexWrap: 'wrap' }}>
          <span>📊 <strong>{totalVotes}</strong> total vote{totalVotes !== 1 ? 's' : ''}</span>
          <span>📅 Created: {new Date(poll.createdAt).toLocaleDateString()}</span>
          <span style={{
            padding: '4px 10px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            borderRadius: '6px',
            fontWeight: 600,
          }}>
            ✓ Active
          </span>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#003366', marginBottom: '15px', fontSize: '1rem' }}>
          Vote for a Vendor:
        </h4>
        {poll.vendorApplications.map((vendorApp, index) => {
          const vendorAppId = vendorApp._id || vendorApp.id;
          const voteCount = getVoteCount(vendorAppId);
          const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : 0;
          const isVoted = userVote === vendorAppId;

          return (
            <div
              key={vendorAppId || index}
              style={{
                padding: '18px',
                marginBottom: '15px',
                background: isVoted ? 'rgba(212, 175, 55, 0.1)' : '#f9fafb',
                border: `2px solid ${isVoted ? '#d4af37' : '#e5e7eb'}`,
                borderRadius: '12px',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              {isVoted && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#d4af37',
                  color: '#003366',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  ✓ Your Vote
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <strong style={{ color: '#003366', fontSize: '1.1rem', display: 'block', marginBottom: '6px' }}>
                    {vendorApp.organization}
                  </strong>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    <div>Booth Size: {vendorApp.boothSize}</div>
                    <div>Attendees: {vendorApp.attendees?.length || 0}</div>
                    {vendorApp.notes && (
                      <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#9ca3af' }}>
                        {vendorApp.notes}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleVoteClick(vendorAppId)}
                  disabled={isVoted}
                  style={{
                    padding: '12px 24px',
                    background: isVoted
                      ? 'rgba(212, 175, 55, 0.3)'
                      : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                    color: '#003366',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: isVoted ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    minWidth: '120px',
                    transition: 'all 0.2s',
                    opacity: isVoted ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isVoted) {
                      e.target.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  {isVoted ? '✓ Voted' : 'Vote'}
                </button>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <span style={{ color: '#6b7280' }}>
                    {voteCount} vote{voteCount !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: '#003366', fontWeight: 600 }}>
                    {percentage}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  background: '#e5e7eb',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: isVoted
                      ? 'linear-gradient(90deg, #d4af37 0%, #b8941f 100%)'
                      : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
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

export default StudentPollVoting;

