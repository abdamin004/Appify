import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerForEvent } from '../services/eventService';
import { showToast } from '../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../utils/designSystem';

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

  const isRegistered = !!(event && Array.isArray(event.registeredUsers) && currentUserId && event.registeredUsers.map(String).includes(String(currentUserId)));

  const handleViewDetails = (e) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const handleRegisterClick = async (e) => {
    e.stopPropagation();
    
    if (!isLoggedIn) {
      showToast.warning('Please log in to register for events');
      if (onClick) onClick();
      return;
    }

    if (isRegistered) {
      showToast.info('You are already registered for this event');
      return;
    }

    setRegistering(true);
    try {
      await registerForEvent(event._id);
      showToast.success('Successfully registered for the event!');
      if (onRegister) onRegister(event._id);
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
    <div className="event-card">
      {/* Image */}
      <div className="event-image" style={{ background: event.imageUrl ? `url(${event.imageUrl}) center/cover` : 'linear-gradient(135deg, #003366 0%, #001a33 100%)' }}>
        {!event.imageUrl && <span className="event-icon">{icons[event.type] || '📅'}</span>}
        {isArchived && <div className="archived-badge">ARCHIVED</div>}
        {event.status === 'cancelled' && <div className="cancelled-badge">CANCELLED</div>}
      </div>

      {/* Content */}
      <div className="event-content">
        <div className="event-header">
          <span className="type-badge" style={{ background: color.bg, color: color.text }}>{event.type === 'GymSession' ? 'Gym Session' : event.type}</span>
          {event.price > 0 && <span className="price">${event.price}</span>}
        </div>

        <h3 className="event-title">{event.title}</h3>
        <p className="event-description">{event.shortDescription || event.description || 'No description available'}</p>

        <div className="event-details">
          <div className="detail-row">
            <span>📅</span>
            <span>{formatDate(event.startDate)} • {formatTime(event.startDate)}</span>
          </div>
          <div className="detail-row">
            <span>📍</span>
            <span>{event.location}</span>
          </div>

          {event.capacity > 0 && (
            <div className="detail-row" style={{ color: isFull ? '#dc2626' : isAlmostFull ? '#d97706' : '#003366' }}>
              <span>👥</span>
              <span>{isFull ? 'Full' : isAlmostFull ? `Only ${spotsLeft} spots left!` : `${event.registeredCount || 0} / ${event.capacity} registered`}</span>
            </div>
          )}

          {false && (event.type === 'Bazaar' || event.type === 'Booth') && event.vendors?.length > 0 && (
            <div className="vendor-info">
              🏪 {event.vendors.length} Vendor{event.vendors.length > 1 ? 's' : ''} Participating
            </div>
          )}

          {(event.type === 'Bazaar' || event.type === 'Booth') && vendorCount > 0 && (
            <div className="vendor-info">
              Vendors Participating: {vendorCount}
              {Array.isArray(event.participants) && event.participants.length > 0 && (
                <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#6b7280' }}>
                  {(() => {
                    const names = (event.participants || [])
                      .map(p => (p && (p.organization || p.vendorCompany || p.vendorEmail)) || null)
                      .filter(Boolean);
                    const shown = names.slice(0, 3);
                    const extra = Math.max(0, names.length - shown.length);
                    return `${shown.join(', ')}${extra > 0 ? ` and ${extra} more` : ''}`;
                  })()}
                </div>
              )}
            </div>
          )}

          {event.registrationDeadline && new Date(event.registrationDeadline) > new Date() && (
            <div className="deadline-info">⏰ Register by {formatDate(event.registrationDeadline)}</div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTop: `1px solid ${colors.gray200}` }}>
          <div style={{ display: 'flex', gap: spacing.sm, flexDirection: 'column' }}>
            {/* Edit Button - Only for EventOffice (with time restrictions) and Professor (own workshops)
                Requirements: 
                - Req 32: Bazaars can only be edited if bazaar hasn't started yet
                - Req 34: Trips can only be edited if trip start date hasn't passed yet
                - Req 36: Professor can edit their own workshops
                - Req 48: Admin cannot edit events (only delete) */}
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
              
              // Check if event has started (for bazaars/trips)
              const eventStarted = isEventOfficeUser && event.startDate && new Date(event.startDate) <= new Date();
              const isRestrictedType = event.type === 'Bazaar' || event.type === 'Trip';
              
              if (canEditNow) {
                return (
                  <button
                    onClick={handleEdit}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: colors.warning,
                      color: colors.white,
                      border: 'none',
                      borderRadius: borderRadius.lg,
                      fontWeight: typography.fontWeight.semibold,
                      fontSize: typography.fontSize.sm,
                      cursor: 'pointer',
                      transition: transitions.fast,
                      boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing.xs,
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.3)';
                      e.target.style.background = '#d97706';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.2)';
                      e.target.style.background = colors.warning;
                    }}
                  >
                    <span>✏️</span> Edit Event
                  </button>
                );
              } else if (isEventOfficeUser && isRestrictedType && eventStarted) {
                // Show disabled button with message for started bazaars/trips
                return (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: spacing.md,
                      background: colors.gray400,
                      color: colors.white,
                      border: 'none',
                      borderRadius: borderRadius.xl,
                      fontWeight: typography.fontWeight.bold,
                      fontSize: typography.fontSize.sm,
                      cursor: 'not-allowed',
                      opacity: 0.6,
                    }}
                    title={event.type === 'Bazaar' 
                      ? 'Cannot edit bazaar after it has started' 
                      : 'Cannot edit trip after start date has passed'}
                  >
                    ⏰ Edit Not Available
                  </button>
                );
              }
              return null;
            })()}
            {/* View Details Button - Always visible */}
            <button
              onClick={handleViewDetails}
              style={{
                width: '100%',
                padding: `${spacing.sm} ${spacing.md}`,
                background: 'transparent',
                color: colors.primary,
                border: `1.5px solid ${colors.primary}`,
                borderRadius: borderRadius.lg,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
                transition: transitions.fast,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.primary;
                e.target.style.color = colors.white;
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = `0 4px 8px rgba(0, 51, 102, 0.2)`;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = colors.primary;
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              View Details
            </button>

            {/* Registration Button - Only show if event is available for registration and user is not EventOffice/Admin */}
            {/* Students/Staff/TA/Professor cannot register for Booths or Bazaars - only vendors can apply */}
            {!isEventOffice && event.type !== 'Booth' && event.type !== 'Bazaar' && event.status !== 'cancelled' && event.status !== 'completed' && 
             (!event.registrationDeadline || new Date(event.registrationDeadline) > new Date()) &&
             (!event.capacity || !isFull) && (
              <>
                {isRegistered ? (
                  <button
                    disabled
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: colors.success,
                      color: colors.white,
                      border: 'none',
                      borderRadius: borderRadius.lg,
                      fontWeight: typography.fontWeight.semibold,
                      fontSize: typography.fontSize.sm,
                      cursor: 'not-allowed',
                      opacity: 0.85,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing.xs,
                    }}
                  >
                    <span>✓</span> Registered
                  </button>
                ) : (
                  <button
                    onClick={handleRegisterClick}
                    disabled={registering}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      background: registering 
                        ? colors.gray400 
                        : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
                      color: colors.primary,
                      border: 'none',
                      borderRadius: borderRadius.lg,
                      fontWeight: typography.fontWeight.bold,
                      fontSize: typography.fontSize.sm,
                      cursor: registering ? 'not-allowed' : 'pointer',
                      transition: transitions.fast,
                      boxShadow: registering ? 'none' : '0 2px 8px rgba(212, 175, 55, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing.xs,
                    }}
                    onMouseEnter={(e) => {
                      if (!registering) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!registering) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(212, 175, 55, 0.3)';
                      }
                    }}
                  >
                    <span>{registering ? '⏳' : '✅'}</span>
                    {registering ? 'Registering...' : isLoggedIn ? 'Register Now' : 'Log in to Register'}
                  </button>
                )}
              </>
            )}
            {/* Delete Button - Only show for Admin/EventOffice users, if onDelete prop is provided, and no registrations */}
            {canDelete && onDelete && !hasRegistrations && (
              <button
                onClick={handleDeleteClick}
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: colors.error,
                  color: colors.white,
                  border: 'none',
                  borderRadius: borderRadius.lg,
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                  cursor: 'pointer',
                  transition: transitions.fast,
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.3)';
                  e.target.style.background = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                  e.target.style.background = colors.error;
                }}
              >
                <span>🗑️</span> Delete Event
              </button>
            )}
            {/* Archive Button - Only show if onArchive prop is provided, user is EventOffice, event has passed, and not already archived
                Requirement 47: Events Office can archive events that have already passed (applies to ALL kinds of events) */}
            {canArchiveEvent && onArchive && eventHasPassed && !isArchived && (
              <button
                onClick={handleArchiveClick}
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: colors.gray500,
                  color: colors.white,
                  border: 'none',
                  borderRadius: borderRadius.lg,
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                  cursor: 'pointer',
                  transition: transitions.fast,
                  boxShadow: '0 2px 4px rgba(107, 114, 128, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(107, 114, 128, 0.3)';
                  e.target.style.background = colors.gray600;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(107, 114, 128, 0.2)';
                  e.target.style.background = colors.gray500;
                }}
              >
                <span>📦</span> Archive Event
              </button>
            )}
            {/* Unarchive Button - Show when user is EventOffice, event is archived and onUnarchive prop is provided */}
            {canArchiveEvent && onUnarchive && isArchived && (
              <button
                onClick={handleUnarchiveClick}
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  background: colors.accent,
                  color: colors.primary,
                  border: 'none',
                  borderRadius: borderRadius.lg,
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                  cursor: 'pointer',
                  transition: transitions.fast,
                  boxShadow: '0 2px 4px rgba(212, 175, 55, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(212, 175, 55, 0.3)';
                  e.target.style.background = colors.accentDark;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(212, 175, 55, 0.2)';
                  e.target.style.background = colors.accent;
                }}
              >
                <span>📤</span> Unarchive Event
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .event-card {
          background: ${colors.white};
          border-radius: ${borderRadius['2xl']};
          box-shadow: ${shadows.md};
          overflow: hidden;
          transition: ${transitions.normal};
          height: 100%;
          display: flex;
          flex-direction: column;
          border: 2px solid transparent;
        }
        .event-card:hover {
          transform: translateY(-5px);
          box-shadow: ${shadows.xl};
          border: 2px solid rgba(212, 175, 55, 0.3);
        }
        .event-image {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .event-icon {
          font-size: 4rem;
        }
        .cancelled-badge {
          position: absolute;
          top: ${spacing.md};
          right: ${spacing.md};
          padding: ${spacing.xs} ${spacing.sm};
          background: ${colors.error};
          color: ${colors.white};
          border-radius: ${borderRadius.md};
          font-size: 0.75rem;
          font-weight: bold;
          z-index: 10;
        }
        .archived-badge {
          position: absolute;
          top: ${spacing.md};
          left: ${spacing.md};
          padding: ${spacing.xs} ${spacing.sm};
          background: ${colors.gray500};
          color: ${colors.white};
          border-radius: ${borderRadius.md};
          font-size: 0.75rem;
          font-weight: bold;
          z-index: 10;
        }
        .event-content {
          padding: ${spacing.xl};
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${spacing.md};
        }
        .type-badge {
          padding: ${spacing.xs} ${spacing.lg};
          border-radius: ${borderRadius.full};
          font-size: ${typography.fontSize.sm};
          font-weight: ${typography.fontWeight.semibold};
          border: 1px solid rgba(212, 175, 55, 0.2);
        }
        .price {
          font-size: ${typography.fontSize.lg};
          font-weight: ${typography.fontWeight.bold};
          color: ${colors.accent};
        }
        .event-title {
          font-size: ${typography.fontSize.xl};
          font-weight: ${typography.fontWeight.bold};
          color: ${colors.primary};
          margin-bottom: ${spacing.md};
          line-height: ${typography.lineHeight.tight};
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 2.6rem;
        }
        .event-description {
          font-size: ${typography.fontSize.sm};
          color: ${colors.gray500};
          margin-bottom: ${spacing.lg};
          line-height: ${typography.lineHeight.normal};
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .event-details {
          border-top: 2px solid rgba(212, 175, 55, 0.2);
          padding-top: ${spacing.lg};
          margin-top: auto;
        }
        .detail-row {
          display: flex;
          align-items: center;
          gap: ${spacing.sm};
          margin-bottom: ${spacing.md};
          font-size: ${typography.fontSize.sm};
          color: ${colors.primary};
          font-weight: ${typography.fontWeight.medium};
        }
        .vendor-info {
          margin-top: ${spacing.md};
          padding: ${spacing.md} ${spacing.md};
          background: rgba(212, 175, 55, 0.1);
          border-radius: ${borderRadius.md};
          border: 1px solid rgba(212, 175, 55, 0.3);
          font-size: ${typography.fontSize.xs};
          color: ${colors.accentDark};
          font-weight: ${typography.fontWeight.semibold};
        }
        .deadline-info {
          margin-top: ${spacing.md};
          padding: ${spacing.sm} ${spacing.md};
          background: rgba(212, 175, 55, 0.15);
          border-radius: ${borderRadius.md};
          font-size: ${typography.fontSize.xs};
          color: ${colors.primary};
          font-weight: ${typography.fontWeight.medium};
          border: 1px solid rgba(212, 175, 55, 0.25);
        }
      `}</style>
    </div>
  );
};

export default EventCard;
