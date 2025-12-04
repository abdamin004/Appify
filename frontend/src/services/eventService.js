const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export { API_BASE };

// Export event registrations to Excel
export async function exportEventRegistrations(eventId) {
  const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
  if (!token) {
    throw new Error('You must be logged in to export registrations');
  }

  const response = await fetch(`${API_BASE}/admin/events/${eventId}/export-registrations`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to export registrations (${response.status})`);
  }

  // Get the filename from Content-Disposition header or use default
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `event_registrations_${eventId}.xlsx`;
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
    if (filenameMatch) {
      filename = decodeURIComponent(filenameMatch[1]);
    }
  }

  // Create blob and download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true, filename };
}

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
    } catch (_) { }
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

export function generateVendorAttendeePasses(applicationId) {
  if (!applicationId) {
    return Promise.reject(new Error('Missing vendor application id'));
  }
  return http('POST', `${API_BASE}/events/vendor-applications/${applicationId}/attendee-passes`);
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
    const histogram = [1, 2, 3, 4, 5].reduce((acc, v) => {
      acc[v] = res.filter(r => (r.rating || r.value) === v).length;
      return acc;
    }, {});
    return { average, count, ratings: res, histogram };
  }
  // New format: { success: true, averageRating: X, ratings: [...], count: X }
  const average = res.averageRating ?? res.average ?? 0;
  const count = res.count ?? (Array.isArray(res.ratings) ? res.ratings.length : 0);
  const ratings = res.ratings || [];
  const histogram = [1, 2, 3, 4, 5].reduce((acc, v) => {
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

// Favorite events functions
export function addEventToFavorites(eventId) {
  return http('POST', `${API_BASE}/events/favorites/${eventId}`);
}

export function removeEventFromFavorites(eventId) {
  return http('DELETE', `${API_BASE}/events/favorites/${eventId}`);
}

export async function getMyFavoriteEvents() {
  const res = await http('GET', `${API_BASE}/events/favorites/mine`);
  // Backend returns { success: true, count: X, events: [...] }
  return Array.isArray(res) ? res : (res?.events || []);
}

export async function getEventRecommendations() {
  const res = await http('GET', `${API_BASE}/events/recommendations`);
  
  // Handle response - recommendations might be a JSON string that needs parsing
  let eventIds = [];
  
  if (res.recommendations) {
    try {
      // If recommendations is a JSON string, parse it
      if (typeof res.recommendations === 'string') {
        eventIds = JSON.parse(res.recommendations);
      } else if (Array.isArray(res.recommendations)) {
        // If it's already an array, use it directly
        eventIds = res.recommendations;
      } else if (res.recommendations.output) {
        // If wrapped in output property
        const output = res.recommendations.output;
        if (typeof output === 'string') {
          eventIds = JSON.parse(output);
        } else if (Array.isArray(output)) {
          eventIds = output;
        }
      }
    } catch (parseErr) {
      console.error('Error parsing recommendations:', parseErr);
      return [];
    }
  }
  
  // Fetch event details for each recommended event ID
  if (eventIds.length === 0) {
    return [];
  }
  
  try {
    const eventPromises = eventIds.map(async (eventId) => {
      try {
        return await getEventById(eventId);
      } catch (err) {
        console.error(`Error fetching event ${eventId}:`, err);
        return null;
      }
    });
    
    const events = await Promise.all(eventPromises);
    // Filter out any null values (events that couldn't be fetched)
    return events.filter(event => event !== null);
  } catch (err) {
    console.error('Error fetching recommended events:', err);
    return [];
  }
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
    return uniqueWorkshops.filter(w => w.status === 'pending');
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
  return http('PUT', `${API_BASE}/events/workshops/${workshopId}/review`, { action: 'accept' });
}

export function rejectWorkshop(workshopId) {
  return http('PUT', `${API_BASE}/events/workshops/${workshopId}/review`, { action: 'reject' });
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
      createStaffNotification,
      createTaNotification,
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

    // Create separate notifications for each role
    createStudentNotification(notification);
    createStaffNotification(notification);
    createTaNotification(notification);

    // Create event office notification
    createEventOfficeNotification(notification);

    // Create notifications for all professors
    // First try to get all professors from backend (if user has admin/EventOffice permissions)
    try {
      const adminService = await import('./adminService');
      const professors = await adminService.listAllUsers('Professor');
      const professorList = Array.isArray(professors?.users) ? professors.users : (Array.isArray(professors) ? professors : []);
      
      // Create notification for each professor
      professorList.forEach(professor => {
        const professorId = String(professor._id || professor.id);
        if (professorId) {
          createProfessorNotification(professorId, notification);
        }
      });
    } catch (profErr) {
      // If backend fetch fails (e.g., user doesn't have admin permissions), 
      // fall back to localStorage method for professors who have already logged in
      console.log('Could not fetch professors from backend, trying localStorage method:', profErr);
      try {
        const allKeys = Object.keys(localStorage);
        const professorKeys = allKeys.filter(key => key.startsWith('professorNotifications_'));
        professorKeys.forEach(key => {
          const professorId = key.replace('professorNotifications_', '');
          if (professorId) {
            createProfessorNotification(professorId, notification);
          }
        });
      } catch (localStorageErr) {
        console.log('Could not create professor notifications from localStorage:', localStorageErr);
      }
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