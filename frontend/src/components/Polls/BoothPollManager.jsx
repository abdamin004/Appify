import React, { useState, useEffect } from 'react';
import {
  getAllPolls,
  createPoll,
  updatePoll,
  deletePoll,
  voteOnPoll,
  getUserVoteForPoll
} from '../../services/pollService';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';
import Input from '../UI/Input';
import Button from '../UI/Button';

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
      <div className="relative flex justify-center items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 m-0">Booth Request Polls</h2>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Button
            onClick={() => setShowCreatePoll(!showCreatePoll)}
            className="bg-slate-900 text-white hover:bg-emerald-600"
          >
            + Create New Poll
          </Button>
        </div>
      </div>

      {showCreatePoll && (
        <div className="bg-white p-8 rounded-2xl mb-8 shadow-sm border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Create New Poll</h3>

          <div className="mb-6">
            <Input
              label="Poll Title *"
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
              placeholder="e.g., Vendor Selection for Spring Bazaar"
            />
          </div>

          <div className="mb-6">
            <label className="label">
              <span className="label-text font-bold text-slate-700">Description</span>
            </label>
            <textarea
              value={pollDescription}
              onChange={(e) => setPollDescription(e.target.value)}
              placeholder="Optional description for the poll"
              rows={3}
              className="textarea textarea-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="mb-8">
            <label className="block mb-2 text-slate-800 font-bold">
              Select Vendor Requests (at least 2) *
            </label>
            <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50">
              {conflictingEvents.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No events with multiple vendor requests found. Create events with multiple vendor applications first.
                </p>
              ) : (
                conflictingEvents.map(({ eventId, event, requests }) => (
                  <div key={eventId} className="mb-6 pb-4 border-b border-slate-200 last:border-0 last:mb-0 last:pb-0">
                    <h4 className="text-slate-800 font-bold mb-3">
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
                          className={`p-4 mb-2 rounded-xl cursor-pointer transition-all border-2 ${isSelected
                            ? 'bg-emerald-50 border-emerald-500'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <strong className="text-slate-800 block">{req.organization}</strong>
                              <div className="text-sm text-slate-500 mt-1">
                                Booth Size: {req.boothSize} • Attendees: {req.attendees?.length || 0}
                              </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 bg-transparent'
                              }`}>
                              {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">
                            Status: {req.status ? req.status : 'pending'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            {selectedRequests.length > 0 && (
              <p className="mt-2 text-slate-500 text-sm font-medium">
                {selectedRequests.length} vendor request(s) selected
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleCreatePoll}
              disabled={!pollTitle.trim() || selectedRequests.length < 2}
              className={(!pollTitle.trim() || selectedRequests.length < 2)
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed border-none hover:bg-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 border-none'
              }
            >
              Create Poll
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCreatePoll(false);
                setPollTitle('');
                setPollDescription('');
                setSelectedRequests([]);
                setSelectedEventId('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-6">
          Active Polls ({polls.filter(p => p.status === 'active').length})
        </h3>
        {polls.length === 0 ? (
          <div className="bg-slate-50 p-12 rounded-2xl text-center border border-slate-200 border-dashed text-slate-500">
            <p>No polls created yet. Create a poll to start voting on vendor requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {polls.map(poll => (
              <PollCard
                key={poll._id || poll.id}
                poll={poll}
                onClose={() => handleClosePoll(poll._id || poll.id)}
                onDelete={() => handleDeletePoll(poll._id || poll.id)}
                onRefresh={loadPolls}
              />
            ))}
          </div>
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 mb-2">{poll.title}</h3>
          {poll.description && (
            <p className="text-slate-600 mb-3">
              {poll.description}
            </p>
          )}
          <div className="flex gap-4 text-sm text-slate-500 flex-wrap items-center">
            <span className="flex items-center gap-1">📊 Total Votes: {totalVotes}</span>
            <span className="flex items-center gap-1">📅 Created: {new Date(poll.createdAt).toLocaleDateString()}</span>
            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${poll.status === 'active'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
              }`}>
              {poll.status === 'active' ? 'Active' : 'Closed'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {poll.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Close Poll
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {poll.vendorApplications.map((vendorApp, index) => {
          const vendorAppId = vendorApp._id || vendorApp.id;
          const voteCount = getVoteCount(vendorAppId);
          const percentage = totalVotes > 0 ? (voteCount / totalVotes * 100).toFixed(1) : 0;
          const isVoted = String(userVote) === String(vendorAppId);
          const isWinner = poll.status === 'closed' && voteCount === maxVotes && maxVotes > 0;

          return (
            <div
              key={vendorAppId || index}
              className={`p-4 rounded-xl border-2 transition-all relative ${isVoted
                ? 'bg-emerald-50 border-emerald-500'
                : 'bg-slate-50 border-slate-200'
                }`}
            >
              {isWinner && (
                <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold shadow-sm">
                  🏆 Winner
                </div>
              )}

              <div className="flex justify-between items-center mb-3 flex-wrap gap-4">
                <div>
                  <strong className="text-lg text-slate-800 block">
                    {vendorApp.organization}
                  </strong>
                  <div className="text-sm text-slate-500 mt-1">
                    Booth Size: {vendorApp.boothSize} • Attendees: {vendorApp.attendees?.length || 0}
                  </div>
                  {vendorApp.notes && (
                    <div className="text-xs text-slate-400 mt-1 italic">
                      {vendorApp.notes}
                    </div>
                  )}
                </div>
                {poll.status === 'active' && (
                  <Button
                    onClick={() => handleVote(vendorAppId)}
                    disabled={isVoted}
                    size="sm"
                    className={isVoted
                      ? 'bg-emerald-100 text-emerald-800 border-none hover:bg-emerald-100 opacity-70'
                      : 'bg-slate-900 hover:bg-emerald-600 border-none'
                    }
                  >
                    {isVoted ? '✓ Voted' : 'Vote'}
                  </Button>
                )}
              </div>

              <div className="mt-2">
                <div className="flex justify-between mb-1 text-xs font-medium">
                  <span className="text-slate-500">
                    {voteCount} vote{voteCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-slate-700">
                    {percentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isWinner
                      ? 'bg-emerald-500'
                      : 'bg-emerald-500'
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
  );
}

export default BoothPollManager;
