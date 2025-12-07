import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerForEvent } from '../services/eventService';
import { showToast } from '../utils/toast';
import { checkEventOverlap } from '../utils/overlapDetection';
import { showOverlapWarning } from './UI/OverlapWarningDialog';


const EventCard = ({ event, onClick, onDelete, onRegister, onArchive, onUnarchive, hasEventPassed }) => {
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);

  // Check if user is logged in
  const isLoggedIn = (() => {
    try {
      return !!(typeof localStorage !== 'undefined' && localStorage.getItem('token'));
    } catch {
      return false;
    }
  })();

  // Check if user is already registered
  const currentUserId = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      const u = raw ? JSON.parse(raw) : null;
      return u && (u._id || u.id) ? String(u._id || u.id) : null;
    } catch {
      return null;
    }
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
      if (!raw) return false;
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

  // Check if user is EventOffice (can archive/unarchive)
  const canArchiveEvent = (() => {
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

  // Check if user is Admin (for edit permissions)
  const isAdmin = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      return role === 'admin';
    } catch {
      return false;
    }
  })();

  // Check if user is Professor (can edit their own workshops)
  const isProfessor = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      return role === 'professor';
    } catch {
      return false;
    }
  })();

  // Get edit route based on event type
  const getEditRoute = () => {
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

  const handleEdit = (e) => {
    e.stopPropagation();
    const route = getEditRoute();
    if (route) {
      navigate(route);
    } else {
      showToast.warning('Edit not available for this event type');
    }
  };

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

  const handleViewDetails = (e) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const handleRegisterClick = async (e) => {
    e.stopPropagation();

    const eventId = event?._id || event?.id;
    if (!eventId) {
      showToast.error('Unable to determine event id for registration.');
      return;
    }

    if (!isLoggedIn) {
      showToast.warning('Please log in to register for events');
      if (onClick) onClick();
      return;
    }

    if (isRegistered) {
      showToast.info('You are already registered for this event');
      return;
    }

    // Check for time overlaps with existing registrations
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const res = await fetch(`${API_BASE}/events/registered`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (res.ok) {
        const registeredEvents = await res.json();
        const events = Array.isArray(registeredEvents) ? registeredEvents : [];
        const conflicts = checkEventOverlap(event, events);
        
        if (conflicts.length > 0) {
          const proceed = await showOverlapWarning(conflicts, event.title || 'Event', event.startDate);
          if (!proceed) {
            return; // User cancelled
          }
        }
      }
    } catch (err) {
      console.error('Error checking for overlaps:', err);
      // Continue with registration even if overlap check fails
    }

    setRegistering(true);
    try {
      await registerForEvent(eventId);
      showToast.success('Successfully registered for the event!');
      if (onRegister) onRegister(eventId);
    } catch (err) {
      showToast.error(err.message || 'Failed to register for event');
    } finally {
      setRegistering(false);
    }
  };
  const icons = { Workshop: '🛠️', Trip: '🚌', Bazaar: '🏪', Booth: '🎪', Conference: '🎤', GymSession: '💪' };
  const typeColors = {
    Workshop: { bg: 'rgba(212, 175, 55, 0.15)', text: '#003366' },
    Trip: { bg: 'rgba(0, 51, 102, 0.1)', text: '#003366' },
    Bazaar: { bg: 'rgba(212, 175, 55, 0.2)', text: '#003366' },
    Booth: { bg: 'rgba(0, 51, 102, 0.15)', text: '#003366' },
    Conference: { bg: 'rgba(212, 175, 55, 0.15)', text: '#003366' },
    GymSession: { bg: 'rgba(212, 175, 55, 0.15)', text: '#003366' }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const color = typeColors[event.type] || { bg: 'rgba(212, 175, 55, 0.1)', text: '#003366' };
  const spotsLeft = event.capacity - (event.registeredCount || 0);
  const isAlmostFull = spotsLeft <= 10 && spotsLeft > 0;
  const isFull = event.capacity > 0 && spotsLeft <= 0;

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(event._id);
  };

  const handleArchiveClick = (e) => {
    e.stopPropagation();
    if (onArchive) onArchive(event._id, event);
  };

  const handleUnarchiveClick = (e) => {
    e.stopPropagation();
    if (onUnarchive) onUnarchive(event._id, event);
  };

  const eventHasPassed = hasEventPassed ? hasEventPassed(event) : false;
  // Check if archived (backend status or frontend localStorage)
  const isArchived = event.status === 'completed' || (typeof window !== 'undefined' && (() => {
    try {
      const stored = localStorage.getItem('archivedEvents');
      const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
      return archivedSet.has(event._id || event.id);
    } catch {
      return false;
    }
  })());

  const hasRegistrations = (event.registeredCount || (event.registeredUsers && event.registeredUsers.length) || 0) > 0;

  // Check if user can delete (Admin or EventOffice only)
  const canDelete = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return false;
      const u = JSON.parse(raw);
      const role = (u.role || '').toLowerCase();
      return role === 'admin' || role === 'eventoffice';
    } catch {
      return false;
    }
  })();
  const vendorCount = typeof event.participantsCount === 'number'
    ? event.participantsCount
    : (Array.isArray(event.vendors) ? event.vendors.length : 0);

  return (
    <div
      className="group bg-white rounded-2xl shadow-md overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col h-full border border-transparent hover:border-emerald-500/30 cursor-pointer"
      onClick={handleViewDetails}
    >
      {/* Image */}
      <div
        className="h-48 relative bg-slate-900 flex items-center justify-center overflow-hidden"
        style={{ background: event.imageUrl ? `url(${event.imageUrl}) center/cover` : undefined }}
      >
        {!event.imageUrl && (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <span className="text-6xl">{icons[event.type] || '📅'}</span>
          </div>
        )}
        {isArchived && (
          <div className="absolute top-4 left-4 px-2 py-1 bg-slate-600 text-white rounded-md text-xs font-bold z-10 shadow-sm">
            ARCHIVED
          </div>
        )}
        {event.status === 'cancelled' && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-red-600 text-white rounded-md text-xs font-bold z-10 shadow-sm">
            CANCELLED
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${event.type === 'Workshop' ? 'bg-amber-50 text-amber-800 border-amber-200' :
            event.type === 'Trip' ? 'bg-blue-50 text-blue-800 border-blue-200' :
              event.type === 'Bazaar' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                event.type === 'Booth' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                  'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
            {event.type === 'GymSession' ? 'Gym Session' : event.type}
          </span>
          {event.price > 0 && (
            <span className="text-lg font-bold text-emerald-600">{event.price} EGP</span>
          )}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 min-h-[3.5rem]">
          {event.title}
        </h3>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">
          {event.shortDescription || event.description || 'No description available'}
        </p>

        <div className="border-t border-slate-100 pt-4 mt-auto space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <span>📅</span>
            <span>{formatDate(event.startDate)} • {formatTime(event.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <span>📍</span>
            <span>{event.location}</span>
          </div>

          {event.capacity > 0 && (
            <div className={`flex items-center gap-2 text-sm font-medium ${isFull ? 'text-red-600' : isAlmostFull ? 'text-amber-600' : 'text-emerald-600'
              }`}>
              <span>👥</span>
              <span>{isFull ? 'Full' : isAlmostFull ? `Only ${spotsLeft} spots left!` : `${event.registeredCount || 0} / ${event.capacity} registered`}</span>
            </div>
          )}

          {(event.type === 'Bazaar' || event.type === 'Booth') && vendorCount > 0 && (
            <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 font-medium">
              🏪 {vendorCount} Vendor{vendorCount !== 1 ? 's' : ''} Participating
            </div>
          )}

          {event.registrationDeadline && new Date(event.registrationDeadline) > new Date() && (
            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-800 font-medium">
              ⏰ Register by {formatDate(event.registrationDeadline)}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
          {/* Edit Button */}
          {(() => {
            const canEditNow = canEdit && getEditRoute();
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

            const eventStarted = isEventOfficeUser && event.startDate && new Date(event.startDate) <= new Date();
            const isRestrictedType = event.type === 'Bazaar' || event.type === 'Trip';

            if (canEditNow) {
              return (
                <button
                  onClick={handleEdit}
                  className="w-full py-2 px-4 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <span>✏️</span> Edit Event
                </button>
              );
            } else if (isEventOfficeUser && isRestrictedType && eventStarted) {
              return (
                <button
                  disabled
                  className="w-full py-2 px-4 bg-slate-300 text-white rounded-lg font-bold text-sm cursor-not-allowed opacity-60 flex items-center justify-center gap-2"
                  title={event.type === 'Bazaar' ? 'Cannot edit bazaar after start' : 'Cannot edit trip after start'}
                >
                  ⏰ Edit Not Available
                </button>
              );
            }
            return null;
          })()}

          {/* View Details Button */}
          <button
            onClick={handleViewDetails}
            className="w-full py-2 px-4 bg-white text-emerald-600 border border-emerald-600 rounded-lg font-semibold text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          >
            View Details
          </button>

          {/* Registration Button */}
          {!isEventOffice && event.type !== 'Booth' && event.type !== 'Bazaar' && event.status !== 'cancelled' && event.status !== 'completed' &&
            (!event.registrationDeadline || new Date(event.registrationDeadline) > new Date()) &&
            (!event.capacity || !isFull) && (
              <>
                {isRegistered ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-emerald-500 text-white rounded-lg font-semibold text-sm cursor-not-allowed opacity-90 flex items-center justify-center gap-2"
                  >
                    <span>✓</span> Registered
                  </button>
                ) : (
                  <button
                    onClick={handleRegisterClick}
                    disabled={registering}
                    className={`w-full py-2 px-4 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 ${registering
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-700 hover:to-teal-600'
                      }`}
                  >
                    <span>{registering ? '⏳' : '✅'}</span>
                    {registering ? 'Registering...' : isLoggedIn ? 'Register Now' : 'Log in to Register'}
                  </button>
                )}
              </>
            )}

          {/* Delete Button */}
          {canDelete && onDelete && !hasRegistrations && (
            <button
              onClick={handleDeleteClick}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>🗑️</span> Delete Event
            </button>
          )}

          {/* Archive/Unarchive Buttons */}
          {canArchiveEvent && onArchive && eventHasPassed && !isArchived && (
            <button
              onClick={handleArchiveClick}
              className="w-full py-2 px-4 bg-slate-500 text-white rounded-lg font-semibold text-sm hover:bg-slate-600 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>📦</span> Archive Event
            </button>
          )}
          {canArchiveEvent && onUnarchive && isArchived && (
            <button
              onClick={handleUnarchiveClick}
              className="w-full py-2 px-4 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>📤</span> Unarchive Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
