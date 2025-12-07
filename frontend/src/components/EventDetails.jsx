import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { getEventById, getEventComments, getEventRatings, addEventComment, deleteEventComment, registerForEvent, rateEvent, deleteEvent, exportEventRegistrations, getWorkshopResources } from '../services/eventService';
import { getAttendedIds, toggleAttended } from '../services/attendanceService';
import { useVendorRequest } from '../hooks/useVendorRequest.jsx';
import EventAnalytics from './Dashboards/EventAnalytics';
import FeedbackModal from './Modals/FeedbackModal';

import { showToast, confirmDialog } from '../utils/toast';
import { FaStar } from 'react-icons/fa';


// Per-user ratings storage key helper (syncs with MyEventsList)
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

const saveRatingLocally = (eventId, value) => {
  try {
    const key = ratingsStorageKeyForUser();
    const raw = localStorage.getItem(key);
    const current = raw ? JSON.parse(raw) : {};
    const next = { ...current, [eventId]: value };
    localStorage.setItem(key, JSON.stringify(next));
  } catch (_) {
    // no-op
  }
};

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
  const [registering, setRegistering] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [attended, setAttended] = useState(false);
  const [workshopResources, setWorkshopResources] = useState([]);
  const [ratingHover, setRatingHover] = useState(0);

  // Define these before useEffect to avoid initialization errors
  const tokenPresent = (() => {
    try { return !!(typeof localStorage !== 'undefined' && localStorage.getItem('token')); } catch { return false; }
  })();

  const currentUserId = (() => {
    try { const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null; const u = raw ? JSON.parse(raw) : null; return u && (u._id || u.id) ? String(u._id || u.id) : null; } catch { return null; }
  })();

  const isRegistered = event?.registeredUsers?.some(u => String(u._id || u) === currentUserId);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [evt, comms, rates] = await Promise.all([
          getEventById(id),
          getEventComments(id),
          getEventRatings(id) // Now returns structured object
        ]);
        setEvent(evt);
        setComments(Array.isArray(comms) ? comms : []);
        setRatings(rates && typeof rates === 'object' ? rates : { average: 0, count: 0, ratings: [], histogram: {} });

        // Check if user has rated
        if (currentUserId && rates.ratings) {
          const myRating = rates.ratings.find(r => String(r.user?._id || r.user) === currentUserId);
          if (myRating) setUserRating(myRating.rating || myRating.ratings?.overall || 0);
        }
      } catch (err) {
        setError(err.message || 'Failed to load event');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id, currentUserId]);

  // Helper to get raw role string
  const getUserRole = () => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return '';
      const u = JSON.parse(raw);
      return (u.role || '').toLowerCase();
    } catch { return ''; }
  };

  const userRole = getUserRole();
  const isEventOffice = userRole === 'eventoffice' || userRole === 'admin';

  // Specific permission: Archive is ONLY for Event Office (not Admin)
  const canArchive = userRole === 'eventoffice';
  const canDelete = isEventOffice;

  const canEdit = (() => {
    try {
      if (!event) return false;
      const now = new Date();

      if (userRole === 'eventoffice') {
        if (event.type === 'Workshop') return false;
        if (event.type === 'Bazaar' && event.startDate && new Date(event.startDate) <= now) return false;
        if (event.type === 'Trip' && event.startDate && new Date(event.startDate) <= now) return false;
        return true;
      }
      if (userRole === 'professor' && event.type === 'Workshop') {
        const eventCreatorId = String(event.createdBy || event.createdByUser || event.professor || '');
        return eventCreatorId && currentUserId && eventCreatorId === currentUserId;
      }
      return false;
    } catch { return false; }
  })();

  const hasRegistrations = (event?.registeredCount || (event?.registeredUsers && event.registeredUsers.length) || 0) > 0;
  const eventHasPassed = event && ((event.endDate && new Date(event.endDate) <= new Date()) || (!event.endDate && event.startDate && new Date(event.startDate) <= new Date()));

  const isArchived = event?.status === 'completed' || (typeof window !== 'undefined' && (() => {
    try {
      const stored = localStorage.getItem('archivedEvents');
      const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
      return archivedSet.has(event?._id || event?.id);
    } catch { return false; }
  })());

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

  // Handlers
  const handleEdit = () => {
    const route = getEditRoute();
    if (route) navigate(route);
    else showToast.warning('Edit not available for this event type');
  };

  async function handleDeleteEvent() {
    if (!event) return;
    const confirmed = await confirmDialog('Delete this event? This cannot be undone.', 'Delete Event');
    if (!confirmed) return;
    try {
      await deleteEvent(event._id || event.id);
      showToast.success('Event deleted successfully');
      navigate(-1);
    } catch (err) {
      showToast.error(err.message || 'Failed to delete event');
    }
  }

  async function handleArchiveEvent() {
    const confirmed = await confirmDialog('Archive this event? It will be hidden.', 'Archive Event');
    if (!confirmed) return;
    try {
      const stored = localStorage.getItem('archivedEvents');
      const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
      archivedSet.add(event._id || event.id);
      localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
      showToast.success('Event archived successfully!');
      window.location.reload();
    } catch (err) {
      showToast.error('Failed to archive event');
    }
  }

  async function handleUnarchiveEvent() {
    // ... logic for unarchive ...
    try {
      const stored = localStorage.getItem('archivedEvents');
      if (!stored) return;
      const archivedSet = new Set(JSON.parse(stored));
      archivedSet.delete(event._id || event.id);
      localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
      showToast.success('Event unarchived!');
      window.location.reload();
    } catch (err) { showToast.error('Failed'); }
  }

  async function handleExportRegistrations() {
    if (!event) return;
    if (event.type === 'Conference') {
      showToast.error('Cannot export registrations for Conference events');
      return;
    }
    try {
      setExporting(true);
      await exportEventRegistrations(event._id || event.id);
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
        const e = await getEventById(id);
        setEvent(e);

        if (tokenPresent) {
          try {
            const [cs, rs] = await Promise.all([
              getEventComments(id),
              getEventRatings(id)
            ]);
            setComments(Array.isArray(cs) ? cs : []);
            setRatings(rs && typeof rs === 'object' ? rs : { average: 0, count: 0, ratings: [], histogram: {} });

            if (rs && Array.isArray(rs.ratings) && currentUserId) {
              const userRatingObj = rs.ratings.find(r => String(r.user?._id || r.user?.id || r.user) === String(currentUserId));
              if (userRatingObj) {
                setUserRating(userRatingObj.rating || 0);
              }
            }
          } catch (err) {
            console.warn('Failed to load comments/ratings:', err);
            setComments([]);
            setRatings({ average: 0, count: 0, ratings: [], histogram: {} });
          }
        } else {
          setComments([]);
          setRatings({ average: 0, count: 0, ratings: [], histogram: {} });
        }
      } catch (err) {
        setError(err?.message || 'Failed to load event');
      } finally { setLoading(false); }
    }
    load();
  }, [id, currentUserId, tokenPresent]);

  // Separate effect for local attendance state to ensure it runs reliably
  useEffect(() => {
    try {
      const ids = getAttendedIds().map(String);
      setAttended(ids.includes(String(id)));
    } catch (_) {
      setAttended(false);
    }
  }, [id, currentUserId]); // Re-run if user or event changes

  // Fetch workshop resources if attended OR registered (backend allows both)
  useEffect(() => {
    // Calculate isRegistered here or use the variable if available in scope (it's defined below, so we need to be careful with closure or order)
    // We can rely on 'event' which is a dependency.
    const userIsRegistered = event?.registeredUsers?.some(u =>
      String(u._id || u.id || u) === String(currentUserId)
    );

    if (event?.type === 'Workshop' && (attended || userIsRegistered)) {
      getWorkshopResources(id)
        .then(res => {
          const resources = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
          setWorkshopResources(resources);
        })
        .catch(err => console.error('Failed to load workshop resources', err));
    }
  }, [event, attended, id, currentUserId]);



  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [accommodationForm, setAccommodationForm] = useState({
    needsWheelchairAccess: false,
    needsSpecialSeating: false,
    otherRequests: ''
  });

  // Vendor Request Hook
  const { canRequest: canVendorRequest, requestStatus, openRequestModal: openVendorModal, RequestModal: VendorRequestModal } = useVendorRequest(event);

  async function handleRegister() {
    if (!tokenPresent) {
      showToast.warning('Please log in to register');
      // navigate('/login'); // Optional
      return;
    }

    if (isRegistered) {
      showToast.info('You are already registered for this event');
      return;
    }

    // specific roles check? backend handles it, but we can just show modal
    setShowAccommodationModal(true);
  }

  async function confirmRegistration() {
    setRegistering(true);
    try {
      if (isRegistered) {
        // User is already registered, so this is an update to accommodations
        // Dynamic import or assume it's imported (need to check imports)
        const { requestDisabilityAccommodation } = await import('../services/eventService');
        await requestDisabilityAccommodation(id, accommodationForm);
        showToast.success('Accommodation request updated successfully!');
      } else {
        // New registration
        await registerForEvent(id, accommodationForm);
        showToast.success('Successfully registered for the event!');
      }
      setShowAccommodationModal(false);
      // Reload event data to update registration status
      const updatedEvent = await getEventById(id);
      setEvent(updatedEvent);
    } catch (err) {
      showToast.error(err.message || 'Failed to submit request');
    } finally {
      setRegistering(false);
    }
  }

  async function submitComment(e) {
    e && e.preventDefault();
    if (!newComment.trim()) { showToast.warning('Enter comment'); return; }
    setSubmitting(true);
    try {
      await addEventComment(id, newComment.trim());
      setNewComment('');
      const cs = await getEventComments(id);
      setComments(Array.isArray(cs) ? cs : []);
      showToast.success('Comment added');
      // Dispatch for Analytics
      setTimeout(() => window.dispatchEvent(new CustomEvent('comment:added', { detail: { eventId: String(id) } })), 500);
    } catch (err) { showToast.error(err.message); }
    finally { setSubmitting(false); }
  }

  async function handleDeleteComment(cid) {
    if (!await confirmDialog('Delete comment?')) return;
    try {
      await deleteEventComment(cid);
      setComments(prev => prev.filter(c => c._id !== cid));
      showToast.success('Deleted');
    } catch (err) { showToast.error(err.message); }
  }

  const canRate = tokenPresent && isRegistered && (!event?.endDate || new Date(event.endDate) <= new Date());

  async function handleRating(score) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await rateEvent(id, score);
      setUserRating(score);

      // Update local storage to keep MyEventsList in sync
      saveRatingLocally(id, score);

      const newRatings = await getEventRatings(id);
      setRatings(newRatings && typeof newRatings === 'object' ? newRatings : { average: 0, count: 0, ratings: [], histogram: {} });
      showToast.success('Rating submitted successfully');
      setTimeout(() => window.dispatchEvent(new CustomEvent('rating:added', { detail: { eventId: String(id) } })), 500);
    } catch (err) {
      showToast.error(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  }

  // Helpers
  const getEventIcon = (type) => ({ Workshop: '🎓', Trip: '✈️', Bazaar: '🛍️', Booth: '🏢', Conference: '🎙️' }[type] || '📅');
  const getEventGradient = (type) => ({
    Workshop: 'from-indigo-500 to-purple-600',
    Trip: 'from-pink-400 to-rose-500',
    Bazaar: 'from-sky-400 to-cyan-500',
    Booth: 'from-emerald-400 to-teal-500',
    Conference: 'from-rose-400 to-amber-400'
  }[type] || 'from-slate-700 to-slate-900');

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-24 px-6 pb-12 max-w-7xl mx-auto">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="btn btn-outline btn-sm gap-2">← Back</button>
        </div>

        {loading && <div className="text-center py-12"><span className="loading loading-spinner loading-lg text-primary"></span></div>}
        {error && <div className="text-red-600 bg-white p-6 rounded-xl shadow">{error}</div>}

        {!loading && !error && event && (
          <>
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
              <div className={`h-72 flex items-center justify-center relative bg-gradient-to-br ${getEventGradient(event.type)}`}
                style={event.imageUrl ? { backgroundImage: `url(${event.imageUrl})`, backgroundSize: 'cover' } : {}}>
                {!event.imageUrl && <div className="text-9xl drop-shadow-lg scale-110">{getEventIcon(event.type)}</div>}
                {event.status === 'cancelled' && <div className="absolute top-6 right-6 px-4 py-1 bg-red-600 text-white rounded-lg font-bold">CANCELLED</div>}
              </div>

              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <span className="px-4 py-1 bg-amber-50 text-amber-700 rounded-full font-semibold border border-amber-200">{event.type}</span>
                  {event.price > 0 && <span className="text-xl font-bold text-amber-600">{event.price} EGP</span>}
                </div>

                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                  <h1 className="text-4xl font-bold text-slate-800">{event.title}</h1>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap items-center">
                    {canEdit && getEditRoute() && (
                      <button onClick={handleEdit} className="btn btn-warning btn-sm text-white gap-2">✏️ Edit</button>
                    )}
                    {isEventOffice && event.type !== 'Workshop' && (
                      // Extra check for time restrictions if needed, but simplified here
                      null
                    )}

                    {/* Analytics Button removed for all users */ /*
                    {isEventOffice && (
                      <div className="tooltip" data-tip="View detailed feedback statistics">
                        <button onClick={() => setShowAnalytics(true)} className="btn btn-info btn-sm text-white gap-2">📊 Analytics</button>
                      </div>
                    )}
                    */}

                    {canDelete && !hasRegistrations && (
                      <button onClick={handleDeleteEvent} className="btn btn-error btn-sm text-white gap-2">🗑️ Delete</button>
                    )}
                    {canArchive && eventHasPassed && !isArchived && (
                      <button onClick={handleArchiveEvent} className="btn btn-neutral btn-sm text-white gap-2">📦 Archive</button>
                    )}
                    {canArchive && isArchived && (
                      <button onClick={handleUnarchiveEvent} className="btn btn-accent btn-sm text-white gap-2">📤 Unarchive</button>
                    )}
                    {(isEventOffice || (event && String(event.createdBy?._id || event.createdBy) === String(currentUserId))) && event.type !== 'Conference' && (
                      <button onClick={handleExportRegistrations} disabled={exporting} className={`btn btn-success btn-sm text-white gap-2 ${exporting ? 'loading' : ''}`}>
                        {exporting ? 'Exporting...' : '📊 Export Registrations'}
                      </button>
                    )}

                    {/* Vendor Button / Status */}
                    {requestStatus ? (
                      <button disabled className={`btn btn-sm text-white gap-2 cursor-default ${requestStatus === 'approved' ? 'btn-success' : requestStatus === 'rejected' ? 'btn-error' : 'btn-warning'}`}>
                        {requestStatus === 'approved' ? '✓ Application Approved' : requestStatus === 'rejected' ? '✕ Application Rejected' : '⏳ Application Pending'}
                      </button>
                    ) : canVendorRequest && (
                      <button onClick={openVendorModal} className="btn btn-primary btn-sm text-white gap-2">
                        📝 Request Spot
                      </button>
                    )}

                    {/* Registration */}
                    {!isEventOffice && userRole !== 'vendor' && event.type !== 'Booth' && event.type !== 'Bazaar' && event.status !== 'cancelled' && event.status !== 'completed' &&
                      (!event.registrationDeadline || new Date(event.registrationDeadline) > new Date()) &&
                      (!event.capacity || (event.registeredUsers?.length || 0) < event.capacity) && (
                        <>
                          {isRegistered ? (
                            <>
                              <button
                                disabled
                                className="btn btn-success btn-sm text-white gap-2 opacity-70"
                              >
                                ✓ Registered
                              </button>

                              {/* Mark Attended Button - Only if started */}
                              {(event.startDate && new Date(event.startDate) <= new Date()) && (
                                <button
                                  onClick={toggleAttendedHere}
                                  className={`btn btn-sm gap-2 ${attended
                                    ? 'btn-accent text-white'
                                    : 'btn-outline btn-accent'}`}
                                >
                                  {attended ? '✓ Attended' : '👁 Mark Attended'}
                                </button>
                              )}

                              <button
                                onClick={() => setShowAccommodationModal(true)}
                                className="btn btn-outline btn-sm text-primary gap-2 hover:bg-primary hover:text-white"
                              >
                                ♿ Accommodations
                              </button>
                            </>
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

                <p className="text-slate-600 text-lg mb-8 whitespace-pre-wrap">{event.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4">📅 Date & Time</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Start</div>
                        <div className="text-slate-700 font-medium">
                          {event.startDate ? new Date(event.startDate).toLocaleString() : 'TBA'}
                        </div>
                      </div>
                      {event.endDate && (
                        <div>
                          <div className="text-xs text-slate-500 font-bold uppercase">End</div>
                          <div className="text-slate-700 font-medium">{new Date(event.endDate).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4">📍 Location & Capacity</h3>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-slate-500 font-bold uppercase">Venue</div>
                        <div className="text-slate-700 font-medium">{event.location || 'TBA'}</div>
                      </div>
                      {event.capacity > 0 && (
                        <div>
                          <div className="text-xs text-slate-500 font-bold uppercase">Availability</div>
                          <div className="flex items-center gap-2 mt-1">
                            <progress className="progress progress-emerald w-full" value={event.registeredUsers?.length || 0} max={event.capacity}></progress>
                            <span className="text-sm font-medium">{event.registeredUsers?.length || 0} / {event.capacity}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(event.speakers || event.agenda) && (
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-6 space-y-4">
                    <h3 className="font-bold text-slate-800 text-lg">Additional Info</h3>
                    {event.speakers && <div><span className="font-bold">Speakers:</span> {event.speakers}</div>}
                    {event.agenda && <div><span className="font-bold">Agenda:</span> <p className="whitespace-pre-wrap mt-1">{event.agenda}</p></div>}
                  </div>
                )}

                {/* Workshop Resources (Only for Attendees or Registered Users) */}
                {event.type === 'Workshop' && (attended || isRegistered) && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span>📚</span> Workshop Resources
                    </h3>
                    {workshopResources.length > 0 ? (
                      <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                        <p className="text-emerald-800 mb-4 font-medium">
                          Since you attended this workshop, you have access to the following resources:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {workshopResources.map((res, idx) => (
                            <a
                              key={idx}
                              href={res.url && res.url.startsWith('http') ? res.url : `http://localhost:5001${res.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-emerald-200 hover:shadow-md hover:border-emerald-300 transition-all group"
                            >
                              <div className="text-2xl group-hover:scale-110 transition-transform">📄</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 truncate group-hover:text-emerald-700">{res.name}</div>
                                <div className="text-xs text-slate-500">Click to download</div>
                              </div>
                              <div className="text-emerald-500">⬇️</div>
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 text-center">
                        <div className="text-4xl mb-3">📂</div>
                        <h4 className="text-slate-700 font-bold mb-1">No Resources Available</h4>
                        <p className="text-slate-500 text-sm">The professor hasn't uploaded any resources for this workshop yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Ratings & Comments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Ratings */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">⭐ Ratings</h3>
                  <div className="text-center mb-8">
                    <div className="text-5xl font-bold text-slate-800 mb-2">{ratings.average?.toFixed(1) || '0.0'}</div>
                    <div className="flex justify-center gap-1 text-amber-400 text-xl mb-2">
                      {[1, 2, 3, 4, 5].map(s => <FaStar key={s} className={s <= Math.round(ratings.average || 0) ? '' : 'text-slate-200'} />)}
                    </div>
                    <div className="text-slate-500 text-sm">{ratings.count} reviews</div>
                  </div>

                  {/* Histogram */}
                  <div className="space-y-2 mb-8">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratings.histogram?.[star] || 0;
                      const pct = ratings.count ? (count / ratings.count) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="font-bold w-3">{star}</span>
                          <FaStar className="text-amber-400 w-3 h-3" />
                          <progress className="progress progress-warning w-full" value={pct} max="100"></progress>
                          <span className="text-slate-400 w-6 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Rate Button */}
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
                            disabled={submitting}
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
                    <div className="text-center italic text-slate-400 text-sm mt-4 border-t pt-4">
                      {!tokenPresent ? "Log in to rate" : !isRegistered ? "Register to rate" : "Rating available after event"}
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">💬 Comments ({comments.length})</h3>

                  <div className="flex-1 space-y-4 mb-6 max-h-[500px] overflow-y-auto pr-2">
                    {comments.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">No comments yet.</div>
                    ) : (
                      comments.map(c => (
                        <div key={c._id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative group">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-slate-800 text-sm">{c.user?.firstName} {c.user?.lastName}</div>
                            <div className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</div>
                          </div>
                          <p className="text-slate-600 text-sm">{c.content}</p>
                          {(isEventOffice || String(c.user?._id || c.user?.id) === currentUserId) && (
                            <button onClick={() => handleDeleteComment(c._id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500">🗑️</button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Accommodation Modal */}
                  {showAccommodationModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Registration Details</h3>
                        <p className="text-slate-600 mb-4">Do you require any disability accommodations for this event?</p>

                        <div className="space-y-4 mb-6">
                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary"
                              checked={accommodationForm.needsWheelchairAccess}
                              onChange={e => setAccommodationForm({ ...accommodationForm, needsWheelchairAccess: e.target.checked })}
                            />
                            <span className="font-medium text-slate-700">Wheelchair Access</span>
                          </label>

                          <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary"
                              checked={accommodationForm.needsSpecialSeating}
                              onChange={e => setAccommodationForm({ ...accommodationForm, needsSpecialSeating: e.target.checked })}
                            />
                            <span className="font-medium text-slate-700">Special Seating</span>
                          </label>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Other Requests (Optional)</label>
                            <textarea
                              className="textarea textarea-bordered w-full text-slate-900"
                              placeholder="Any other specific needs..."
                              value={accommodationForm.otherRequests}
                              onChange={e => setAccommodationForm({ ...accommodationForm, otherRequests: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                          <button
                            className="btn btn-ghost"
                            onClick={() => setShowAccommodationModal(false)}
                            disabled={registering}
                          >
                            Cancel
                          </button>
                          <button
                            className={`btn btn-primary text-white ${registering ? 'loading' : ''}`}
                            onClick={confirmRegistration}
                            disabled={registering}
                          >
                            {registering ? 'Registering...' : 'Confirm Registration'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {tokenPresent && isRegistered && (
                    <form onSubmit={submitComment} className="mt-auto pt-4 border-t border-slate-100 flex gap-3">
                      <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Share your thoughts..."
                        className="input input-bordered w-full bg-white text-slate-900 placeholder-slate-400"
                        disabled={submitting}
                      />
                      <button type="submit" disabled={submitting || !newComment.trim()} className="btn btn-primary">Post</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Vendor Request Modal */}
        {VendorRequestModal}

        {showAnalytics && <EventAnalytics eventId={id} isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} />}
        {showFeedback && <FeedbackModal eventId={id} isOpen={showFeedback} onClose={() => setShowFeedback(false)} onSuccess={(v) => {
          setUserRating(v);
          getEventRatings(id).then(r => setRatings(r));
          showToast.success('Feedback submitted');
          setTimeout(() => window.dispatchEvent(new CustomEvent('rating:added', { detail: { eventId: String(id) } })), 500);
        }} />}

      </div>
    </div>
  );
}
