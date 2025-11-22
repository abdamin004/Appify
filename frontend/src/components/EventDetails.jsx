import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { getEventById, getEventComments, getEventRatings, addEventComment, deleteEventComment, registerForEvent, rateEvent, deleteEvent } from '../services/eventService';
import { getAttendedIds, toggleAttended } from '../services/attendanceService';
import { showToast, confirmDialog } from '../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../utils/designSystem';
import { FaStar } from 'react-icons/fa';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [comments, setComments] = useState([]);
  const [ratings, setRatings] = useState({ average: 0, count: 0, ratings: [], histogram: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attended, setAttended] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Define these before useEffect to avoid initialization errors
  const tokenPresent = (() => {
    try { return !!(typeof localStorage !== 'undefined' && localStorage.getItem('token')); } catch { return false; }
  })();

  const currentUserId = (() => {
    try { const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null; const u = raw ? JSON.parse(raw) : null; return u && (u._id || u.id) ? String(u._id || u.id) : null; } catch { return null; }
  })();

  // Check if user can edit based on requirements:
  // - EventOffice can edit all events, but with time restrictions:
  //   * Bazaars: only if bazaar hasn't started yet (Req 32)
  //   * Trips: only if trip start date hasn't passed yet (Req 34)
  //   * Conferences: can edit (Req 46)
  // - Professor can edit their own workshops (Req 36)
  // - Admin CANNOT edit events (only delete) (Req 48)
  const canEdit = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw || !event) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      const userId = String(u._id || u.id || '');
      const now = new Date();
      
      // EventOffice can edit events with time restrictions
      if (role === 'eventoffice') {
        // Workshops: EventOffice CANNOT edit workshops (they can only accept/reject/request edits)
        if (event.type === 'Workshop') {
          return false;
        }
        // Bazaars: can only edit if bazaar hasn't started yet
        if (event.type === 'Bazaar' && event.startDate && new Date(event.startDate) <= now) {
          return false;
        }
        // Trips: can only edit if trip start date hasn't passed yet
        if (event.type === 'Trip' && event.startDate && new Date(event.startDate) <= now) {
          return false;
        }
        // Conferences and Gym Sessions: can edit
        return true;
      }
      
      // Professor can only edit their own workshops
      if (role === 'professor' && event.type === 'Workshop') {
        const eventCreatorId = String(event.createdBy || event.createdByUser || event.professor || '');
        return eventCreatorId && userId && eventCreatorId === userId;
      }
      
      return false;
    } catch {
      return false;
    }
  })();

  // Check if user is EventOffice or Admin (should not be able to register)
  const isEventOffice = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      return role === 'eventoffice' || role === 'admin';
    } catch {
      return false;
    }
  })();

  // Get edit route based on event type
  const getEditRoute = () => {
    if (!event) return null;
    const type = event.type?.toLowerCase();
    const eventId = event._id || event.id;
    const routes = {
      bazaar: `/events-office/bazaars/edit/${eventId}`,
      trip: `/events-office/trips/edit/${eventId}`,
      conference: `/events-office/conferences/edit/${eventId}`,
      gymsession: `/events-office/gym-sessions/edit/${eventId}`,
      workshop: `/professor/workshops/edit/${eventId}`,
    };
    return routes[type] || null;
  };

  const handleEdit = () => {
    const route = getEditRoute();
    if (route) {
      navigate(route);
    } else {
      showToast.warning('Edit not available for this event type');
    }
  };

  // Check if user can delete (Admin or EventOffice)
  const canDelete = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw || !event) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      return role === 'admin' || role === 'eventoffice';
    } catch {
      return false;
    }
  })();

  // Check if user can archive (EventOffice only, Requirement 47)
  const canArchive = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      return role === 'eventoffice';
    } catch {
      return false;
    }
  })();

  const hasRegistrations = (event?.registeredCount || (event?.registeredUsers && event.registeredUsers.length) || 0) > 0;
  // Check if event has passed - use endDate if available, otherwise startDate
  const eventHasPassed = event && ((event.endDate && new Date(event.endDate) <= new Date()) || 
    (!event.endDate && event.startDate && new Date(event.startDate) <= new Date()));
  const isArchived = event?.status === 'completed' || (typeof window !== 'undefined' && (() => {
    try {
      const stored = localStorage.getItem('archivedEvents');
      const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
      return archivedSet.has(event?._id || event?.id);
    } catch {
      return false;
    }
  })());

  async function handleDeleteEvent() {
    if (!event) return;
    const confirmed = await confirmDialog('Delete this event? This cannot be undone.', 'Delete Event');
    if (!confirmed) return;
    try {
      await deleteEvent(event._id || event.id);
      showToast.success('Event deleted successfully');
      navigate(-1); // Go back after deletion
    } catch (err) {
      showToast.error(err.message || 'Failed to delete event');
    }
  }

  async function handleArchiveEvent() {
    const confirmed = await confirmDialog('Archive this event? It will be hidden from the event list.', 'Archive Event');
    if (!confirmed) return;
    
    // Frontend-only archiving
    try {
      const stored = localStorage.getItem('archivedEvents');
      const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
      archivedSet.add(event._id || event.id);
      localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
      showToast.success('Event archived successfully!');
      // Reload event to update UI
      window.location.reload();
    } catch (err) {
      console.error('Failed to archive event', err);
      showToast.error('Failed to archive event');
    }
  }

  async function handleUnarchiveEvent() {
    if (!event) return;
    const confirmed = await confirmDialog('Archive this event? It will be hidden from the event list.', 'Archive Event');
    if (!confirmed) return;
    
    // Frontend-only archiving - add to localStorage
    const eventId = event._id || event.id;
    try {
      const stored = localStorage.getItem('archivedEvents');
      const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
      archivedSet.add(eventId);
      localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
      showToast.success('Event archived successfully');
      navigate(-1); // Go back after archiving
    } catch (err) {
      showToast.error('Failed to archive event');
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Always try to load event (no auth required)
        const e = await getEventById(id);
        setEvent(e);
        
        // Only load comments/ratings if user is logged in (they require auth)
        if (tokenPresent) {
          try {
            const [cs, rs] = await Promise.all([
              getEventComments(id),
              getEventRatings(id)
            ]);
            // getEventComments now returns array directly (handles backend format)
            setComments(Array.isArray(cs) ? cs : []);
            // getEventRatings now returns { average, count, ratings, histogram } format
            setRatings(rs && typeof rs === 'object' ? rs : { average: 0, count: 0, ratings: [], histogram: {} });
            
            // Check if user has already rated this event
            if (rs && Array.isArray(rs.ratings) && currentUserId) {
              const userRatingObj = rs.ratings.find(r => String(r.user?._id || r.user?.id || r.user) === String(currentUserId));
              if (userRatingObj) {
                setUserRating(userRatingObj.rating || 0);
              }
            }
          } catch (err) {
            // If comments/ratings fail, just set empty arrays (user might not be logged in or not have permission)
            console.warn('Failed to load comments/ratings:', err);
            setComments([]);
            setRatings({ average: 0, count: 0, ratings: [], histogram: {} });
          }
        } else {
          // User not logged in, set empty comments/ratings
          setComments([]);
          setRatings({ average: 0, count: 0, ratings: [], histogram: {} });
        }
      } catch (err) {
        setError(err?.message || 'Failed to load event');
      } finally { setLoading(false); }
    }
    load();
    try {
      const ids = getAttendedIds().map(String);
      if (ids.includes(String(id))) setAttended(true);
    } catch(_) {}
  }, [id, currentUserId, tokenPresent]);

  const isRegistered = !!(event && Array.isArray(event.registeredUsers) && currentUserId && event.registeredUsers.map(String).includes(String(currentUserId)));

  async function handleRegister() {
    if (!tokenPresent) {
      showToast.warning('Please log in to register for events');
      return;
    }

    if (isRegistered) {
      showToast.info('You are already registered for this event');
      return;
    }

    setRegistering(true);
    try {
      await registerForEvent(id);
      showToast.success('Successfully registered for the event!');
      // Reload event data to update registration status
      const updatedEvent = await getEventById(id);
      setEvent(updatedEvent);
    } catch (err) {
      showToast.error(err.message || 'Failed to register for event');
    } finally {
      setRegistering(false);
    }
  }

  function toggleAttendedHere() {
    setAttended(prev => {
      const next = !prev;
      toggleAttended(id);
      return next;
    });
  }

  async function submitComment(e) {
    e && e.preventDefault && e.preventDefault();
    setError('');
    if (!newComment.trim()) {
      showToast.warning('Please enter a comment');
      return;
    }
    setSubmitting(true);
    try {
      await addEventComment(id, newComment.trim());
      setNewComment('');
      const cs = await getEventComments(id);
      setComments(Array.isArray(cs) ? cs : []);
      showToast.success('Comment added successfully');
    } catch (err) {
      const errorMsg = err?.message || 'Failed to add comment';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally { setSubmitting(false); }
  }

  async function handleDeleteComment(cid) {
    const confirmed = await confirmDialog('Are you sure you want to delete this comment?', 'Delete Comment');
    if (!confirmed) return;
    try {
      await deleteEventComment(cid);
      setComments(prev => prev.filter(c => c._id !== cid));
      showToast.success('Comment deleted successfully');
    } catch (err) {
      showToast.error(err?.message || 'Failed to delete comment');
    }
  }

  async function handleRating(ratingValue) {
    if (!tokenPresent) {
      showToast.warning('Please log in to rate events');
      return;
    }

    if (!isRegistered) {
      showToast.warning('You must be registered for this event to rate it');
      return;
    }

    setSubmittingRating(true);
    try {
      await rateEvent(id, ratingValue);
      setUserRating(ratingValue);
      // Reload ratings to update average
      const updatedRatings = await getEventRatings(id);
      setRatings(updatedRatings && typeof updatedRatings === 'object' ? updatedRatings : { average: 0, count: 0, ratings: [], histogram: {} });
      showToast.success('Rating submitted successfully!');
    } catch (err) {
      showToast.error(err?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  }

  const canRate = tokenPresent && isRegistered && (!event?.endDate || new Date(event.endDate) <= new Date());

  // Better event icons with gradients
  const getEventIcon = (type) => {
    const icons = {
      Workshop: '🎓',
      Trip: '✈️',
      Bazaar: '🛍️',
      Booth: '🏢',
      Conference: '🎙️'
    };
    return icons[type] || '📅';
  };

  const getEventGradient = (type) => {
    const gradients = {
      Workshop: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
      Trip: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`,
      Bazaar: `linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)`,
      Booth: `linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)`,
      Conference: `linear-gradient(135deg, #fa709a 0%, #fee140 100%)`
    };
    return gradients[type] || `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`;
  };

  const typeColors = {
    Workshop: { bg: 'rgba(212, 175, 55, 0.15)', text: colors.primary },
    Trip: { bg: 'rgba(0, 51, 102, 0.1)', text: colors.primary },
    Bazaar: { bg: 'rgba(212, 175, 55, 0.2)', text: colors.accentDark },
    Booth: { bg: 'rgba(0, 51, 102, 0.15)', text: colors.primary },
    Conference: { bg: 'rgba(212, 175, 55, 0.15)', text: colors.accentDark }
  };
  const color = typeColors[event?.type] || { bg: 'rgba(212, 175, 55, 0.1)', text: colors.primary };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary }}>
      <Navbar />
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, maxWidth: 1200, margin: '0 auto' }}>
        {/* Back Button and All Events Button - Fixed visibility with white background */}
        <div style={{ marginBottom: spacing.xl, display: 'flex', gap: spacing.md }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{
              ...buttonStyles.back,
              background: colors.bgCard,
              color: colors.primary,
              borderColor: colors.primary
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.accent;
              e.target.style.color = colors.primary;
              e.target.style.borderColor = colors.accent;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.bgCard;
              e.target.style.color = colors.primary;
              e.target.style.borderColor = colors.primary;
            }}
          >
            ← Back
          </button>
          <button 
            onClick={() => navigate("/events")} 
            style={{
              ...buttonStyles.back,
              background: colors.bgCard,
              color: colors.primary,
              borderColor: colors.primary
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.accent;
              e.target.style.color = colors.primary;
              e.target.style.borderColor = colors.accent;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.bgCard;
              e.target.style.color = colors.primary;
              e.target.style.borderColor = colors.primary;
            }}
          >
            All Events
          </button>
        </div>

        {loading && (
          <div style={{ 
            background: colors.bgCard, 
            borderRadius: borderRadius['2xl'], 
            boxShadow: shadows.lg, 
            padding: spacing['4xl'],
            textAlign: 'center'
          }}>
            <div style={{ color: colors.gray500, fontSize: typography.fontSize.lg }}>Loading event details…</div>
          </div>
        )}

        {error && (
          <div style={{ 
            background: colors.bgCard, 
            borderRadius: borderRadius['2xl'], 
            boxShadow: shadows.lg, 
            padding: spacing['2xl'],
            color: colors.error,
            fontSize: typography.fontSize.base
          }}>{error}</div>
        )}

        {!loading && !error && event && (
          <>
            {/* Event Header Card with Image */}
            <div style={{ 
              background: colors.bgCard, 
              borderRadius: borderRadius['2xl'], 
              boxShadow: shadows.lg, 
              overflow: 'hidden',
              marginBottom: spacing.xl
            }}>
              {/* Event Image/Icon Header */}
              <div style={{ 
                height: '300px',
                background: event.imageUrl 
                  ? `url(${event.imageUrl}) center/cover` 
                  : getEventGradient(event.type),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {!event.imageUrl && (
                  <div style={{ 
                    fontSize: '8rem',
                    filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))',
                    transform: 'scale(1.1)'
                  }}>{getEventIcon(event.type)}</div>
                )}
                {event.status === 'cancelled' && (
                  <div style={{
                    position: 'absolute',
                    top: spacing.lg,
                    right: spacing.lg,
                    padding: `${spacing.sm} ${spacing.lg}`,
                    background: colors.error,
                    color: colors.white,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold
                  }}>CANCELLED</div>
                )}
              </div>

              {/* Event Info Section */}
              <div style={{ padding: spacing['3xl'] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
                  <span style={{ 
                    padding: `${spacing.xs} ${spacing.lg}`, 
                    background: color.bg, 
                    color: color.text,
                    borderRadius: borderRadius.full,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.semibold,
                    border: `1px solid rgba(212, 175, 55, 0.2)`
                  }}>
                    {event.type}
                  </span>
                  {event.price > 0 && (
                    <span style={{ 
                      fontSize: typography.fontSize.xl, 
                      fontWeight: typography.fontWeight.bold, 
                      color: colors.accent 
                    }}>
                      ${event.price}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.md }}>
                  <h1 style={{ 
                    margin: 0, 
                    color: colors.primary,
                    fontSize: typography.fontSize['4xl'],
                    fontWeight: typography.fontWeight.bold,
                    lineHeight: typography.lineHeight.tight,
                    flex: 1,
                    minWidth: '200px'
                  }}>{event.title}</h1>
                  
                  {/* Action Buttons - Edit, Delete, Archive, Register */}
                  <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Edit Button - Same logic as EventCard with time restrictions */}
                    {(() => {
                      const canEditNow = canEdit && event && getEditRoute();
                      const isEventOfficeUser = (() => {
                        try {
                          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
                          if (!raw) return false;
                          const u = JSON.parse(raw);
                          return (u.role || '').toLowerCase() === 'eventoffice';
                        } catch {
                          return false;
                        }
                      })();
                      
                      const eventStarted = isEventOfficeUser && event?.startDate && new Date(event.startDate) <= new Date();
                      const isRestrictedType = event?.type === 'Bazaar' || event?.type === 'Trip';
                      
                      if (canEditNow) {
                        return (
                          <button 
                            onClick={handleEdit} 
                            style={{
                              padding: `${spacing.sm} ${spacing.lg}`,
                              background: colors.warning,
                              color: colors.white,
                              border: 'none',
                              borderRadius: borderRadius.xl,
                              fontWeight: typography.fontWeight.bold,
                              fontSize: typography.fontSize.sm,
                              cursor: 'pointer',
                              transition: transitions.normal,
                              boxShadow: shadows.sm,
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = shadows.md;
                              e.target.style.opacity = 0.9;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = shadows.sm;
                              e.target.style.opacity = 1;
                            }}
                          >
                            ✏️ Edit
                          </button>
                        );
                      } else if (isEventOfficeUser && isRestrictedType && eventStarted) {
                        return (
                          <button
                            disabled
                            style={{
                              padding: `${spacing.sm} ${spacing.lg}`,
                              background: colors.gray400,
                              color: colors.white,
                              border: 'none',
                              borderRadius: borderRadius.xl,
                              fontWeight: typography.fontWeight.bold,
                              fontSize: typography.fontSize.sm,
                              cursor: 'not-allowed',
                              opacity: 0.6,
                              whiteSpace: 'nowrap'
                            }}
                            title={event?.type === 'Bazaar' 
                              ? 'Cannot edit bazaar after it has started' 
                              : 'Cannot edit trip after start date has passed'}
                          >
                            ⏰ Edit Not Available
                          </button>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Delete Button - Admin/EventOffice can delete if no registrations */}
                    {canDelete && !hasRegistrations && (
                      <button
                        onClick={handleDeleteEvent}
                        style={{
                          padding: `${spacing.sm} ${spacing.lg}`,
                          background: colors.error,
                          color: colors.white,
                          border: 'none',
                          borderRadius: borderRadius.xl,
                          fontWeight: typography.fontWeight.bold,
                          fontSize: typography.fontSize.sm,
                          cursor: 'pointer',
                          transition: transitions.normal,
                          boxShadow: shadows.sm,
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = shadows.md;
                          e.target.style.opacity = 0.9;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = shadows.sm;
                          e.target.style.opacity = 1;
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}
                    
                    {/* Archive/Unarchive Button - EventOffice can archive/unarchive events */}
                    {canArchive && eventHasPassed && !isArchived && (
                      <button
                        onClick={handleArchiveEvent}
                        style={{
                          padding: `${spacing.sm} ${spacing.lg}`,
                          background: colors.gray500,
                          color: colors.white,
                          border: 'none',
                          borderRadius: borderRadius.xl,
                          fontWeight: typography.fontWeight.bold,
                          fontSize: typography.fontSize.sm,
                          cursor: 'pointer',
                          transition: transitions.normal,
                          boxShadow: shadows.sm,
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = shadows.md;
                          e.target.style.opacity = 0.9;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = shadows.sm;
                          e.target.style.opacity = 1;
                        }}
                      >
                        📦 Archive
                      </button>
                    )}
                    {canArchive && isArchived && (
                      <button
                        onClick={handleUnarchiveEvent}
                        style={{
                          padding: `${spacing.sm} ${spacing.lg}`,
                          background: colors.accent,
                          color: colors.primary,
                          border: 'none',
                          borderRadius: borderRadius.xl,
                          fontWeight: typography.fontWeight.bold,
                          fontSize: typography.fontSize.sm,
                          cursor: 'pointer',
                          transition: transitions.normal,
                          boxShadow: shadows.sm,
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = shadows.md;
                          e.target.style.opacity = 0.9;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = shadows.sm;
                          e.target.style.opacity = 1;
                        }}
                      >
                        📤 Unarchive
                      </button>
                    )}
                    
                    {/* Register Button - Only show if event is available for registration and user is not EventOffice/Admin */}
                    {/* Students cannot register for Booths - only vendors can apply */}
                    {!isEventOffice && event.type !== 'Booth' && event.type !== 'Bazaar' && event.status !== 'cancelled' && event.status !== 'completed' && 
                     (!event.registrationDeadline || new Date(event.registrationDeadline) > new Date()) &&
                     (!event.capacity || (event.registeredUsers?.length || 0) < event.capacity) && (
                      <>
                        {isRegistered ? (
                          <button
                            disabled
                            style={{
                              padding: `${spacing.sm} ${spacing.lg}`,
                              background: colors.success,
                              color: colors.white,
                              border: 'none',
                              borderRadius: borderRadius.xl,
                              fontWeight: typography.fontWeight.bold,
                              fontSize: typography.fontSize.sm,
                              cursor: 'not-allowed',
                              opacity: 0.7,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✓ Registered
                          </button>
                        ) : (
                          <button
                            onClick={handleRegister}
                            disabled={registering}
                            style={{
                              padding: `${spacing.sm} ${spacing.lg}`,
                              background: registering 
                                ? colors.gray400 
                                : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                              color: colors.primary,
                              border: 'none',
                              borderRadius: borderRadius.xl,
                              fontWeight: typography.fontWeight.bold,
                              fontSize: typography.fontSize.sm,
                              cursor: registering ? 'not-allowed' : 'pointer',
                              transition: transitions.normal,
                              boxShadow: registering ? 'none' : shadows.accent,
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                              if (!registering) {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = shadows.accentHover;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!registering) {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = shadows.accent;
                              }
                            }}
                          >
                            {registering ? 'Registering...' : tokenPresent ? 'Register' : 'Log in'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: spacing.lg,
                  marginBottom: spacing.xl,
                  padding: spacing.xl,
                  background: colors.gray50,
                  borderRadius: borderRadius.xl
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <span style={{ fontSize: typography.fontSize.xl }}>📅</span>
                    <div>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.gray500, marginBottom: spacing.xs }}>Date & Time</div>
                      <div style={{ fontSize: typography.fontSize.base, color: colors.primary, fontWeight: typography.fontWeight.medium }}>
                        {event.startDate ? new Date(event.startDate).toLocaleString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'TBA'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <span style={{ fontSize: typography.fontSize.xl }}>📍</span>
                    <div>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.gray500, marginBottom: spacing.xs }}>Location</div>
                      <div style={{ fontSize: typography.fontSize.base, color: colors.primary, fontWeight: typography.fontWeight.medium }}>
                        {event.location || 'TBA'}
                      </div>
                    </div>
                  </div>

                  {event.capacity > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                      <span style={{ fontSize: typography.fontSize.xl }}>👥</span>
                      <div>
                        <div style={{ fontSize: typography.fontSize.sm, color: colors.gray500, marginBottom: spacing.xs }}>Capacity</div>
                        <div style={{ fontSize: typography.fontSize.base, color: colors.primary, fontWeight: typography.fontWeight.medium }}>
                          {event.registeredCount || 0} / {event.capacity} registered
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {event.shortDescription && (
                  <div style={{ 
                    marginBottom: spacing.xl,
                    padding: spacing.xl,
                    background: colors.gray50,
                    borderRadius: borderRadius.xl
                  }}>
                    <h3 style={{ 
                      fontSize: typography.fontSize.lg, 
                      fontWeight: typography.fontWeight.semibold, 
                      color: colors.primary,
                      marginBottom: spacing.md
                    }}>About This Event</h3>
                    <p style={{ 
                      color: colors.gray700, 
                      fontSize: typography.fontSize.base,
                      lineHeight: typography.lineHeight.relaxed,
                      margin: 0
                    }}>{event.shortDescription}</p>
                  </div>
                )}

              </div>
            </div>

            {/* Ratings & Comments Section */}
            <div style={{ 
              background: colors.bgCard, 
              borderRadius: borderRadius['2xl'], 
              boxShadow: shadows.lg, 
              padding: spacing['3xl'],
              marginBottom: spacing.xl
            }}>
              {/* Ratings summary */}
              <div style={{ 
                marginBottom: spacing['2xl'], 
                paddingBottom: spacing['2xl'], 
                borderBottom: `2px solid ${colors.gray200}` 
              }}>
                <h2 style={{ 
                  margin: `0 0 ${spacing.lg}`, 
                  color: colors.primary,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold
                }}>Ratings & Reviews</h2>
                
                {/* User Rating Section */}
                {tokenPresent && isRegistered && (
                  <div style={{ 
                    marginBottom: spacing.xl,
                    padding: spacing.xl,
                    background: colors.gray50,
                    borderRadius: borderRadius.xl
                  }}>
                    <div style={{ 
                      fontSize: typography.fontSize.base,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.primary,
                      marginBottom: spacing.md
                    }}>
                      {userRating > 0 ? 'Your Rating' : 'Rate this Event'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: spacing.xs }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => !submittingRating && canRate && handleRating(star)}
                            onMouseEnter={() => !submittingRating && canRate && setRatingHover(star)}
                            onMouseLeave={() => !submittingRating && canRate && setRatingHover(0)}
                            disabled={submittingRating || !canRate}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: (submittingRating || !canRate) ? 'not-allowed' : 'pointer',
                              padding: spacing.xs,
                              opacity: (submittingRating || !canRate) ? 0.5 : 1
                            }}
                          >
                            <FaStar 
                              size={28} 
                              color={(star <= (ratingHover || userRating)) ? '#fbbf24' : '#e5e7eb'} 
                              style={{ transition: transitions.fast }}
                            />
                          </button>
                        ))}
                      </div>
                      {userRating > 0 && (
                        <span style={{ 
                          color: colors.gray600,
                          fontSize: typography.fontSize.sm
                        }}>
                          You rated {userRating}/5
                        </span>
                      )}
                      {!canRate && tokenPresent && (
                        <span style={{ 
                          color: colors.gray500,
                          fontSize: typography.fontSize.sm
                        }}>
                          {!isRegistered ? 'Register to rate' : 'Rating available after event ends'}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: spacing.lg,
                  padding: spacing.xl,
                  background: colors.gray50,
                  borderRadius: borderRadius.xl
                }}>
                  <div style={{ 
                    fontSize: typography.fontSize['4xl'], 
                    fontWeight: typography.fontWeight.bold, 
                    color: colors.accent 
                  }}>{ratings.average?.toFixed(1) || '0.0'}</div>
                  <div>
                    <div style={{ 
                      fontSize: typography.fontSize.lg,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.primary,
                      marginBottom: spacing.xs
                    }}>{ratings.count || 0} {ratings.count === 1 ? 'rating' : 'ratings'}</div>
                    <div style={{ fontSize: typography.fontSize['2xl'] }}>⭐</div>
                  </div>
                </div>
                {/* Optional histogram */}
                {ratings.histogram && Object.keys(ratings.histogram).length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    gap: spacing.lg, 
                    marginTop: spacing.lg, 
                    padding: spacing.md,
                    background: colors.white,
                    borderRadius: borderRadius.md,
                    flexWrap: 'wrap'
                  }}>
                    {[5,4,3,2,1].map(v => (
                      <div key={v} style={{ 
                        color: colors.gray700,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium
                      }}>
                        {v}★: {ratings.histogram[v] || 0}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <h2 style={{ 
                  margin: `0 0 ${spacing.lg}`, 
                  color: colors.primary,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold
                }}>Comments</h2>

                {/* Add Comment Form */}
                {tokenPresent && isRegistered && (
                  <div style={{ 
                    marginBottom: spacing.xl,
                    padding: spacing.xl,
                    background: colors.gray50,
                    borderRadius: borderRadius.xl
                  }}>
                    <form onSubmit={submitComment}>
                      <label style={{
                        display: 'block',
                        marginBottom: spacing.sm,
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.primary
                      }}>
                        Add a Comment
                      </label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts about this event..."
                        rows={3}
                        style={{
                          ...inputStyles.base,
                          width: '100%',
                          minHeight: '80px',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = colors.accent;
                          e.target.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.1)`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = colors.gray200;
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: spacing.md }}>
                        <button
                          type="submit"
                          disabled={submitting || !newComment.trim()}
                          style={{
                            ...buttonStyles.primary,
                            padding: `${spacing.md} ${spacing['2xl']}`,
                            opacity: (submitting || !newComment.trim()) ? 0.6 : 1,
                            cursor: (submitting || !newComment.trim()) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {!tokenPresent && (
                  <div style={{ 
                    color: colors.gray500,
                    fontSize: typography.fontSize.sm,
                    padding: spacing.md,
                    background: colors.gray50,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.lg
                  }}>
                    Please log in and register for this event to add comments.
                  </div>
                )}

                {comments.length === 0 ? (
                  <div style={{ 
                    color: colors.gray500,
                    fontSize: typography.fontSize.base,
                    padding: spacing.xl,
                    textAlign: 'center',
                    background: colors.gray50,
                    borderRadius: borderRadius.xl
                  }}>No comments yet. Be the first to comment!</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
                    {comments.map(c => {
                      const isOwnComment = currentUserId && String(c.user?._id || c.user?.id || c.user) === String(currentUserId);
                      return (
                        <div key={c._id} style={{ 
                          background: colors.white, 
                          border: `1px solid ${colors.gray200}`, 
                          borderRadius: borderRadius.xl, 
                          padding: spacing.lg,
                          transition: transitions.fast
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = shadows.md;
                          e.currentTarget.style.borderColor = colors.accent;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = colors.gray200;
                        }}
                        >
                          <div style={{ 
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: spacing.md
                          }}>
                            <div style={{ 
                              fontWeight: typography.fontWeight.bold, 
                              color: colors.primary,
                              fontSize: typography.fontSize.base
                            }}>
                              {(c.user && (c.user.firstName || c.user.lastName)) ? `${c.user.firstName||''} ${c.user.lastName||''}`.trim() : (c.user?.email || 'User')}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                              <span style={{ 
                                color: colors.gray400, 
                                fontWeight: typography.fontWeight.normal, 
                                fontSize: typography.fontSize.sm 
                              }}>{new Date(c.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              {isOwnComment && (
                                <button
                                  onClick={() => handleDeleteComment(c._id)}
                                  style={{
                                    padding: `${spacing.xs} ${spacing.sm}`,
                                    background: 'transparent',
                                    color: colors.error,
                                    border: `1px solid ${colors.error}`,
                                    borderRadius: borderRadius.md,
                                    fontSize: typography.fontSize.xs,
                                    fontWeight: typography.fontWeight.semibold,
                                    cursor: 'pointer',
                                    transition: transitions.fast
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = colors.error;
                                    e.target.style.color = colors.white;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = 'transparent';
                                    e.target.style.color = colors.error;
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ 
                            color: colors.gray700,
                            fontSize: typography.fontSize.base,
                            lineHeight: typography.lineHeight.relaxed
                          }}>{c.content}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
