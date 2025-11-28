import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import EventCard from "./EventCard";
import Navbar from "./Navbar";
import { API_BASE } from "../services/eventService";
import { deleteEvent, getApprovedWorkshops } from '../services/eventService';
import { FaHeart } from 'react-icons/fa';
import favourites from "../services/favoritesService";
import { canUserAccessEvent } from "../services/eventRestrictionService";
import { showToast, confirmDialog } from '../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, inputStyles, buttonStyles } from "../utils/designSystem";

function EventsList({ filterByTypes = null, presetType = null, showQuickNav = false, enableFavorites = false, onDelete = null, onArchive = null, onUnarchive = null, headerAction = null, showArchivedOnly = false, hideArchived = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [archivedEventsSet, setArchivedEventsSet] = useState(() => {
    try {
      const stored = localStorage.getItem('archivedEvents');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Only show back button when on the /events route, not when embedded in dashboards
  const showBackButton = location.pathname === '/events';

  // Get role-based event types if filterByTypes is not provided
  const getRoleBasedEventTypes = () => {
    if (filterByTypes !== null) return filterByTypes; // Use provided filter

    try {
      const userData = localStorage.getItem("user");
      if (!userData) return null; // No user, show all
      const user = JSON.parse(userData);
      const role = (user.role || '').toLowerCase();

      switch (role) {
        case "student":
        case "staff":
        case "ta":
        case "professor":
          return ["Workshop", "Trip", "Conference", "GymSession", "Bazaar", "Booth"];
        case "vendor":
          return ["Bazaar", "Booth"];
        case "eventoffice":
        case "admin":
          return null; // Show all event types
        default:
          return null; // Show all for unknown roles
      }
    } catch {
      return null; // Show all on error
    }
  };

  // Use role-based filtering if filterByTypes is not explicitly provided
  const effectiveFilterByTypes = getRoleBasedEventTypes();

  const getDashboardPath = () => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return "/";
      const user = JSON.parse(userData);
      const role = user.role ? user.role.toLowerCase() : null;
      switch (role) {
        case "vendor": return "/VendorDashboard";
        case "student": return "/student-dashboard";
        case "ta": return "/TaDashboard";
        case "professor": return "/ProfessorDashboard";
        case "eventoffice": return "/EventOfficeDashboard";
        case "staff": return "/StaffDashboard";
        case "admin": return "/Admin";
        default: return "/";
      }
    } catch {
      return "/";
    }
  };
  const [filters, setFilters] = useState({
    type: "",
    search: "",
    location: "",
    sortBy: "date",
    startDate: "",
    endDate: "",
    professorName: "",
    upcomingOnly: false,
  });

  // Favourites (per-user, frontend)
  const [favIds, setFavIds] = useState(() => new Set(favourites.getFavouriteIds().map(String)));

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  // Apply a preset event type filter passed from parent (e.g., Student Dashboard)
  useEffect(() => {
    if (!presetType) return;
    setFilters((prev) => (prev.type === presetType ? prev : { ...prev, type: presetType }));
  }, [presetType]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.type) queryParams.append("type", filters.type);
      if (filters.search) {
        queryParams.append("search", filters.search);
        queryParams.append("q", filters.search);
      }
      if (filters.professorName) queryParams.append('professorName', filters.professorName);

      if (filters.location) queryParams.append("location", filters.location);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);

      let endpoint = `${API_BASE}/events`;
      // Use search endpoint when doing a generic search
      if (filters.search) {
        endpoint = `${API_BASE}/events/search`;
      } else if (filters.location || filters.startDate || filters.endDate || filters.professorName) {
        endpoint = `${API_BASE}/events/filter`;
      }

      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${endpoint}?${queryParams}`, { headers });
      const data = await response.json();
      let list = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);

      // Add frontend-approved workshops (draft workshops that were approved)
      try {
        const approvedSet = getApprovedWorkshops();
        if (approvedSet.size > 0) {
          // Fetch all workshops including drafts
          const sortRes = await fetch(`${API_BASE}/events/sort`);
          const sortData = await sortRes.json();
          if (Array.isArray(sortData)) {
            const approvedWorkshops = sortData.filter(
              w => w.type === 'Workshop' && approvedSet.has(w._id) && w.status === 'pending'
            );
            // Mark them as published for display
            approvedWorkshops.forEach(w => { w.status = 'published'; });
            // Merge with existing list, avoiding duplicates
            const existingIds = new Set(list.map(e => e._id));
            const newWorkshops = approvedWorkshops.filter(w => !existingIds.has(w._id));
            list = [...list, ...newWorkshops];
          }
        }
      } catch (e) {
        console.log('Error adding approved workshops:', e);
      }

      // Filter events based on user restrictions (frontend-only)
      const filteredList = list.filter(event => {
        const eventId = event._id || event.id;
        if (!eventId) return true; // Include events without ID
        const hasAccess = canUserAccessEvent(eventId);
        if (!hasAccess) {
          console.log('Filtered out restricted event:', eventId, event.title);
        }
        return hasAccess;
      });

      setEvents(filteredList);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if current user is EventOffice
  const isEventOffice = (() => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return false;
      const user = JSON.parse(userData);
      return (user.role || '').toLowerCase() === 'eventoffice';
    } catch {
      return false;
    }
  })();

  // Check if user can delete (Admin or EventOffice only)
  const canDelete = (() => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return false;
      const user = JSON.parse(userData);
      const role = (user.role || '').toLowerCase();
      return role === 'admin' || role === 'eventoffice';
    } catch {
      return false;
    }
  })();

  const filteredEvents = events
    .filter((event) => {
      // Handle archived events based on props
      const isArchived = archivedEventsSet.has(event._id) || event.status === 'completed';

      if (showArchivedOnly) {
        // Only show archived events
        if (!isArchived) return false;
      } else if (hideArchived || !isEventOffice) {
        // Hide archived events (for browse tab or non-EventOffice users)
        if (isArchived) return false;
      }
      // If neither showArchivedOnly nor hideArchived, EventOffice can see all events (original behavior)

      // Filter for upcoming events only
      if (filters.upcomingOnly) {
        const eventStartDate = event.startDate ? new Date(event.startDate) : null;
        if (!eventStartDate || eventStartDate <= new Date()) {
          return false;
        }
      }

      if (effectiveFilterByTypes && !effectiveFilterByTypes.includes(event.type)) return false;
      if (filters.type && event.type !== filters.type) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const title = event.title?.toLowerCase().includes(s);
        const desc = event.description?.toLowerCase().includes(s);
        return title || desc;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "date")
        return new Date(a.startDate) - new Date(b.startDate);
      if (filters.sortBy === "title") return a.title.localeCompare(b.title);
      return 0;
    });

  const handleEventClick = (id) => navigate(`/events/${id}`);

  // Delete and Archive handlers - use provided callbacks or create default ones
  const handleDeleteEvent = async (id) => {
    if (onDelete) {
      await onDelete(id);
    } else {
      const confirmed = await confirmDialog('Delete this event? This cannot be undone.', 'Delete Event');
      if (!confirmed) return;
      try {
        await deleteEvent(id);
        showToast.success('Event deleted successfully');
      } catch (err) {
        console.error('Failed to delete event', err);
        showToast.error(err.message || 'Failed to delete event');
        return; // Don't refresh if delete failed
      }
    }
    // Always refresh after delete
    fetchEvents();
  };

  const handleArchiveEvent = async (id, event) => {
    if (onArchive) {
      await onArchive(id, event);
    } else {
      const confirmed = await confirmDialog('Archive this event? It will be hidden from the event list.', 'Archive Event');
      if (!confirmed) return;

      // Frontend-only archiving - add to localStorage
      try {
        const stored = localStorage.getItem('archivedEvents');
        const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
        archivedSet.add(id);
        localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
        setArchivedEventsSet(new Set(archivedSet)); // Update state
        showToast.success('Event archived successfully!');
      } catch (err) {
        console.error('Failed to archive event', err);
        showToast.error('Failed to archive event');
        return; // Don't refresh if archive failed
      }
    }
    // Always refresh after archive
    fetchEvents();
  };

  const handleUnarchiveEvent = async (id, event) => {
    if (onUnarchive) {
      await onUnarchive(id, event);
    } else {
      const confirmed = await confirmDialog('Unarchive this event? It will be visible in the event list again.', 'Unarchive Event');
      if (!confirmed) return;

      // Frontend-only unarchiving - remove from localStorage
      try {
        const stored = localStorage.getItem('archivedEvents');
        const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
        archivedSet.delete(id);
        localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
        setArchivedEventsSet(new Set(archivedSet)); // Update state
        showToast.success('Event unarchived successfully!');
      } catch (err) {
        console.error('Failed to unarchive event', err);
        showToast.error('Failed to unarchive event');
        return; // Don't refresh if unarchive failed
      }
    }
    // Always refresh after unarchive
    fetchEvents();
  };

  const hasEventPassed = (event) => {
    const eventEndDate = event.endDate || event.startDate;
    if (!eventEndDate) return false;
    return new Date(eventEndDate) < new Date();
  };

  const toggleFav = (id) => {
    const next = new Set(favourites.toggleFavourite(id).map(String));
    setFavIds(next);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bgPrimary,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Background Elements */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "rgba(212, 175, 55, 0.08)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "600px",
          height: "600px",
          background: "rgba(212, 175, 55, 0.08)",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />



      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['4xl']} ${spacing['7xl']}`, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Back to Dashboard Button - Only show when on /events route */}
          {showBackButton && (
            <div style={{ marginBottom: spacing['3xl'] }}>
              <button
                onClick={() => navigate(getDashboardPath())}
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
                ← Back to Dashboard
              </button>
            </div>
          )}

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: spacing['5xl'], position: 'relative' }}>
            {headerAction && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)'
              }}>
                {headerAction}
              </div>
            )}
            <h1
              style={{
                fontSize: typography.fontSize['4xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.white,
                marginBottom: spacing.lg,
                textShadow: shadows.lg,
                letterSpacing: "-1px",
              }}
            >
              {showArchivedOnly ? 'Archived Events' : 'Upcoming Events'}
            </h1>
            <p style={{
              fontSize: typography.fontSize.xl,
              color: colors.accent,
              lineHeight: typography.lineHeight.relaxed,
              opacity: 0.95
            }}>
              {showArchivedOnly
                ? 'View and manage archived events'
                : effectiveFilterByTypes && effectiveFilterByTypes.every(t => ["Bazaar", "Booth"].includes(t))
                  ? 'Discover bazaars and booths'
                  : effectiveFilterByTypes && effectiveFilterByTypes.some(t => ["Workshop", "Trip", "Conference", "GymSession", "Bazaar", "Booth"].includes(t))
                    ? 'Discover workshops, trips, conferences, gym sessions, bazaars, and booths'
                    : 'Discover workshops, trips, conferences, bazaars, and more'}
            </p>
          </div>

          {/* Filters */}
          <div
            style={{
              background: colors.bgCard,
              padding: `${spacing['3xl']} ${spacing['3xl']}`,
              borderRadius: borderRadius['3xl'],
              boxShadow: shadows.lg,
              marginBottom: spacing['4xl'],
            }}
          >
            {/* Search Row */}
            <div
              style={{
                display: "flex",
                gap: spacing.lg,
                flexWrap: "wrap",
                marginBottom: spacing.lg,
              }}
            >
              <input
                type="text"
                placeholder="🔍 Search by event name"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                style={{
                  ...inputStyles.base,
                  minWidth: "200px",
                  flex: "1 1 300px",
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
              {/* Professor name filter removed */}
            </div>

            {/* Filter Row */}
            <div
              style={{
                display: "flex",
                gap: spacing.lg,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                style={{
                  ...inputStyles.base,
                  minWidth: "160px",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = colors.accent;
                  e.target.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.gray200;
                  e.target.style.boxShadow = "none";
                }}
              >
                <option value="">All Events</option>
                {
                  effectiveFilterByTypes
                    ? effectiveFilterByTypes.map((t) => (
                      <option key={t} value={t}>
                        {t === 'Bazaar' ? '🏪 Bazaar' : t === 'Booth' ? '🎪 Booth' : t === 'GymSession' ? '💪 Gym Session' : t}
                      </option>
                    ))
                    : (
                      <>
                        <option value="Workshop">🛠️ Workshop</option>
                        <option value="Trip">🚌 Trip</option>
                        <option value="Bazaar">🏪 Bazaar</option>
                        <option value="Booth">🎪 Booth</option>
                        <option value="Conference">🎤 Conference</option>
                        <option value="GymSession">💪 Gym Session</option>
                      </>
                    )
                }
              </select>

              <input
                type="text"
                placeholder="📍 Location"
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
                }
                style={{
                  ...inputStyles.base,
                  minWidth: "160px",
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

              {/* Professor name filter only for Workshops */}
              {filters.type === 'Workshop' || filters.type === 'Conference' && (
                <input
                  type="text"
                  placeholder="👩‍🏫 Professor name"
                  value={filters.professorName}
                  onChange={(e) => setFilters({ ...filters, professorName: e.target.value })}
                  style={{
                    ...inputStyles.base,
                    minWidth: "160px",
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
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, minWidth: "160px" }}>
                <label style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.gray600,
                  fontWeight: typography.fontWeight.medium
                }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  style={{
                    ...inputStyles.base,
                    minWidth: "160px",
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
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, minWidth: "160px" }}>
                <label style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.gray600,
                  fontWeight: typography.fontWeight.medium
                }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  style={{
                    ...inputStyles.base,
                    minWidth: "160px",
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
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, minWidth: "160px" }}>
                <label style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.gray600,
                  fontWeight: typography.fontWeight.medium
                }}>
                  Sort by
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({ ...filters, sortBy: e.target.value })
                  }
                  style={{
                    ...inputStyles.base,
                    minWidth: "160px",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.accent;
                    e.target.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.gray200;
                    e.target.style.boxShadow = "none";
                  }}
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                </select>
              </div>

              {/* Upcoming Only Filter */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                minWidth: "160px",
                padding: `${spacing.sm} 0`,
              }}>
                <input
                  type="checkbox"
                  id="upcomingOnly"
                  checked={filters.upcomingOnly}
                  onChange={(e) =>
                    setFilters({ ...filters, upcomingOnly: e.target.checked })
                  }
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    accentColor: colors.accent,
                  }}
                />
                <label
                  htmlFor="upcomingOnly"
                  style={{
                    fontSize: typography.fontSize.base,
                    color: colors.gray700,
                    fontWeight: typography.fontWeight.medium,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  Upcoming Only
                </label>
              </div>

              <button
                onClick={() =>
                  setFilters({
                    type: "",
                    search: "",
                    location: "",
                    sortBy: "date",
                    startDate: "",
                    endDate: "",
                    professorName: "",
                    upcomingOnly: false,
                  })
                }
                style={{
                  ...buttonStyles.primary,
                  padding: `${spacing.md} ${spacing['2xl']}`,
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow = shadows.accentHover;
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = shadows.accent;
                }}
              >
                Clear Filters
              </button>

              <div
                style={{
                  padding: `${spacing.md} ${spacing.xl}`,
                  background: `rgba(212, 175, 55, 0.15)`,
                  borderRadius: borderRadius.xl,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.primary,
                  marginLeft: "auto",
                }}
              >
                {filteredEvents.length} event
                {filteredEvents.length !== 1 ? "s" : ""} found
              </div>
            </div>
          </div>

          {/* Event Grid */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  border: "5px solid rgba(212, 175, 55, 0.3)",
                  borderTop: "5px solid #d4af37",
                  borderRadius: "50%",
                  margin: "0 auto 20px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <p style={{ fontSize: "1.2rem", color: "#d4af37", fontWeight: "500" }}>
                Loading events...
              </p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: `${spacing['7xl']} ${spacing['4xl']}`,
                background: colors.bgCard,
                borderRadius: borderRadius['3xl'],
                boxShadow: shadows.lg,
              }}
            >
              <div style={{ fontSize: "5rem", marginBottom: spacing.xl }}>📭</div>
              <p
                style={{
                  fontSize: typography.fontSize['2xl'],
                  color: colors.primary,
                  fontWeight: typography.fontWeight.bold,
                  marginBottom: spacing.md,
                }}
              >
                No events found
              </p>
              <p style={{
                fontSize: typography.fontSize.lg,
                color: colors.gray500,
                lineHeight: typography.lineHeight.normal,
              }}>
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: spacing['3xl'],
              }}
            >
              {filteredEvents.map((e) => {
                const id = e._id || e.id;
                const isFav = favIds.has(String(id));
                return (
                  <div key={id} style={{ position: 'relative' }}>
                    {enableFavorites && (
                      <button
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); toggleFav(id); }}
                        aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                        title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          zIndex: 2,
                          background: 'rgba(255,255,255,0.95)',
                          border: 'none',
                          borderRadius: 9999,
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          cursor: 'pointer'
                        }}
                      >
                        <FaHeart size={18} color={isFav ? '#dc2626' : '#e5e7eb'} />
                      </button>
                    )}
                    <EventCard
                      event={e}
                      onClick={() => handleEventClick(id)}
                      onDelete={(canDelete && (onDelete || handleDeleteEvent)) ? () => handleDeleteEvent(id) : undefined}
                      onArchive={(onArchive || handleArchiveEvent) ? () => handleArchiveEvent(id, e) : undefined}
                      onUnarchive={(onUnarchive || handleUnarchiveEvent) ? () => handleUnarchiveEvent(id, e) : undefined}
                      hasEventPassed={hasEventPassed}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


export default EventsList;

