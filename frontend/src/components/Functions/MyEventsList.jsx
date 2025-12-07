import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { rateEvent, getEventPrice, getEventById } from "../../services/eventService";
import { getAttendedIds, toggleAttended } from "../../services/attendanceService";
import { refundAndCancel, createCheckoutSession, payWithWallet, getWalletBalance } from "../../services/paymentService";
import { showToast, confirmDialog } from "../../utils/toast";
import EventCard from "../Cards/EventCard";
import { getFavouriteIds, toggleFavourite } from '../../services/favoritesService';

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

// Helper functions to safely extract data from different event types (Workshop, Course, etc.)
const getEventId = (evt) => evt._id || evt.id;
const getType = (evt) => evt.type || 'Event';
const getFundingSource = (evt) => evt.fundingSource;
const getPrice = (evt) => evt.ticketPrice || evt.price || 0;
const getStart = (evt) => evt.startDate || evt.date;

const hasEventEnded = (evt) => {
  const end = evt.endDate || evt.date;
  return end ? new Date(end) < new Date() : false;
};

const hasEventStarted = (evt) => {
  const start = evt.startDate || evt.date;
  return start ? new Date(start) <= new Date() : false;
};

function MyEventsList({ events, showRefundButton = false, title, description }) {
  const navigate = useNavigate();
  // State for functional features
  const [ratings, setRatings] = useState(loadRatings());
  const [paidLocal, setPaidLocal] = useState(new Set());
  const [refundedSet, setRefundedSet] = useState(new Set());

  const [processingPayment, setProcessingPayment] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [eventPrices, setEventPrices] = useState({});
  const [favIds, setFavIds] = useState(new Set());

  const [attendedSet, setAttendedSet] = useState(() => new Set(getAttendedIds()));

  // Check if user is registered for the event
  const isRegistered = (evt) => {
    try {
      // 1. Trust explicit flag from backend if present
      if (typeof evt.isRegistered === 'boolean') return evt.isRegistered;
      if (typeof evt.registered === 'boolean') return evt.registered;

      // 2. Existing manual check
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

      // Dispatch event to notify other components
      setTimeout(() => {
        try {
          const event = new CustomEvent('rating:added', {
            detail: { eventId: String(eventId) },
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(event);
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
      showToast.error(err?.message || 'Failed to save rating.');
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
    // Sync attended set from events if needed (merge with local)
    if (events) {
      const serverAttendedIds = events.filter(e => e.attended).map(e => String(getEventId(e)));
      const localAttendedIds = getAttendedIds(); // Get from service (localStorage)

      // Merge unique Set
      setAttendedSet(new Set([...serverAttendedIds, ...localAttendedIds]));

      // Fetch prices for all events
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

  useEffect(() => {
    // Fetch wallet balance
    getWalletBalance()
      .then(res => setWalletBalance(res.balance ?? null))
      .catch(() => setWalletBalance(null));
    // Load favorites
    getFavouriteIds()
      .then(ids => {
        if (Array.isArray(ids)) {
          setFavIds(new Set(ids.map(String)));
        } else {
          setFavIds(new Set());
        }
      })
      .catch(err => {
        console.error('Error loading favorites:', err);
        setFavIds(new Set());
      });
  }, []);

  const handleToggleFav = async (id) => {
    try {
      const newIds = await toggleFavourite(id);
      if (Array.isArray(newIds)) {
        setFavIds(new Set(newIds.map(String)));
      } else {
        setFavIds(new Set());
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Reload favorites on error
      getFavouriteIds()
        .then(ids => {
          if (Array.isArray(ids)) {
            setFavIds(new Set(ids.map(String)));
          }
        })
        .catch(() => {});
    }
  };

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
        getWalletBalance().then(res => setWalletBalance(res.balance ?? null));
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

  // Rating allowed if: event has ended AND user is registered
  const canRate = (evt) => {
    if (!hasEventEnded(evt)) return false;
    return isRegistered(evt);
  };

  // Render logic
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
        <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span>📭</span> No events found
        </h3>
        <p className="text-slate-500">
          You don't have any events in this category yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(title || description) && (
        <div className="mb-2">
          {title && <h2 className="text-2xl font-bold text-slate-900">{title}</h2>}
          {description && <p className="text-slate-500">{description}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((evt) => {
          const id = getEventId(evt);
          const price = getPrice(evt);
          const fundingSource = getFundingSource(evt);
          const eventType = getType(evt);
          const serverPaid = Boolean(evt?.paymentStatus || evt?.paid || evt?.event?.paymentStatus || evt?.event?.paid);
          const isPaid = (serverPaid && !refundedSet.has(String(id))) || paidLocal.has(String(id));
          const requiresPayment = eventType === 'Workshop'
            ? (price > 0 && fundingSource === 'Internal')
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

          return (
            <EventCard
              key={id}
              event={evt}
              isFavorite={favIds.has(String(id))}
              onToggleFavorite={handleToggleFav}
              isRegistered={isRegistered(evt)}
              canRate={canRate(evt)}
              rating={ratings[id] || 0}
              onRate={setEventRating}
              isAttended={attendedSet.has(String(id))}
              onAttendedToggle={hasEventStarted(evt) && isRegistered(evt) ? toggleAttendedLocal : null}
              canEdit={canEditWorkshop(evt)}
              onEdit={(id) => navigate(`/professor/workshops/edit/${id}`)}
              canRefund={canRefund}
              onRefund={handleRefund}
              canUseWallet={canUseWallet}
              onPayCard={() => handlePay(evt, 'card')}
              onPayWallet={() => handlePay(evt, 'wallet')}
              processingPayment={processingPayment && payingId === id}
              isPayable={isPayable}
              showRefundButton={showRefundButton}
              isPaid={isPaid}
            />
          );
        })}
      </div>
    </div>
  );
}

export default MyEventsList;
