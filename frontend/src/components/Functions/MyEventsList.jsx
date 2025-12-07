import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEventComments, addEventComment, rateEvent } from "../../services/eventService";
import { getAttendedIds, toggleAttended } from "../../services/attendanceService";
import { FaStar } from "react-icons/fa";
import { refundAndCancel, createCheckoutSession, payWithWallet, getWalletBalance, getEventPrice } from "../../services/paymentService";
import PaymentActions from "../Payments/PaymentActions";
import { showToast, confirmDialog } from "../../utils/toast";


// Per-user ratings storage key (frontend-only persistence)
const ratingsStorageKeyForUser = () => {
  try {
    if (typeof localStorage === "undefined") return "eventRatings:guest";
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    const id = user?._id || user?.id || "guest";
    return `eventRatings:${id}`;
  } catch (_) {
    return "eventRatings:guest";
  }
};

const loadRatings = () => {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(ratingsStorageKeyForUser());
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
};

const saveRatings = (ratings) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ratingsStorageKeyForUser(), JSON.stringify(ratings));
    }
  } catch (_) {
    // no-op
  }
};

function RatingStars({ value = 0, onChange, disabled = false }) {
  const [hover, setHover] = useState(0);
  const active = hover || value || 0;
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center"
        role="radiogroup"
        aria-label="Rate event"
      >
        {stars.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => !disabled && onChange && onChange(s)}
            onMouseEnter={() => !disabled && setHover(s)}
            onMouseLeave={() => !disabled && setHover(0)}
            aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
            aria-checked={active === s}
            role="radio"
            disabled={disabled}
            className={`p-1 bg-transparent border-none ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-110 transition-transform"}`}
          >
            <FaStar size={20} color={s <= active ? "#fbbf24" : "#e2e8f0"} />
          </button>
        ))}
      </div>
      {value > 0 && (
        <span className="text-slate-500 text-xs font-semibold">You rated {value}/5</span>
      )}
    </div>
  );
}

// Helper functions to safely extract data from different event types (Workshop, Course, etc.)
const getEventId = (evt) => evt._id || evt.id;
const getType = (evt) => evt.type || 'Event';
const getTitle = (evt) => evt.title || evt.name || 'Untitled Event';
const getDesc = (evt) => evt.shortDescription || evt.description || 'No description available';
const getStart = (evt) => evt.startDate || evt.date;
const getLocation = (evt) => evt.location || 'TBA';
const getCapacity = (evt) => evt.capacity || 0;
const getPrice = (evt) => evt.ticketPrice || 0;
const getFundingSource = (evt) => evt.fundingSource;
const canRate = (evt) => !!(evt.attended || evt.attendedParticipants?.includes(evt.currentUserId)); // Simplified logic
const isRegistered = (evt) => true; // Simplified for display purposes

const getEventColor = (type) => {
  switch (String(type || '').toLowerCase()) {
    case 'workshop': return 'from-emerald-400 to-teal-500';
    case 'course': return 'from-blue-400 to-indigo-500';
    case 'hackathon': return 'from-violet-400 to-purple-500';
    case 'seminar': return 'from-amber-400 to-orange-500';
    default: return 'from-slate-400 to-slate-500';
  }
};

const getEventIcon = (type) => {
  switch (String(type || '').toLowerCase()) {
    case 'workshop': return '🛠️';
    case 'course': return '📚';
    case 'hackathon': return '🚀';
    case 'seminar': return '🎤';
    default: return '📅';
  }
};

const hasEventEnded = (evt) => {
  const end = evt.endDate || evt.date; // simplified
  return end ? new Date(end) < new Date() : false;
};

const hasEventStarted = (evt) => {
  const start = evt.startDate || evt.date;
  return start ? new Date(start) <= new Date() : false;
};

function MyEventsList({ events, showRefundButton = false, onRefresh, title, description }) {
  const navigate = useNavigate();
  // State for functional features
  const [ratings, setRatings] = useState(loadRatings());
  const [paidLocal, setPaidLocal] = useState(new Set());
  const [refundedSet, setRefundedSet] = useState(new Set());

  const [processingPayment, setProcessingPayment] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [eventPrices, setEventPrices] = useState({});

  // Comments state
  const [openComments, setOpenComments] = useState({});
  const [newCommentByEvent, setNewCommentByEvent] = useState({});
  const [commentsByEvent, setCommentsByEvent] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [commentsError, setCommentsError] = useState({});

  // Interaction states
  const [attendedSet, setAttendedSet] = useState(new Set());

  // Helpers for user interaction
  const setEventRating = async (id, val) => {
    try {
      setRatings(prev => {
        const next = { ...prev, [id]: val };
        saveRatings(next);
        return next;
      });
      await rateEvent(id, val);
      showToast.success('Rating saved!');
    } catch (err) {
      showToast.error('Failed to save rating');
    }
  };

  const toggleAttendedLocal = async (id) => {
    try {
      await toggleAttended(id);
      setAttendedSet(prev => {
        const next = new Set(prev);
        if (next.has(String(id))) next.delete(String(id));
        else next.add(String(id));
        return next;
      });
    } catch (err) {
      showToast.error('Failed to update attendance');
    }
  };

  const canEditWorkshop = (evt) => {
    try {
      if (typeof localStorage === 'undefined') return false;
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const user = JSON.parse(raw);
      const userId = user._id || user.id;

      // Check if creator
      if (evt.createdBy === userId || evt.creator === userId) return true;
      // Check if professor
      if (evt.professors && Array.isArray(evt.professors)) {
        return evt.professors.some(p => (p._id || p.id) === userId || p.email === user.email);
      }
      return false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Sync attended set from events if needed (simplified)
    if (events) {
      const attendantIds = events.filter(e => e.attended).map(e => getEventId(e));
      setAttendedSet(new Set(attendantIds.map(String)));
    }
  }, [events]);

  useEffect(() => {
    // Fetch wallet balance
    getWalletBalance().then(bal => setWalletBalance(bal)).catch(() => setWalletBalance(null));
  }, []);

  const toggleComments = async (id) => {
    setOpenComments(prev => ({ ...prev, [id]: !prev[id] }));
    if (!openComments[id] && !commentsByEvent[id]) {
      try {
        setCommentsLoading(prev => ({ ...prev, [id]: true }));
        const list = await getEventComments(id);
        setCommentsByEvent(prev => ({ ...prev, [id]: list }));
        setCommentsError(prev => ({ ...prev, [id]: null }));
      } catch (err) {
        console.error('Failed to load comments', err);
        setCommentsError(prev => ({ ...prev, [id]: 'Failed to load comments' }));
      } finally {
        setCommentsLoading(prev => ({ ...prev, [id]: false }));
      }
    }
  };

  const submitComment = async (id) => {
    const text = newCommentByEvent[id];
    if (!text || !text.trim()) return;
    try {
      setCommentsLoading(prev => ({ ...prev, [id]: true }));
      const newComment = await addEventComment(id, text);
      setCommentsByEvent(prev => ({ ...prev, [id]: [...(prev[id] || []), newComment] }));
      setNewCommentByEvent(prev => ({ ...prev, [id]: '' }));
      showToast.success('Comment posted');
    } catch (err) {
      showToast.error('Failed to post comment');
    } finally {
      setCommentsLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  useEffect(() => {
    // Fetch prices for all events
    if (events && events.length > 0) {
      events.forEach(async (evt) => {
        const id = getEventId(evt);
        if (id && !eventPrices[id]) {
          try {
            const p = await getEventPrice(id);
            setEventPrices(prev => ({ ...prev, [id]: p }));
          } catch (e) {
            // ignore
          }
        }
      });
    }
  }, [events]);

  const handlePay = async (evt, method) => {
    const id = getEventId(evt);
    setPayingId(id);
    setProcessingPayment(true);
    try {
      if (method === 'wallet') {
        await payWithWallet(id);
        setPaidLocal(prev => new Set(prev).add(String(id)));
        showToast.success('Payment successful via Wallet!');
        // Refresh wallet balance
        getWalletBalance().then(bal => setWalletBalance(bal));
      } else {
        await createCheckoutSession(id);
      }
    } catch (err) {
      showToast.error(`Payment failed: ${err.message}`);
    } finally {
      setProcessingPayment(false);
      setPayingId(null);
    }
  };

  const handleRefund = async (evt) => {
    if (!confirmDialog('Are you sure you want to request a refund? This cannot be undone.')) return;
    const id = getEventId(evt);
    try {
      await refundAndCancel(id);
      setRefundedSet(prev => new Set(prev).add(String(id)));
      showToast.success('Refund processed successfully.');
    } catch (err) {
      showToast.error(`Refund failed: ${err.message}`);
    }
  };

  // Wrappers to match JSX usage
  const handleCardPay = (evt) => handlePay(evt, 'card');
  const handleWalletPay = (evt) => handlePay(evt, 'wallet');
  const handleRefundAndCancel = (evt) => handleRefund(evt);

  const renderContent = () => {
    if (!events || !Array.isArray(events)) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
          <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Loading events...</h3>
          <p className="text-slate-500">Please wait while we fetch your events.</p>
        </div>
      );
    }
  }

  const setEventRating = async (eventId, value) => {
    // Check if event has ended and user is registered
    const evt = events.find(e => getEventId(e) === eventId);
    if (!evt) {
      showToast.error('Event not found');
      return;
    }

    const hasEnded = hasEventEnded(evt);
    const isReg = isRegistered(evt);

    if (!hasEnded) {
      showToast.warning('You can only rate events after they have ended');
      return;
    }

    if (!isReg) {
      showToast.warning('You must be registered for this event to rate it');
      return;
    }

    // Update local state immediately for better UX
    setRatings((prev) => {
      const next = { ...prev, [eventId]: value };
      saveRatings(next);
      return next;
    });

    // Send to backend
    try {
      await rateEvent(eventId, value);
      showToast.success('Rating submitted successfully!');
      
      // Dispatch event to notify other components (like FeedbackAnalytics) to refresh
      // Use a small delay to ensure the backend has processed the rating
      setTimeout(() => {
        try {
          const event = new CustomEvent('rating:added', { 
            detail: { eventId: String(eventId) },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(event);
          console.log('MyEventsList: Dispatched rating:added event for eventId:', eventId);
        } catch (err) {
          console.error('Error dispatching rating:added event:', err);
        }
      }, 500);
    } catch (err) {
      console.error('Failed to save rating to backend:', err);
      // Revert local state on error
      setRatings((prev) => {
        const next = { ...prev };
        delete next[eventId];
        saveRatings(next);
        return next;
      });
      showToast.error(err?.message || 'Failed to save rating. Please try again.');

    if (events.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
          <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
            <span>📭</span> No events found
          </h3>
          <p className="text-slate-500">
            You don't have any events in this category yet.
          </p>
        </div>
      );
    }

  const hasEventEnded = (evt) => {
    try {
      const end = getEnd(evt) || getStart(evt);
      if (!end) return false;
      return new Date(end).getTime() < Date.now();
    } catch (_) {
      return false;
    }
  };

  // Rating allowed if: event has ended AND user is registered
  const canRate = (evt) => {
    if (!hasEventEnded(evt)) return false;
    return isRegistered(evt);
  };

  // Check if user is registered for the event (for comments - requirement 17)
  const isRegistered = (evt) => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const user = JSON.parse(raw);
      const userId = user && (user._id || user.id);
      if (!userId) return false;

      // Check registeredUsers array in event
      const registeredUsers = evt?.registeredUsers || evt?.event?.registeredUsers || [];
      return Array.isArray(registeredUsers) && registeredUsers.some(u => {
        const uId = String(u._id || u.id || u);
        return uId === String(userId);
      });
    } catch {
      return false;
    }
  };

  const toggleAttendedLocal = (eventId) => {
    const next = new Set(toggleAttended(eventId).map(String));
    setAttendedSet(next);
  };

  // Comments helpers
  const toggleComments = async (eventId) => {
    setOpenComments(prev => ({ ...prev, [eventId]: !prev[eventId] }));
    if (!openComments[eventId]) {
      await loadComments(eventId);
    }
  };

  const loadComments = async (eventId) => {
    try {
      setCommentsLoading(prev => ({ ...prev, [eventId]: true }));
      setCommentsError(prev => ({ ...prev, [eventId]: "" }));
      const rows = await getEventComments(eventId);
      // getEventComments now returns array directly (handles backend format)
      setCommentsByEvent(prev => ({ ...prev, [eventId]: Array.isArray(rows) ? rows : [] }));
    } catch (err) {
      setCommentsError(prev => ({ ...prev, [eventId]: err?.message || "Failed to load comments" }));
    } finally {
      setCommentsLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const submitComment = async (eventId) => {
    const txt = (newCommentByEvent[eventId] || "").trim();
    if (!txt) return;
    try {
      setCommentsLoading(prev => ({ ...prev, [eventId]: true }));
      await addEventComment(eventId, txt);
      setNewCommentByEvent(prev => ({ ...prev, [eventId]: "" }));
      await loadComments(eventId);
      showToast.success('Comment added successfully!');
      
      // Dispatch event to notify other components (like FeedbackAnalytics) to refresh
      // Use a small delay to ensure the backend has processed the comment
      setTimeout(() => {
        try {
          const event = new CustomEvent('comment:added', { 
            detail: { eventId: String(eventId) },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(event);
          console.log('MyEventsList: Dispatched comment:added event for eventId:', eventId);
        } catch (err) {
          console.error('Error dispatching comment:added event:', err);
        }
      }, 500);
    } catch (err) {
      setCommentsError(prev => ({ ...prev, [eventId]: err?.message || "Failed to add comment" }));
      showToast.error(err?.message || "Failed to add comment");
    } finally {
      setCommentsLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Loading / empty states
  if (!events || !Array.isArray(events)) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((evt) => {
          const id = getEventId(evt);
          const type = getType(evt);
          const title = getTitle(evt);
          const desc = getDesc(evt);
          const start = getStart(evt);
          const location = getLocation(evt);
          const capacity = getCapacity(evt);
          const allowed = canRate(evt) || attendedSet.has(String(id));
          const canComment = isRegistered(evt);
          const current = ratings[id] || 0;
          const price = getPrice(evt);
          const fundingSource = getFundingSource(evt);
          const eventType = getType(evt);
          const serverPaid = Boolean(evt?.paymentStatus || evt?.paid || evt?.event?.paymentStatus || evt?.event?.paid);
          const isPaid = (serverPaid && !refundedSet.has(String(id))) || paidLocal.has(String(id));
          const requiresPayment = eventType === 'Workshop'
            ? (price > 0 && ['Internal'].includes(fundingSource))
            : (price > 0);
          const isPayable = isRegistered(evt) && requiresPayment && !isPaid && !hasEventEnded(evt);
          const canRefund =
            showRefundButton &&
            isPaid &&
            !hasEventEnded(evt) &&
            (() => {
              try {
                const start = getStart(evt);
                if (!start) return false;
                const diffDays = (new Date(start).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
                return diffDays >= 14;
              } catch (_) {
                return false;
              }
            })();
          const canUseWallet = typeof walletBalance === 'number' && walletBalance >= price;
          const walletDisabled = payingId === id || !canUseWallet;

          const gradientClass = getEventColor(type);
          const eventIcon = getEventIcon(type);
          const eventStarted = hasEventStarted(evt);

          return (
            <div
              key={id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col group relative border border-slate-200"
            >
              {/* Event Header with Gradient */}
              <div className={`h-40 bg-gradient-to-r ${gradientClass} relative p-6 flex flex-col justify-between`}>
                <div className="absolute top-4 right-4 z-10">
                  {eventStarted && isRegistered(evt) ? (
                    <button
                      onClick={() => toggleAttendedLocal(id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${attendedSet.has(String(id))
                        ? 'bg-white text-emerald-600'
                        : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                        }`}
                      title={attendedSet.has(String(id)) ? "Attended" : "Mark as Attended"}
                    >
                      {attendedSet.has(String(id)) ? '✓' : '👁'}
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/50">
                      {/* Placeholder or actual like button if needed later */}
                      ❤️
                    </div>
                  )}
                </div>

                <div className="text-4xl filter drop-shadow-md">
                  {eventIcon}
                </div>

                <div className="flex justify-between items-end">
                  <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-sm">
                    {type}
                  </span>
                  {price > 0 && (
                    <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold backdrop-blur-sm text-sm">
                      {price} {eventPrices[getEventId(evt)]?.currency?.toUpperCase() || 'EGP'}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                  {title}
                </h3>

                <p className="text-slate-500 text-sm mb-6 line-clamp-2">
                  {desc || "No description available"}
                </p>

                <div className="space-y-3 mt-auto mb-6">
                  {start && (
                    <div className="flex items-center gap-3 text-slate-600 text-sm">
                      <span className="text-lg w-6 flex justify-center">📅</span>
                      <span className="font-medium">{new Date(start).toLocaleDateString()} • {new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-3 text-slate-600 text-sm">
                      <span className="text-lg w-6 flex justify-center">📍</span>
                      <span className="font-medium">{location}</span>
                    </div>
                  )}
                </div>

                {isPayable && (
                  <div className="mb-4 pt-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCardPay(evt)}
                        disabled={processingPayment && payingId === id}
                        className="flex-1 btn btn-primary btn-sm bg-gradient-to-r from-emerald-500 to-teal-600 border-none text-white shadow-lg shadow-emerald-900/20"
                      >
                        {processingPayment && payingId === id ? '...' : 'Pay Card'}
                      </button>
                      {canUseWallet && (
                        <button
                          onClick={() => handleWalletPay(evt)}
                          disabled={walletDisabled}
                          className="flex-1 btn btn-secondary btn-sm bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                        >
                          Wallet
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                  {/* Rating & Details Row */}
                  <div className="flex items-center justify-between gap-4">
                    <RatingStars
                      value={current}
                      onChange={(v) => setEventRating(id, v)}
                      disabled={!allowed}
                    />
                    <button
                      onClick={() => navigate(`/events/${id}`)}
                      className="btn btn-ghost btn-sm text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                    >
                      Details →
                    </button>
                  </div>

                  {/* Secondary Actions Row */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleComments(id)}
                      className="flex-1 btn btn-ghost btn-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200"
                    >
                      {openComments[id] ? 'Hide Comments' : 'Show Comments'}
                    </button>

                  {!commentsLoading[id] && !commentsError[id] && (
                    <div className="space-y-3 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {(!commentsByEvent[id] || commentsByEvent[id].length === 0) ? (
                        <p className="text-center text-slate-400 text-xs py-4 bg-slate-50 rounded-lg">No comments yet.</p>
                      ) : (
                        commentsByEvent[id].map((c, i) => (
                          <div key={i} className="bg-slate-50 p-3 rounded-xl text-sm border border-slate-100">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-800 text-xs">
                                {c.user?.firstName || 'User'} {c.user?.lastName || ''}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap break-words">{c.content || c.comment || c.text || 'No content'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                    {canRefund && (
                      <button
                        type="button"
                        onClick={() => handleRefundAndCancel(evt)}
                        className="flex-1 btn btn-ghost btn-xs text-red-500 hover:bg-red-50 border border-red-200"
                      >
                        Cancel & Refund
                      </button>
                    )}

                    {canEditWorkshop(evt) && (
                      <button
                        type="button"
                        onClick={() => navigate(`/professor/workshops/edit/${id}`)}
                        className="flex-1 btn btn-ghost btn-xs text-amber-600 hover:bg-amber-50 border border-amber-200"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {/* Refund Closed Message */}
                  {showRefundButton && isPaid && !canRefund && !hasEventEnded(evt) && (
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 italic">
                        Cancellation only available ≥ 14 days before start.
                      </span>
                    </div>
                  )}

                  {/* Comments Section - Styled light */}
                  {openComments[id] && (
                    <div className="pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
                      {commentsLoading[id] && (
                        <div className="flex justify-center py-4">
                          <span className="loading loading-spinner loading-sm text-emerald-500"></span>
                        </div>
                      )}

                      {!commentsLoading[id] && commentsError[id] && (
                        <div className="alert alert-error text-xs py-2 mb-2 rounded-lg">
                          <span>{commentsError[id]}</span>
                        </div>
                      )}

                      {!commentsLoading[id] && !commentsError[id] && (
                        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {(!commentsByEvent[id] || commentsByEvent[id].length === 0) ? (
                            <p className="text-center text-slate-400 text-xs py-4 bg-slate-50 rounded-lg">No comments yet.</p>
                          ) : (
                            commentsByEvent[id].map((c, i) => (
                              <div key={i} className="bg-slate-50 p-3 rounded-xl text-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-bold text-slate-700 text-xs">
                                    {c.user?.firstName || 'User'} {c.user?.lastName || ''}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(c.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-slate-600 text-xs leading-relaxed">{c.comment}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {canComment ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newCommentByEvent[id] || ""}
                            onChange={(e) => setNewCommentByEvent(prev => ({ ...prev, [id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                submitComment(id);
                              }
                            }}
                            className="input input-bordered input-sm flex-1 text-xs rounded-lg focus:outline-none focus:border-emerald-500 bg-white border-slate-300 text-slate-700 placeholder-slate-400"
                          />
                          <button
                            onClick={() => submitComment(id)}
                            disabled={!newCommentByEvent[id]?.trim() || commentsLoading[id]}
                            className="btn btn-primary btn-sm btn-square rounded-lg bg-emerald-600 hover:bg-emerald-500 border-none text-white disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            ➤
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-slate-400 italic py-3 bg-slate-50 rounded-xl border border-slate-100">
                          Only registered users can comment
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      {(title || description) && (
        <div className="mb-2">
          {title && <h2 className="text-2xl font-bold text-slate-900">{title}</h2>}
          {description && <p className="text-slate-500">{description}</p>}
        </div>
      )}
      {renderContent()}
    </div>
  );
}


export default MyEventsList;
