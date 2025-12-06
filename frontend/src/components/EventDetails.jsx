import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { getEventById, getEventComments, getEventRatings, addEventComment, deleteEventComment, registerForEvent, rateEvent, deleteEvent, exportEventRegistrations } from '../services/eventService';
import { getAttendedIds, toggleAttended } from '../services/attendanceService';
import { showToast, confirmDialog } from '../utils/toast';
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
  const [exporting, setExporting] = useState(false);

  // Define these before useEffect to avoid initialization errors
  const tokenPresent = (() => {
    try { return !!(typeof localStorage !== 'undefined' && localStorage.getItem('token')); } catch { return false; }
  })();

  const currentUserId = (() => {
    try { const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null; const u = raw ? JSON.parse(raw) : null; return u && (u._id || u.id) ? String(u._id || u.id) : null; } catch { return null; }
  })();

  // Check if user can edit based on requirements:
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

  async function handleExportRegistrations() {
    if (!event) return;

    // Don't allow export for conferences
    if (event.type === 'Conference') {
      showToast.error('Cannot export registrations for Conference events');
      return;
    }

    try {
      setExporting(true);
      const eventId = event._id || event.id;
      await exportEventRegistrations(eventId);
      showToast.success('Registrations exported successfully');
    } catch (err) {
      showToast.error(err.message || 'Failed to export registrations');
    } finally {
      setExporting(false);
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
    } catch (_) { }
  }, [id, currentUserId, tokenPresent]);

  // Check if user is registered - handle both populated objects and IDs
  const isRegistered = (() => {
    if (!event || !currentUserId) return false;
    const registeredUsers = event.registeredUsers || [];
    if (!Array.isArray(registeredUsers)) return false;
    return registeredUsers.some(u => {
      // Handle both populated objects and plain IDs
      const userId = u?._id || u?.id || u;
      return String(userId) === String(currentUserId);
    });
  })();

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
      Workshop: 'from-indigo-500 to-purple-600',
      Trip: 'from-pink-400 to-rose-500',
      Bazaar: 'from-sky-400 to-cyan-500',
      Booth: 'from-emerald-400 to-teal-500',
      Conference: 'from-rose-400 to-amber-400'
    };
    return gradients[type] || 'from-slate-700 to-slate-900';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline btn-sm gap-2"
          >
            ← Back
          </button>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <div className="text-slate-500 text-lg">Loading event details…</div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-red-600 text-base border border-red-100">
            {error}
          </div>
        )}

        {!loading && !error && event && (
          <>
            {/* Event Header Card with Image */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
              {/* Event Image/Icon Header */}
              <div className={`h-72 flex items-center justify-center relative bg-gradient-to-br ${getEventGradient(event.type)}`}
                style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                {!event.imageUrl && (
                  <div className="text-9xl drop-shadow-lg transform scale-110">
                    {getEventIcon(event.type)}
                  </div>
                )}
                {event.status === 'cancelled' && (
                  <div className="absolute top-6 right-6 px-4 py-1 bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm">
                    CANCELLED
                  </div>
                )}
              </div>

              {/* Event Info Section */}
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6 flex-wrap">
                  <span className="px-4 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold border border-amber-200">
                    {event.type}
                  </span>
                  {event.price > 0 && (
                    <span className="text-xl font-bold text-amber-600">
                      {event.price} EGP
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                  <h1 className="m-0 text-slate-800 text-4xl font-bold leading-tight flex-1 min-w-[200px]">
                    {event.title}
                  </h1>

                  {/* Action Buttons - Edit, Delete, Archive, Register */}
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Edit Button */}
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
                            className="btn btn-warning btn-sm text-white gap-2"
                          >
                            ✏️ Edit
                          </button>
                        );
                      } else if (isEventOfficeUser && isRestrictedType && eventStarted) {
                        return (
                          <button
                            disabled
                            className="btn btn-disabled btn-sm gap-2"
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

                    {/* Delete Button */}
                    {canDelete && !hasRegistrations && (
                      <button
                        onClick={handleDeleteEvent}
                        className="btn btn-error btn-sm text-white gap-2"
                      >
                        🗑️ Delete
                      </button>
                    )}

                    {/* Archive/Unarchive Button */}
                    {canArchive && eventHasPassed && !isArchived && (
                      <button
                        onClick={handleArchiveEvent}
                        className="btn btn-neutral btn-sm text-white gap-2"
                      >
                        📦 Archive
                      </button>
                    )}

                    {/* Export Registrations Button */}
                    {isEventOffice && event && event.type !== 'Conference' && (
                      <button
                        onClick={handleExportRegistrations}
                        disabled={exporting}
                        className={`btn btn-success btn-sm text-white gap-2 ${exporting ? 'loading' : ''}`}
                      >
                        {exporting ? 'Exporting...' : '📊 Export Registrations'}
                      </button>
                    )}

                    {canArchive && isArchived && (
                      <button
                        onClick={handleUnarchiveEvent}
                        className="btn btn-accent btn-sm text-white gap-2"
                      >
                        📤 Unarchive
                      </button>
                    )}

                    {/* Register Button */}
                    {!isEventOffice && event.type !== 'Booth' && event.type !== 'Bazaar' && event.status !== 'cancelled' && event.status !== 'completed' &&
                      (!event.registrationDeadline || new Date(event.registrationDeadline) > new Date()) &&
                      (!event.capacity || (event.registeredUsers?.length || 0) < event.capacity) && (
                        <>
                          {isRegistered ? (
                            <button
                              disabled
                              className="btn btn-success btn-sm text-white gap-2 opacity-70"
                            >
                              ✓ Registered
                            </button>
                          ) : (
                            <button
                              onClick={handleRegister}
                              disabled={registering}
                              className={`btn btn-primary btn-sm text-white gap-2 ${registering ? 'loading' : ''}`}
                            >
                              {registering ? 'Registering...' : '✅ Register Now'}
                            </button>
                          )}
                        </>
                      )}
                  </div>
                </div>

                <p className="text-slate-600 text-lg leading-relaxed mb-8 whitespace-pre-wrap">
                  {event.description}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                      <span>📅</span> Date & Time
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Start</div>
                        <div className="text-slate-700 font-medium">
                          {event.startDate ? new Date(event.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBA'}
                          {event.startDate && ` at ${new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      </div>
                      {event.endDate && (
                        <div>
                          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">End</div>
                          <div className="text-slate-700 font-medium">
                            {new Date(event.endDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {` at ${new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h3 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                      <span>📍</span> Location & Capacity
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Venue</div>
                        <div className="text-slate-700 font-medium">{event.location || 'TBA'}</div>
                      </div>
                      {event.capacity > 0 && (
                        <div>
                          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Availability</div>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-200 rounded-full h-2.5 max-w-[150px]">
                              <div
                                className="bg-emerald-500 h-2.5 rounded-full"
                                style={{ width: `${Math.min(100, ((event.registeredUsers?.length || 0) / event.capacity) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-slate-700 font-medium text-sm">
                              {event.registeredUsers?.length || 0} / {event.capacity} registered
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {(event.speakers || event.agenda) && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Additional Information</h3>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                      {event.speakers && (
                        <div>
                          <span className="font-bold text-slate-700">Speakers:</span>
                          <span className="text-slate-600 ml-2">{event.speakers}</span>
                        </div>
                      )}
                      {event.agenda && (
                        <div>
                          <span className="font-bold text-slate-700">Agenda:</span>
                          <p className="text-slate-600 mt-1 whitespace-pre-wrap">{event.agenda}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ratings & Comments Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Ratings Column */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>⭐</span> Ratings
                  </h3>

                  <div className="text-center mb-8">
                    <div className="text-5xl font-bold text-slate-800 mb-2">{ratings.average.toFixed(1)}</div>
                    <div className="flex justify-center gap-1 mb-2 text-amber-400 text-xl">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar key={star} className={star <= Math.round(ratings.average) ? "text-amber-400" : "text-slate-200"} />
                      ))}
                    </div>
                    <div className="text-slate-500 text-sm">{ratings.count} reviews</div>
                  </div>

                  {/* Rating Histogram */}
                  <div className="space-y-2 mb-8">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = ratings.histogram?.[star] || 0;
                      const percent = ratings.count > 0 ? (count / ratings.count) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-slate-600 w-3">{star}</span>
                          <FaStar className="text-amber-400 w-3 h-3" />
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="text-slate-400 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* User Rating Input */}
                  {canRate ? (
                    <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-bold text-slate-700 mb-3 text-center">Rate this event</h4>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRating(star)}
                            onMouseEnter={() => setRatingHover(star)}
                            onMouseLeave={() => setRatingHover(0)}
                            disabled={submittingRating}
                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                          >
                            <FaStar
                              size={28}
                              className={`transition-colors ${star <= (ratingHover || userRating)
                                  ? "text-amber-400"
                                  : "text-slate-200"
                                }`}
                            />
                          </button>
                        ))}
                      </div>
                      {userRating > 0 && (
                        <p className="text-center text-emerald-600 text-sm mt-2 font-medium">
                          You rated this {userRating} stars
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 pt-6 text-center">
                      <p className="text-slate-400 text-sm italic">
                        {!tokenPresent
                          ? "Log in to rate"
                          : !isRegistered
                            ? "Register to rate"
                            : "Rating available after event ends"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments Column */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>💬</span> Comments ({comments.length})
                  </h3>

                  {/* Comments List */}
                  <div className="flex-1 space-y-4 mb-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {comments.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <div className="text-4xl mb-2">💭</div>
                        <p className="text-slate-500">No comments yet. Be the first to share your thoughts!</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment._id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                                {(comment.user?.firstName?.[0] || 'U')}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">
                                  {comment.user?.firstName} {comment.user?.lastName}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            {(currentUserId === (comment.user?._id || comment.user?.id) || isEventOffice) && (
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Delete comment"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          <p className="text-slate-600 text-sm pl-10">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Form */}
                  {tokenPresent && isRegistered ? (
                    <form onSubmit={submitComment} className="mt-auto pt-4 border-t border-slate-100">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Share your thoughts..."
                          className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                          disabled={submitting}
                        />
                        <button
                          type="submit"
                          disabled={submitting || !newComment.trim()}
                          className={`btn btn-primary px-6 ${submitting ? 'loading' : ''}`}
                        >
                          Post
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-auto pt-4 border-t border-slate-100 text-center bg-slate-50 rounded-lg py-3">
                      <p className="text-slate-500 text-sm">
                        {!tokenPresent ? "Log in to comment" : "Register for this event to join the discussion"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
