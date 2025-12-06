import React, { useState, useEffect } from 'react';
import { getActivePolls, voteOnPoll, getUserVoteForPoll } from '../../services/pollService';
import { showToast } from '../../utils/toast';

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
      showToast.success('Vote submitted successfully!');
    } catch (err) {
      const errorMsg = err?.message || err?.error?.message || 'Failed to vote';
      showToast.error('Failed to vote: ' + errorMsg);
      console.error('Vote error:', err);
    }
  };

  if (loading && polls.length === 0) {
    return (
      <div className="p-20 text-center text-slate-500">
        <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
        <p>Loading polls...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-xl text-red-600 border border-red-200 flex items-center gap-3">
        <span className="text-2xl">⚠️</span>
        {error}
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-200">
        <div className="text-6xl mb-6 opacity-50">📊</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Polls</h3>
        <p className="text-slate-500">There are currently no active vendor booth polls available for voting.</p>
        <p className="text-sm text-slate-400 mt-2">Check back later or contact the Event Office for more information.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
        <span>📊</span> Vendor Booth Polls
      </h2>
      <p className="text-slate-500 mb-8">
        Vote for vendors you'd like to see set up booths at upcoming events. Your vote helps decide which vendors will be selected!
      </p>

      <div className="flex flex-col gap-10">
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
    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
      <div className="mb-8 pb-6 border-b border-slate-200">
        <div className="flex justify-between items-start gap-4 mb-2">
          <h3 className="text-xl font-bold text-slate-900">
            {poll.title}
          </h3>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide border border-emerald-200">
            Active
          </span>
        </div>
        {poll.description && (
          <p className="text-slate-600 mb-4 leading-relaxed">
            {poll.description}
          </p>
        )}
        <div className="flex gap-4 text-sm text-slate-500 flex-wrap items-center">
          <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200">
            📊 <strong>{totalVotes}</strong> total vote{totalVotes !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200">
            📅 Created: {new Date(poll.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span>🗳️</span> Vote for a Vendor:
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {poll.vendorApplications.map((vendorApp, index) => {
            const vendorAppId = vendorApp._id || vendorApp.id;
            const voteCount = getVoteCount(vendorAppId);
            const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : 0;
            const isVoted = userVote === vendorAppId;

            return (
              <div
                key={vendorAppId || index}
                className={`p-6 rounded-xl border-2 transition-all relative ${isVoted
                  ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
              >
                {isVoted && (
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                    <span>✓</span> Your Vote
                  </div>
                )}

                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <strong className="text-lg text-slate-900 block mb-2">
                      {vendorApp.organization}
                    </strong>
                    <div className="text-sm text-slate-500 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Booth Size:</span>
                        <span className="font-medium text-slate-700">{vendorApp.boothSize}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Attendees:</span>
                        <span className="font-medium text-slate-700">{vendorApp.attendees?.length || 0}</span>
                      </div>
                      {vendorApp.notes && (
                        <div className="italic text-slate-400 mt-2 bg-slate-50 p-2 rounded text-xs border border-slate-100 inline-block">
                          "{vendorApp.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleVoteClick(vendorAppId)}
                    disabled={isVoted}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all min-w-[120px] shadow-sm ${isVoted
                      ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed opacity-80 border border-emerald-200'
                      : 'bg-slate-900 text-white hover:bg-emerald-600 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                  >
                    {isVoted ? '✓ Voted' : 'Vote'}
                  </button>
                </div>

                <div className="mt-2">
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <span>👤</span> {voteCount} vote{voteCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-slate-900 font-bold">
                      {percentage}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className={`h-full transition-all duration-1000 ease-out ${isVoted
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                        }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StudentPollVoting;
