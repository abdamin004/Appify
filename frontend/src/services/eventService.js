const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export { API_BASE };

async function http(method, url, body) {
  const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.message || data.error || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

function currentUserId() {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem('user');
    if (!raw) return undefined;
    const obj = JSON.parse(raw);
    return obj && (obj._id || obj.id);
  } catch (_) {
    return undefined;
  }
}

// Create helpers
export function createBazaar(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Bazaar', createdBy: currentUserId() });
}
export function createBooth(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Booth', createdBy: currentUserId() });
}
export function createTrip(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Trip', createdBy: currentUserId() });
}
export function createWorkshop(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Workshop', createdBy: currentUserId() });
}

export function createConference(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Conference', createdBy: currentUserId() });
}

// Update any event by id
export function updateEvent(id, payload) {
  return http('PUT', `${API_BASE}/events/update/${id}`, payload);
}

// Lists (by type)
export async function listBazaars() {
  const res = await fetch(`${API_BASE}/events/filter?type=Bazaar`);
  return res.json();
}
export async function listBooths() {
  const res = await fetch(`${API_BASE}/events/filter?type=Booth`);
  return res.json();
}
export async function listTrips() {
  const res = await fetch(`${API_BASE}/events/filter?type=Trip`);
  return res.json();
}

export async function listConferences() {
  const res = await fetch(`${API_BASE}/events/filter?type=Conference`);
  return res.json();
}

// Workshops by professor name (UI filter)
export async function listWorkshopsByProfessor(professorName) {
  const q = new URLSearchParams({ type: 'Workshop', professorName });
  const res = await fetch(`${API_BASE}/events/filter?${q.toString()}`);
  return res.json();
}

export async function listUpcomingPublished() {
  const res = await fetch(`${API_BASE}/events`);
  return res.json();
}

// Generic: list events by type (Workshop, Trip, ...)
export async function listEventsByType(type) {
  const q = new URLSearchParams({ type });
  const res = await fetch(`${API_BASE}/events/filter?${q.toString()}`);
  return res.json();
}

// Public registration for existing event (no auth)
export function publicRegisterForEvent(eventId, payload) {
  return http('POST', `${API_BASE}/events/register-public/${eventId}`, payload);
}

// Authenticated registration (adds to registeredUsers/user.registeredEvents)
export function registerForEvent(eventId) {
  return http('POST', `${API_BASE}/events/register/${eventId}`);
}

// Gym sessions
export function createGymSession(payload) {
  // Expect payload to include sessionType (enum) and instructor (required)
  const body = { ...payload, type: 'GymSession', createdBy: currentUserId() };
  return http('POST', `${API_BASE}/events/create`, body);
}

export function updateGymSession(id, payload) {
  return updateEvent(id, payload);
}

export function cancelGymSession(id) {
  return updateEvent(id, { status: 'cancelled' });
}

export async function listGymSessions() {
  const q = new URLSearchParams({ type: 'GymSession' });
  const res = await fetch(`${API_BASE}/events/filter?${q.toString()}`);
  return res.json();
}
// Delete an event (Admin/EventOffice only)
export function deleteEvent(id) {
  return http('DELETE', `${API_BASE}/events/delete/${id}`);
}

// Event details + comments/ratings
export async function getEventById(id) {
  const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${API_BASE}/events/${id}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    let errorMsg = `Failed to load event (${res.status})`;
    try {
      const json = JSON.parse(text);
      errorMsg = json.message || json.error || errorMsg;
    } catch (_) {
      if (text.includes('<!DOCTYPE')) {
        errorMsg = 'Server returned HTML instead of JSON. Check if backend is running correctly.';
      } else if (text) {
        errorMsg = text;
      }
    }
    throw new Error(errorMsg);
  }
  return res.json();
}
export async function getEventComments(id) {
  // Backend requires auth, so use http helper which includes token
  const res = await http('GET', `${API_BASE}/events/${id}/comments`);
  // Backend returns { success: true, comments: [...], count: X }
  // Return comments array for compatibility
  return Array.isArray(res) ? res : (res?.comments || []);
}

export async function getEventRatings(id) {
  // Backend requires auth, so use http helper which includes token
  const res = await http('GET', `${API_BASE}/events/${id}/ratings`);
  // Backend returns { success: true, averageRating: X, ratings: [...], count: X }
  // Convert to expected format: { average: X, ratings: [...], count: X, histogram: {} }
  if (Array.isArray(res)) {
    // If it's already an array (old format), convert it
    const count = res.length;
    const total = res.reduce((sum, r) => sum + (r.rating || r.value || 0), 0);
    const average = count > 0 ? total / count : 0;
    const histogram = [1,2,3,4,5].reduce((acc, v) => {
      acc[v] = res.filter(r => (r.rating || r.value) === v).length;
      return acc;
    }, {});
    return { average, count, ratings: res, histogram };
  }
  // New format: { success: true, averageRating: X, ratings: [...], count: X }
  const average = res.averageRating ?? res.average ?? 0;
  const count = res.count ?? (Array.isArray(res.ratings) ? res.ratings.length : 0);
  const ratings = res.ratings || [];
  const histogram = [1,2,3,4,5].reduce((acc, v) => {
    acc[v] = ratings.filter(r => (r.rating || r.value) === v).length;
    return acc;
  }, {});
  return { average, count, ratings, histogram };
}

export function rateEvent(id, value) {
  // Backend expects POST /events/:id/ratings with { rating: value }
  // Frontend was calling /events/:id/rate with { value }
  return http('POST', `${API_BASE}/events/${id}/ratings`, { rating: value });
}

// Comments (auth required to add/delete)
export function addEventComment(eventId, content) {
  return http('POST', `${API_BASE}/events/comment/${eventId}`, { content });
}
export function deleteEventComment(commentId) {
  return http('DELETE', `${API_BASE}/events/comment/${commentId}`);
}

// Workshop approval/rejection functions
export async function listPendingWorkshops() {
  try {
    // Try multiple approaches to get workshops
    let allWorkshops = [];
    
    // Approach 1: Try sortEvents endpoint (doesn't filter by status)
    try {
      const sortRes = await fetch(`${API_BASE}/events/sort`);
      const sortData = await sortRes.json();
      if (Array.isArray(sortData)) {
        const workshops = sortData.filter(e => e.type === 'Workshop');
        allWorkshops = [...allWorkshops, ...workshops];
      }
    } catch (e) {
      console.log('sortEvents approach failed:', e);
    }
    
    // Approach 2: Try filter endpoint
    try {
      const q = new URLSearchParams({ type: 'Workshop' });
      const filterRes = await fetch(`${API_BASE}/events/filter?${q.toString()}`);
      const filterData = await filterRes.json();
      if (Array.isArray(filterData)) {
        allWorkshops = [...allWorkshops, ...filterData];
      }
    } catch (e) {
      console.log('filterEvents approach failed:', e);
    }
    
    // Approach 3: Try getAllEvents
    try {
      const allRes = await fetch(`${API_BASE}/events`);
      const allData = await allRes.json();
      if (Array.isArray(allData)) {
        const workshops = allData.filter(e => e.type === 'Workshop');
        allWorkshops = [...allWorkshops, ...workshops];
      }
    } catch (e) {
      console.log('getAllEvents approach failed:', e);
    }
    
    // Remove duplicates by _id
    const uniqueWorkshops = Array.from(
      new Map(allWorkshops.map(w => [w._id, w])).values()
    );
    
    // Filter for draft status workshops
    return uniqueWorkshops.filter(w => w.status === 'draft');
  } catch (err) {
    console.error('Error fetching pending workshops:', err);
    return [];
  }
}

// Get approved workshops from localStorage (frontend-only)
export function getApprovedWorkshops() {
  try {
    const stored = localStorage.getItem('approvedWorkshops');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function approveWorkshop(workshopId) {
  return http('PATCH', `${API_BASE}/events/publish/${workshopId}`);
}

export function rejectWorkshop(workshopId) {
  return updateEvent(workshopId, { status: 'cancelled' });
}

// Archive event (mark as completed)
export function archiveEvent(eventId) {
  return updateEvent(eventId, { status: 'completed' });
}

// Helper function to create notifications for all users when an event is published
export async function notifyAllUsersAboutNewEvent(event) {
  try {
    // Dynamic import to avoid circular dependencies
    const notificationService = await import('./notificationService');
    const { 
      createStudentNotification, 
      createEventOfficeNotification,
      markEventsAsSeen,
      createProfessorNotification
    } = notificationService;
    
    if (!event || event.status !== 'published') return;
    
    const eventId = String(event._id || event.id);
    const eventType = event.type || 'Event';
    const eventTitle = event.title || 'New Event';
    
    // Mark event as seen immediately (so polling doesn't create duplicate notifications)
    markEventsAsSeen([eventId]);
    
    // Create notification for all user types
    const notification = {
      type: 'NewEvent',
      message: `New ${eventType}: ${eventTitle}`,
      eventId: eventId,
      eventTitle: eventTitle,
      eventType: eventType,
    };
    
    // Create student notification (shared by students, staff, TA)
    createStudentNotification(notification);
    
    // Create event office notification
    createEventOfficeNotification(notification);
    
    // Create notifications for all professors (get all professor IDs from localStorage)
    // We'll create a notification for each professor we can find
    try {
      const allKeys = Object.keys(localStorage);
      const professorKeys = allKeys.filter(key => key.startsWith('professorNotifications_'));
      professorKeys.forEach(key => {
        const professorId = key.replace('professorNotifications_', '');
        if (professorId) {
          createProfessorNotification(professorId, notification);
        }
      });
    } catch (profErr) {
      console.log('Could not create professor notifications:', profErr);
    }
    
    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`New ${eventType} Available`, {
          body: eventTitle,
          icon: '/favicon.ico',
          tag: `event-${eventId}`,
        });
      } catch (notifErr) {
        console.log('Browser notification failed:', notifErr);
      }
    }
    
    // Dispatch custom event to refresh notifications in all dashboards
    window.dispatchEvent(new CustomEvent('newEventCreated', { detail: { event } }));
  } catch (err) {
    console.error('Error creating notifications for new event:', err);
  }
}