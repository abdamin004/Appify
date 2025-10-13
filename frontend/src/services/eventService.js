const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const jsonHeaders = { 'Content-Type': 'application/json' };

async function http(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: jsonHeaders,
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

// Create helpers
export function createBazaar(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Bazaar' });
}
export function createTrip(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Trip' });
}
export function createWorkshop(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Workshop' });
}

export function createConference(payload) {
  return http('POST', `${API_BASE}/events/create`, { ...payload, type: 'Conference' });
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
