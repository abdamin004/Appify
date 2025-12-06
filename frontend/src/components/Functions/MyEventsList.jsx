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

function MyEventsList({ events, showRefundButton = false, onRefresh }) {
  const navigate = useNavigate();
  const [ratings, setRatings] = useState({});
  const [attendedSet, setAttendedSet] = useState(new Set(getAttendedIds().map(String)));
  const [openComments, setOpenComments] = useState({}); // { [eventId]: true }
  const [commentsByEvent, setCommentsByEvent] = useState({}); // { [eventId]: Comment[] }
  const [commentsLoading, setCommentsLoading] = useState({}); // { [eventId]: boolean }
  const [commentsError, setCommentsError] = useState({}); // { [eventId]: string }
  const [newCommentByEvent, setNewCommentByEvent] = useState({}); // { [eventId]: string }
  const [payingId, setPayingId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(undefined);
  const [paidLocal, setPaidLocal] = useState(new Set());
  const [refundedSet, setRefundedSet] = useState(new Set());
  const [eventPrices, setEventPrices] = useState({}); // { [eventId]: { amount, currency } }

  // Check if current user is a professor and can edit this workshop
  const canEditWorkshop = (evt) => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      if (role !== 'professor') return false;
      const userId = String(u._id || u.id || '');
      const eventType = getType(evt);
      if (eventType !== 'Workshop') return false;
      const eventCreatorId = String(evt?.createdBy || evt?.createdByUser || evt?.professor || '');
      return eventCreatorId && userId && eventCreatorId === userId;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    setRatings(loadRatings());
    let active = true;
    async function loadWallet() {
      try {
        const res = await getWalletBalance();
        if (!active) return;
        const balance = (res && typeof res.balance === 'number') ? res.balance : undefined;
        setWalletBalance(balance);
      } catch (_) {
        if (!active) return;
        setWalletBalance(undefined);
      }
    }
    loadWallet();
    const handler = (e) => {
      // Use balance from event detail if available, otherwise fetch
      if (e?.detail?.balance !== undefined && typeof e.detail.balance === 'number') {
        setWalletBalance(e.detail.balance);
      } else {
        loadWallet();
      }
    };
    window.addEventListener('wallet:updated', handler);
    return () => {
      active = false;
      window.removeEventListener('wallet:updated', handler);
    };
  }, []);

  // Fetch prices for all events
  useEffect(() => {
    if (!events || events.length === 0) return;
    let active = true;
    async function fetchPrices() {
      const priceMap = {};
      for (const evt of events) {
        const eventId = getEventId(evt);
        if (!eventId || priceMap[eventId]) continue;
        try {
          const priceData = await getEventPrice(eventId);
          if (!active) return;
          priceMap[eventId] = priceData;
        } catch (err) {
          console.error(`Failed to fetch price for event ${eventId}:`, err);
          // Fallback to old calculation
          const fallbackPrice = getPrice(evt);
          priceMap[eventId] = { amount: fallbackPrice, currency: 'egp' };
        }
      }
      if (active) {
        setEventPrices(priceMap);
      }
    }
    fetchPrices();
    return () => { active = false; };
  }, [events]);

  // Helpers to normalize event fields
  const getEventId = (evt) => evt?.event?._id || evt?._id || evt?.id;
  const getType = (evt) => evt?.event?.type || evt?.type || "Event";
  const getTitle = (evt) =>
    evt?.event?.name || evt?.event?.title || evt?.name || evt?.title || "Event";
  const getDesc = (evt) => evt?.event?.description || evt?.description || "";
  const getStart = (evt) => evt?.event?.startDate || evt?.date || evt?.startDate;
  const getEnd = (evt) => evt?.event?.endDate || evt?.endDate;
  const getLocation = (evt) => evt?.location || evt?.event?.location;
  const getCapacity = (evt) => evt?.capacity || evt?.event?.capacity;
  const getPrice = (evt) => {
    const eventId = getEventId(evt);
    // Use fetched price from backend if available (calculated correctly)
    if (eventId && eventPrices[eventId]) {
      return eventPrices[eventId].amount || 0;
    }
    // Fallback to old calculation (shouldn't happen if prices are fetched)
    const p = (evt?.event && (evt.event.price ?? evt.event.amount ?? evt.event.requiredBudget))
      ?? (evt?.price ?? evt?.amount ?? evt?.requiredBudget)
      ?? 0;
    return Number(p) || 0;
  };

  const getFundingSource = (evt) => {
    return evt?.event?.fundingSource || evt?.fundingSource || '';
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'Workshop': return 'from-violet-500 to-purple-600';
      case 'Bazaar': return 'from-amber-400 to-orange-500';
      case 'Booth': return 'from-pink-500 to-rose-600';
      case 'Competition': return 'from-red-500 to-rose-600';
      case 'Speaker': return 'from-blue-500 to-indigo-600';
      default: return 'from-emerald-400 to-teal-600';
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'Workshop': return '🛠️';
      case 'Bazaar': return '🏪';
      case 'Booth': return '🛒';
      case 'Competition': return '🏆';
      case 'Speaker': return '🎤';
      default: return '📅';
    }
  };

  const handleCardPay = async (evt) => {
    const eventId = getEventId(evt);
    if (!eventId) {
      showToast.error('Event id missing');
      return;
    }
    try {
      setPayingId(eventId);
      const { url } = await createCheckoutSession(eventId);
      if (url) {
        window.location.href = url;
        return;
      }
      showToast.error('Could not start card checkout. Please try again.');
    } catch (err) {
      showToast.error(err?.message || 'Checkout failed');
    } finally {
      setPayingId(null);
    }
  };

  const handleWalletPay = async (evt) => {
    const eventId = getEventId(evt);
    if (!eventId) {
      showToast.error('Event id missing');
      return;
    }
    const price = getPrice(evt);
    if (typeof walletBalance === 'number' && walletBalance < price) {
      showToast.error('Insufficient wallet balance');
      return;
    }
    try {
      setPayingId(eventId);
      const res = await payWithWallet(eventId);
      if (res && (res.success || res.status === 'paid' || res.paid)) {
        setPaidLocal(prev => new Set(prev).add(String(eventId)));
        // Use balance from response if available
        const newBalance = res.balance !== undefined ? res.balance : walletBalance;
        try {
          window.dispatchEvent(new CustomEvent('wallet:updated', {
            detail: { reason: 'wallet-pay', eventId, balance: newBalance, amount: price }
          }));
          window.dispatchEvent(new CustomEvent('payment:success', { detail: { method: 'Wallet', amount: price } }));
        } catch (_) { }
        // Update wallet balance immediately
        if (newBalance !== undefined) {
          setWalletBalance(newBalance);
        }
        showToast.success('Payment completed successfully!');
        return;
      }
      throw new Error(res?.message || 'Wallet payment failed');
    } catch (err) {
      showToast.error(err?.message || 'Wallet payment failed');
    } finally {
      setPayingId(null);
    }
  };

  async function handleRefundAndCancel(eventId) {
    try {
      const confirmed = await confirmDialog('Cancel your registration and refund to wallet? This will remove you from the event and allow you to register again.', 'Confirm Cancellation');
      if (!confirmed) return;
      const res = await refundAndCancel(eventId);
      const msg = (res && (res.message || (`Refunded ${res.refunded ?? ''} to wallet. New balance: ${res.balance ?? ''}`))) || 'Registration cancelled and refunded to wallet.';
      // Update wallet balance immediately from response
      if (res?.balance !== undefined) {
        setWalletBalance(res.balance);
      }
      try {
        const detail = { reason: 'refund', eventId, balance: res?.balance, amount: res?.refunded };
        window.dispatchEvent(new CustomEvent('wallet:updated', { detail }));
      } catch (_) { }
      showToast.success(msg);
      // Locally mark refunded so Pay Now appears again immediately
      try {
        setRefundedSet(prev => new Set(prev).add(String(eventId)));
        setPaidLocal(prev => { const next = new Set(prev); next.delete(String(eventId)); return next; });
      } catch (_) { }
      // Refresh events list to remove from registered events
      if (onRefresh) {
        onRefresh();
      }
      // Also dispatch event for parent components to refresh
      try {
        window.dispatchEvent(new CustomEvent('event:unregistered', { detail: { eventId } }));
      } catch (_) { }
    } catch (e) {
      showToast.error(e?.message || 'Refund failed');
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
    }
  };

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
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
        <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Loading events...</h3>
        <p className="text-slate-500">Please wait while we fetch your events.</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="text-6xl mb-6 opacity-50">📭</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No events found</h3>
        <p className="text-slate-500">
          You don't have any events in this category yet.
        </p>
      </div>
    );
  }

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
        const allowed = canRate(evt);
        const canComment = isRegistered(evt); // Comments require registration only, not attendance
        const current = ratings[id] || 0;
        const price = getPrice(evt);
        const fundingSource = getFundingSource(evt);
        const eventType = getType(evt);
        const serverPaid = Boolean(evt?.paymentStatus || evt?.paid || evt?.event?.paymentStatus || evt?.event?.paid);
        const isPaid = (serverPaid && !refundedSet.has(String(id))) || paidLocal.has(String(id));
        // For workshops: only show payment if funding is Internal (Grant/Sponsor/External are free)
        // For other events: show payment if price > 0
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

        return (
          <div
            key={id}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex flex-col group"
          >
            <div
              className={`h-48 flex items-center justify-center text-6xl bg-gradient-to-br ${getEventColor(type)}`}
            >
              <span className="transform group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                {getEventIcon(type)}
              </span>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  {type}
                </span>
                {isPayable && price > 0 && (
                  <span
                    title="Payment required"
                    className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold tracking-wide"
                  >
                    Due: {price} {eventPrices[getEventId(evt)]?.currency?.toUpperCase() || 'EGP'}
                  </span>
                )}
                {/* Show free/funded badge for workshops */}
                {eventType === 'Workshop' && price === 0 && isRegistered(evt) && (
                  <span
                    title={`This workshop is funded by ${fundingSource || 'external sources'}`}
                    className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1 tracking-wide"
                  >
                    <span>✓</span>
                    <span>FREE {fundingSource ? `(${fundingSource} Funded)` : ''}</span>
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                {title}
              </h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">
                {desc || "No description available"}
              </p>
              <div className="flex flex-col gap-2 text-sm text-slate-500 mb-6">
                {start && (
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span className="font-medium">{new Date(start).toLocaleDateString()}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="font-medium">{location}</span>
                  </div>
                )}
                {capacity && (
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span className="font-medium">{evt.registeredCount || 0}/{capacity}</span>
                  </div>
                )}
              </div>

              {/* View Details Button - Always visible */}
              <div className="mt-auto mb-4">
                <button
                  onClick={() => navigate(`/events/${id}`)}
                  className="w-full btn btn-outline btn-sm hover:bg-slate-900 hover:text-white transition-all"
                >
                  View Details
                </button>
              </div>

              {/* Rating + Comments (frontend-only rating; comments fetched from API) */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-700">Your rating</div>
                  <RatingStars
                    value={current}
                    onChange={(v) => setEventRating(id, v)}
                    disabled={!allowed}
                  />
                </div>

                {!allowed && (
                  <div className="text-xs text-slate-400 text-right italic">
                    {!hasEventEnded(evt)
                      ? 'Rating available after event ends'
                      : !isRegistered(evt)
                        ? 'Register to rate this event'
                        : 'Rating available'}
                  </div>
                )}

                {/* Show "Mark Attended" button only after event has ended */}
                {hasEventEnded(evt) && isRegistered(evt) && (
                  <button
                    type="button"
                    onClick={() => toggleAttendedLocal(id)}
                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${attendedSet.has(String(id))
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
                      }`}
                  >
                    {attendedSet.has(String(id)) ? '✓ Attended' : 'Mark Attended'}
                  </button>
                )}

                {isPayable && (
                  <div className="w-full">
                    <PaymentActions
                      paying={payingId === id}
                      disabled={false}
                      walletDisabled={walletDisabled}
                      onPayCard={() => handleCardPay(evt)}
                      onPayWallet={() => handleWalletPay(evt)}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleComments(id)}
                    className="flex-1 btn btn-ghost btn-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  >
                    {openComments[id] ? 'Hide Comments' : 'Show Comments'}
                  </button>

                  {canRefund && (
                    <button
                      type="button"
                      onClick={() => handleRefundAndCancel(id)}
                      className="flex-1 btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
                    >
                      Cancel & Refund
                    </button>
                  )}
                </div>

                {showRefundButton && isPaid && !canRefund && (
                  <div className="flex flex-col gap-1 w-full">
                    <button
                      type="button"
                      disabled
                      className="w-full btn btn-disabled btn-xs opacity-50"
                    >
                      Cancel & Refund (window closed)
                    </button>
                    <span className="text-xs text-slate-400 italic text-center">
                      Cancellation only available ≥ 14 days before start.
                    </span>
                  </div>
                )}

                {canEditWorkshop(evt) && (
                  <button
                    type="button"
                    onClick={() => navigate(`/professor/workshops?edit=${id}`)}
                    className="w-full btn btn-warning btn-sm text-white mt-2"
                  >
                    ✏️ Edit Workshop
                  </button>
                )}
              </div>

              {openComments[id] && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
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
                        className="input input-bordered input-sm flex-1 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        onClick={() => submitComment(id)}
                        disabled={!newCommentByEvent[id]?.trim() || commentsLoading[id]}
                        className="btn btn-primary btn-sm btn-square rounded-lg bg-slate-900 hover:bg-emerald-600 border-none text-white"
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
        );
      })}
    </div>
  );
}

export default MyEventsList;
