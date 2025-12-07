import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import EventCard from "./Cards/EventCard";
import DateTimePicker from "./UI/DateTimePicker";
import { API_BASE } from "../services/eventService";
import { deleteEvent, getApprovedWorkshops } from '../services/eventService';
import { listMyApplications } from '../services/vendorService';
import { FaHeart } from 'react-icons/fa';
import favourites from "../services/favoritesService";
import { canUserAccessEvent } from "../services/eventRestrictionService";
import { showToast, confirmDialog } from '../utils/toast';
import { createCheckoutSession, payWithWallet, getWalletBalance, getEventPrice } from '../services/paymentService'; // Added payment services
import { getAttendedIds } from '../services/attendanceService'; // Added attendance (optional but good for consistency)

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

  const getRoleBasedEventTypes = () => {
    if (filterByTypes !== null) return filterByTypes;

    try {
      const userData = localStorage.getItem("user");
      if (!userData) return null;
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
          return null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  };

  const effectiveFilterByTypes = getRoleBasedEventTypes();

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

  const [favIds, setFavIds] = useState(() => new Set(favourites.getFavouriteIds().map(String)));
  const [vendorAppsMap, setVendorAppsMap] = useState({});

  // Payment State
  const [walletBalance, setWalletBalance] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [paidLocal, setPaidLocal] = useState(new Set()); // Track local successful payments

  useEffect(() => {
    // Fetch wallet balance on mount
    getWalletBalance()
      .then(res => setWalletBalance(res.balance ?? null))
      .catch(() => setWalletBalance(null));
  }, []);

  const handlePay = async (evt, method) => {
    const id = evt._id || evt.id;
    setPayingId(id);
    setProcessingPayment(true);
    try {
      if (method === 'wallet') {
        await payWithWallet(id);
        setPaidLocal(prev => new Set(prev).add(String(id)));
        showToast.success('Payment successful via Wallet!');
        // Refresh wallet balance
        getWalletBalance().then(res => setWalletBalance(res.balance ?? null));
        // Refresh events to show updated status (optional, but good)
        fetchEvents();
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

  useEffect(() => {
    const user = userIdFromProto();
    if (user && user.role === 'vendor') {
      listMyApplications().then(res => {
        const apps = res.applications || res.data || [];
        if (res.success && Array.isArray(apps)) {
          const map = {};
          apps.forEach(app => {
            const eid = app.event._id || app.event;
            map[String(eid)] = app.status;
          });
          setVendorAppsMap(map);
        }
      }).catch(err => console.warn('Failed to load apps', err));
    }
  }, []);

  // Helper
  const userIdFromProto = () => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch { return null; }
  };

  useEffect(() => {
    fetchEvents();
  }, [filters]);

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

      try {
        const approvedSet = getApprovedWorkshops();
        if (approvedSet.size > 0) {
          const sortRes = await fetch(`${API_BASE}/events/sort`);
          const sortData = await sortRes.json();
          if (Array.isArray(sortData)) {
            const approvedWorkshops = sortData.filter(
              w => w.type === 'Workshop' && approvedSet.has(w._id) && w.status === 'pending'
            );
            approvedWorkshops.forEach(w => { w.status = 'published'; });
            const existingIds = new Set(list.map(e => e._id));
            const newWorkshops = approvedWorkshops.filter(w => !existingIds.has(w._id));
            list = [...list, ...newWorkshops];
          }
        }
      } catch (e) {
        console.log('Error adding approved workshops:', e);
      }

      const filteredList = list.filter(event => {
        const eventId = event._id || event.id;
        if (!eventId) return true;
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
      const isArchived = archivedEventsSet.has(event._id) || event.status === 'completed';

      if (showArchivedOnly) {
        if (!isArchived) return false;
      } else if (hideArchived || !isEventOffice) {
        if (isArchived) return false;
      }

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

  const getCanEdit = (event) => {
    const userData = localStorage.getItem("user");
    if (!userData) return false;
    const user = JSON.parse(userData);
    const role = (user.role || '').toLowerCase();
    const eventType = event.type || 'Event';

    if (role === 'admin') return true;

    if (role === 'eventoffice') {
      // Event Office cannot edit Workshops (Professor only)
      if (eventType === 'Workshop') return false;
      return true;
    }

    if (role === 'professor' && eventType === 'Workshop') {
      // Professor can edit their own workshops
      const userId = user._id || user.id;
      const creator = event.createdBy || event.professor || '';
      return creator === userId;
    }

    return false;
  };

  const handleEditEvent = (id, event) => {
    const type = event?.type || 'Event';
    if (!type) {
      showToast.error('Unknown event type');
      return;
    }

    // Route based on type
    switch (type) {
      case 'GymSession':
        navigate(`/events-office/gym-sessions/edit/${id}`);
        return;
      case 'Bazaar':
        navigate(`/events-office/bazaars/edit/${id}`);
        return;
      case 'Booth':
        navigate(`/events-office/booths`); // Booths usually managed in list, or add edit route if exists
        // Checking App.jsx: /events-office/booths exists, but edit?
        // "Route path="/events-office/booths" element={<BoothsManager />} />"
        // No edit route for booths? Assuming inline or modal. 
        // If no edit route, maybe navigate to manager.
        return;
      case 'Trip':
        navigate(`/events-office/trips/edit/${id}`);
        return;
      case 'Conference':
        navigate(`/events-office/conferences/edit/${id}`);
        return;
      case 'Workshop':
        navigate(`/professor/workshops/edit/${id}`);
        return;
      default:
        // Fallback
        navigate(`/events/${id}/edit`);
    }
  };

  const handleEventClick = (id) => navigate(`/events/${id}`);

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
        return;
      }
    }
    fetchEvents();
  };

  const handleArchiveEvent = async (id, event) => {
    if (onArchive) {
      await onArchive(id, event);
    } else {
      const confirmed = await confirmDialog('Archive this event? It will be hidden from the event list.', 'Archive Event');
      if (!confirmed) return;

      try {
        const stored = localStorage.getItem('archivedEvents');
        const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
        archivedSet.add(id);
        localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
        setArchivedEventsSet(new Set(archivedSet));
        showToast.success('Event archived successfully!');
      } catch (err) {
        console.error('Failed to archive event', err);
        showToast.error('Failed to archive event');
        return;
      }
    }
    fetchEvents();
  };

  const handleUnarchiveEvent = async (id, event) => {
    if (onUnarchive) {
      await onUnarchive(id, event);
    } else {
      const confirmed = await confirmDialog('Unarchive this event? It will be visible in the event list again.', 'Unarchive Event');
      if (!confirmed) return;

      try {
        const stored = localStorage.getItem('archivedEvents');
        const archivedSet = stored ? new Set(JSON.parse(stored)) : new Set();
        archivedSet.delete(id);
        localStorage.setItem('archivedEvents', JSON.stringify(Array.from(archivedSet)));
        setArchivedEventsSet(new Set(archivedSet));
        showToast.success('Event unarchived successfully!');
      } catch (err) {
        console.error('Failed to unarchive event', err);
        showToast.error('Failed to unarchive event');
        return;
      }
    }
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
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 relative text-center">
          {headerAction && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
              {headerAction}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {showArchivedOnly ? 'Archived Events' : 'Upcoming Events'}
            </h1>
            <p className="text-slate-500 mt-1">
              {showArchivedOnly
                ? 'View and manage archived events'
                : effectiveFilterByTypes && effectiveFilterByTypes.every(t => ["Bazaar", "Booth"].includes(t))
                  ? 'Discover bazaars and booths'
                  : 'Discover workshops, trips, conferences, and more'}
            </p>
          </div>
        </div>

        {/* Filters */}
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-col gap-6">
            {/* Search Row */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
              <input
                type="text"
                placeholder="Search events by name or description..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="input input-bordered w-full pl-12 h-12 text-base bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="form-control">
                <label className="label text-xs font-bold text-emerald-600 uppercase tracking-wider">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="select select-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 transition-colors"
                >
                  <option value="">All Events</option>
                  {effectiveFilterByTypes
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
              </div>

              <div className="form-control">
                <label className="label text-xs font-bold text-emerald-600 uppercase tracking-wider">Location</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">📍</span>
                  <input
                    type="text"
                    placeholder="Filter by location"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="input input-bordered w-full pl-10 bg-white border-slate-300 text-slate-900 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {(filters.type === 'Workshop' || filters.type === 'Conference') && (
                <div className="form-control">
                  <label className="label text-xs font-bold text-emerald-600 uppercase tracking-wider">Professor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">👩‍🏫</span>
                    <input
                      type="text"
                      placeholder="Professor name"
                      value={filters.professorName}
                      onChange={(e) => setFilters({ ...filters, professorName: e.target.value })}
                      className="input input-bordered w-full pl-10 bg-white border-slate-300 text-slate-900 focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="form-control">
                <label className="label text-xs font-bold text-emerald-600 uppercase tracking-wider">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="select select-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 transition-colors"
                >
                  <option value="date">Date (Earliest First)</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div className="form-control">
                <DateTimePicker
                  label="Start Date"
                  showTime={false}
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value ? e.target.value.slice(0, 10) : '' })}
                  placeholder="Filter by start date"
                />
              </div>
              <div className="form-control">
                <DateTimePicker
                  label="End Date"
                  showTime={false}
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value ? e.target.value.slice(0, 10) : '' })}
                  placeholder="Filter by end date"
                />
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.upcomingOnly}
                  onChange={(e) => setFilters({ ...filters, upcomingOnly: e.target.checked })}
                  className="checkbox checkbox-sm checkbox-primary border-slate-300 rounded-md"
                />
                <span className="text-sm font-medium text-slate-600 group-hover:text-emerald-600 transition-colors">Show Upcoming Only</span>
              </label>

              <div className="flex items-center gap-4 ml-auto">
                <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200">
                  {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} found
                </span>

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
                  className="btn btn-ghost btn-sm text-slate-500 hover:text-red-600 hover:bg-red-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Event Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <span className="loading loading-spinner loading-lg text-emerald-500 mb-6"></span>
            <p className="text-lg font-medium text-slate-400">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="text-6xl mb-6 opacity-50">📭</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No events found</h3>
            <p className="text-slate-500">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {filteredEvents.map((e) => {
              const id = e._id || e.id;
              const isFav = favIds.has(String(id));
              return (
                <div key={id} className="relative h-full group">

                  <EventCard
                    event={e}
                    canEdit={getCanEdit(e)}
                    onEdit={() => handleEditEvent(id, e)}
                    isFavorite={isFav}
                    onToggleFavorite={enableFavorites ? () => toggleFav(id) : null}
                    vendorRequestStatus={vendorAppsMap[String(id)]}

                    // Payment Props
                    processingPayment={processingPayment && payingId === id}
                    onPayCard={() => handlePay(e, 'card')}
                    onPayWallet={() => handlePay(e, 'wallet')}
                    canUseWallet={typeof walletBalance === 'number' && walletBalance >= (e.ticketPrice || e.price || 0)}

                    // Logic for display
                    isPayable={(() => {
                      // Check if registered
                      const userData = localStorage.getItem("user");
                      const user = userData ? JSON.parse(userData) : null;
                      const userId = user && (user._id || user.id);
                      if (!userId) return false;
                      const registeredUsers = e.registeredUsers || [];
                      const isReg = registeredUsers.some(u => String(u._id || u.id || u) === String(userId));

                      if (!isReg) return false;

                      // Check if paid
                      const serverPaid = Boolean(e.paymentStatus || e.paid);
                      const isPaid = serverPaid || paidLocal.has(String(id));
                      if (isPaid) return false;

                      // Check if price > 0
                      const price = e.ticketPrice || e.price || 0;
                      if (!price || price <= 0) return false;

                      // Check type specific
                      if (e.type === 'Workshop' && e.fundingSource !== 'Internal') return false;

                      return true;
                    })()}

                    isPaid={(() => {
                      const serverPaid = Boolean(e.paymentStatus || e.paid);
                      return serverPaid || paidLocal.has(String(id));
                    })()}

                    customActions={(
                      <>
                        {(canDelete && (onDelete || handleDeleteEvent)) && (
                          <button
                            onClick={() => (onDelete || handleDeleteEvent)(id)}
                            className="flex-1 btn btn-ghost btn-xs text-red-600 hover:bg-red-50 border border-red-200"
                          >
                            Delete
                          </button>
                        )}
                        {(onArchive || handleArchiveEvent) && !archivedEventsSet.has(id) && isEventOffice && (
                          <button
                            onClick={() => (onArchive || handleArchiveEvent)(id, e)}
                            className="flex-1 btn btn-ghost btn-xs text-slate-500 hover:bg-slate-100 border border-slate-200"
                          >
                            Archive
                          </button>
                        )}
                        {(onUnarchive || handleUnarchiveEvent) && archivedEventsSet.has(id) && isEventOffice && (
                          <button
                            onClick={() => (onUnarchive || handleUnarchiveEvent)(id, e)}
                            className="flex-1 btn btn-ghost btn-xs text-emerald-600 hover:bg-emerald-50 border border-emerald-200"
                          >
                            Unarchive
                          </button>
                        )}
                      </>
                    )}
                  />
                  {/* Overlay click for details if clicking outside interactive elements, 
                      or we can trust the 'Details' button in the card. 
                      Since EventCard has a 'Details' button, we don't strictly need 
                      the whole card to be clickable, but to keep consistent behavior
                      with browsing, we might want to wrap it or leave it as is. 
                      
                      IMPORTANT: The new EventCard doesn't accept 'onClick' for the whole card
                      to avoid conflict with inner buttons. It has a specific 'Details' button.
                      
                      If we want the delete/archive actions which were available here:
                      The generic EventCard doesn't natively expose 'delete/archive' props 
                      in the same way 'MyEventsList' used pay/rate.
                      
                      We need to double check EventCard definition.
                      It supports: canEdit, onEdit, canRefund, onRefund. 
                      It does NOT currently accept arbitrary action buttons or slots. 
                      
                      We should update EventCard to accept 'renderActions' or similar, 
                      OR update EventsList to just display the card.
                      
                      However, looking at the previous code, EventsList passed 'onDelete' etc.
                      Let's stick to the props EventCard accepts.
                  */}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsList;
