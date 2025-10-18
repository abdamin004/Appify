const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
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
