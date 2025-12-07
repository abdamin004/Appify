const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

async function http(method, url, body) {
  const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    // Handle 401 Unauthorized - clear token and redirect to login
    if (res.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/Login';
      }
      throw new Error('Session expired. Please login again.');
    }
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export function reserveCourt(courtId, slotId) {
  return http('POST', `${API_BASE}/courts/reserve`, { courtId, slotId });
}

export function listCourts(params = {}) {
  const qs = new URLSearchParams(params);
  return fetch(`${API_BASE}/courts?${qs.toString()}`).then(r => r.json());
}

export function myReservations() {
  return http('GET', `${API_BASE}/courts/reservations/mine`);
}

export function cancelReservation(courtId, slotId) {
  return http('DELETE', `${API_BASE}/courts/reservations/${courtId}/${slotId}`);
}

export default { reserveCourt, listCourts, myReservations, cancelReservation };

