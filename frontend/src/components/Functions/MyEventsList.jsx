import React, { useEffect, useState } from "react";
import { getEventComments, addEventComment } from "../../services/eventService";
import { getAttendedIds, toggleAttended } from "../../services/attendanceService";
import { FaStar } from "react-icons/fa";
import PayDialog from "../Payments/PayDialog";
import { refundAndCancel } from "../../services/paymentService";

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
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{ display: "flex", alignItems: "center" }}
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
            style={{
              background: "transparent",
              border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              padding: 4,
            }}
          >
            <FaStar size={22} color={s <= active ? "#fbbf24" : "#e5e7eb"} />
          </button>
        ))}
      </div>
      {value > 0 && (
        <span style={{ color: "#6b7280", fontSize: 13 }}>You rated {value}/5</span>
      )}
    </div>
  );
}

function MyEventsList({ events, showRefundButton = false }) {
  const [ratings, setRatings] = useState({});
  const [attendedSet, setAttendedSet] = useState(new Set(getAttendedIds().map(String)));
  const [openComments, setOpenComments] = useState({}); // { [eventId]: true }
  const [commentsByEvent, setCommentsByEvent] = useState({}); // { [eventId]: Comment[] }
  const [commentsLoading, setCommentsLoading] = useState({}); // { [eventId]: boolean }
  const [commentsError, setCommentsError] = useState({}); // { [eventId]: string }
  const [newCommentByEvent, setNewCommentByEvent] = useState({}); // { [eventId]: string }
  const [payEvent, setPayEvent] = useState(null); // payment modal state
  const [paidLocal, setPaidLocal] = useState(new Set());
  const [refundedSet, setRefundedSet] = useState(new Set());

  useEffect(() => {
    setRatings(loadRatings());
  }, []);

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
    const p = (evt?.event && (evt.event.price ?? evt.event.amount ?? evt.event.requiredBudget))
      ?? (evt?.price ?? evt?.amount ?? evt?.requiredBudget)
      ?? 0;
    return Number(p) || 0;
  };

  async function handleRefundAndCancel(eventId) {
    try {
      const ok = window.confirm('Cancel your registration and refund to wallet?');
      if (!ok) return;
      const res = await refundAndCancel(eventId);
      const msg = (res && (res.message || (`Refunded ${res.refunded ?? ''} to wallet. New balance: ${res.balance ?? ''}`))) || 'Registration cancelled and refunded to wallet.';
      try {
        const detail = { reason: 'refund', eventId, balance: res?.balance, amount: res?.refunded };
        window.dispatchEvent(new CustomEvent('wallet:updated', { detail }));
      } catch (_) {}
      alert(msg);
      // Locally mark refunded so Pay Now appears again immediately
      try {
        setRefundedSet(prev => new Set(prev).add(String(eventId)));
        setPaidLocal(prev => { const next = new Set(prev); next.delete(String(eventId)); return next; });
      } catch (_) {}
    } catch (e) {
      alert(e?.message || 'Refund failed');
    }
  }

  const setEventRating = (eventId, value) => {
    setRatings((prev) => {
      const next = { ...prev, [eventId]: value };
      saveRatings(next);
      return next;
    });
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

  // Gate by attendance (frontend-only): require attended flag or local attendance
  const canRate = (evt) => {
    const attendedFlag = (evt && evt.attended === true) || (evt?.event && evt.event.attended === true);
    const id = getEventId(evt);
    const attendedLocal = id ? attendedSet.has(String(id)) : false;
    return Boolean(attendedFlag || attendedLocal);
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
    } catch (err) {
      setCommentsError(prev => ({ ...prev, [eventId]: err?.message || "Failed to add comment" }));
    } finally {
      setCommentsLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  // Loading / empty states
  if (!events || !Array.isArray(events)) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          padding: "60px 40px",
          borderRadius: "20px",
          textAlign: "center",
          boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>⏳</div>
        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>
          Loading...
        </h3>
        <p style={{ color: "#6b7280" }}>Please wait while we fetch your events.</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          padding: "60px 40px",
          borderRadius: "20px",
          textAlign: "center",
          boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>📭</div>
        <h3 style={{ fontSize: "1.5rem", color: "#003366", marginBottom: "10px" }}>
          No events found
        </h3>
        <p style={{ color: "#6b7280" }}>
          You don't have any events in this category yet.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "30px",
      }}
    >
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
        const serverPaid = Boolean(evt?.paymentStatus || evt?.paid || evt?.event?.paymentStatus || evt?.event?.paid);
        const isPaid = (serverPaid && !refundedSet.has(String(id))) || paidLocal.has(String(id));
        // Show payment for any registered event that is not paid and not past
        const isPayable = !isPaid && !hasEventEnded(evt);

        return (
          <div
            key={id}
            style={{
              background: "rgba(255,255,255,0.95)",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                height: "200px",
                background: `linear-gradient(135deg, ${getEventColor(type)} 0%, ${getEventColorDark(type)} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "4rem",
              }}
            >
              {getEventIcon(type)}
            </div>
            <div style={{ padding: "25px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    padding: "6px 12px",
                    background: "rgba(212, 175, 55, 0.15)",
                    color: "#d4af37",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                  }}
                >
                  {type}
                </span>
                {isPayable && price > 0 && (
                  <span
                    title="Payment required"
                    style={{
                      padding: "6px 12px",
                      background: "rgba(239,68,68,0.12)",
                      color: "#ef4444",
                      borderRadius: 8,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    Due: {price}
                  </span>
                )}
              </div>
              <h3
                style={{
                  fontSize: "1.3rem",
                  fontWeight: "bold",
                  color: "#003366",
                  marginBottom: "12px",
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.9rem",
                  marginBottom: "15px",
                  lineHeight: "1.5",
                }}
              >
                {(desc || "No description available").substring(0, 100)}...
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  fontSize: "0.85rem",
                  color: "#6b7280",
                }}
              >
                {start && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📅</span>
                    <span>{new Date(start).toLocaleDateString()}</span>
                  </div>
                )}
                {location && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>📍</span>
                    <span>{location}</span>
                  </div>
                )}
                {capacity && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>👥</span>
                    <span>{evt.registeredCount || 0}/{capacity}</span>
                  </div>
                )}
              </div>

              {/* Rating + Comments (frontend-only rating; comments fetched from API) */}
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "#003366", fontWeight: 600 }}>Your rating</div>
                <RatingStars
                  value={current}
                  onChange={(v) => setEventRating(id, v)}
                  disabled={!allowed}
                />
                {!allowed && (
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>
                    Rating available after you mark attendance
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleAttendedLocal(id)}
                  style={{
                    padding: '6px 10px',
                    background: attendedSet.has(String(id)) ? 'rgba(34,197,94,0.15)' : 'rgba(212,175,55,0.15)',
                    color: attendedSet.has(String(id)) ? '#16a34a' : '#b8941f',
                    border: attendedSet.has(String(id)) ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(212,175,55,0.3)',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {attendedSet.has(String(id)) ? 'Attended' : 'Mark Attended'}
                </button>
                {isPayable && (
                  <button
                    type="button"
                    onClick={() => setPayEvent(evt)}
                    style={{
                      marginLeft: 'auto',
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                      color: '#003366',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Pay Now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleComments(id)}
                  style={{
                    marginLeft: 'auto',
                    padding: '8px 12px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: '#b8941f',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {openComments[id] ? 'Hide Comments' : 'Show Comments'}
                </button>
                {showRefundButton && isPaid && (
                  <button
                    type="button"
                    onClick={() => handleRefundAndCancel(id)}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(239,68,68,0.12)',
                      color: '#b91c1c',
                      border: '1px solid rgba(239,68,68,0.35)',
                      borderRadius: 8,
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel & Refund
                  </button>
                )}
              </div>

              {openComments[id] && (
                <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                  {commentsLoading[id] && (
                    <div style={{ color: '#6b7280' }}>Loading comments…</div>
                  )}
                  {commentsError[id] && (
                    <div style={{ color: '#dc2626' }}>{commentsError[id]}</div>
                  )}
                  {Array.isArray(commentsByEvent[id]) && commentsByEvent[id].length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {commentsByEvent[id].map(c => (
                        <div key={c._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                          <div style={{ fontWeight: 600, color: '#003366' }}>
                            {(c.user && (c.user.firstName || c.user.lastName)) ? `${c.user.firstName||''} ${c.user.lastName||''}`.trim() : (c.user?.email || 'User')}
                            <span style={{ marginLeft: 8, color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <div style={{ color: '#374151' }}>{c.content}</div>
                        </div>
                      ))}
                    </div>
                  ) : (!commentsLoading[id] && !commentsError[id]) ? (
                    <div style={{ color: '#6b7280' }}>No comments yet.</div>
                  ) : null}

                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={newCommentByEvent[id] || ''}
                      onChange={(e) => setNewCommentByEvent(prev => ({ ...prev, [id]: e.target.value }))}
                      placeholder={canComment ? 'Write a comment…' : 'You must be registered for this event to comment'}
                      disabled={!canComment}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb' }}
                    />
                    <button
                      onClick={() => submitComment(id)}
                      disabled={!canComment || !String(newCommentByEvent[id] || '').trim() || !!commentsLoading[id]}
                      style={{
                        padding: '10px 14px',
                        background: (!canComment || commentsLoading[id]) ? '#e5e7eb' : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                        color: '#003366',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 800,
                        cursor: (!canComment || commentsLoading[id]) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Post
                    </button>
                  </div>
                  {!canComment && (
                    <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>
                      You must be registered for this event to comment.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {payEvent && (
        <PayDialog
          open={!!payEvent}
          event={payEvent}
          onClose={() => setPayEvent(null)}
          onSuccess={({ eventId }) => {
            setPaidLocal(prev => new Set(prev).add(String(eventId)));
          }}
        />
      )}
    </div>
  );
}

function getEventIcon(type) {
  const icons = {
    Workshop: "🛠️",
    Trip: "🧭",
    Bazaar: "🛍️",
    Booth: "🧺",
    Conference: "🎤",
  };
  return icons[type] || "🎫";
}

function getEventColor(type) {
  const colors = {
    Workshop: "#3b82f6",
    Trip: "#10b981",
    Bazaar: "#f59e0b",
    Booth: "#ec4899",
    Conference: "#8b5cf6",
  };
  return colors[type] || "#6b7280";
}

function getEventColorDark(type) {
  const colors = {
    Workshop: "#1e40af",
    Trip: "#047857",
    Bazaar: "#d97706",
    Booth: "#be185d",
    Conference: "#6d28d9",
  };
  return colors[type] || "#4b5563";
}

export default MyEventsList;
