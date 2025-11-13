const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

async function fetchJson(url, opts = {}) {
  const token = localStorage.getItem('token') || '';
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export const requestBooth = (payload) => fetchJson(`${API_BASE}/vendor/request-booth`, { method: 'POST', body: JSON.stringify(payload) });
export const applyToEvent = (eventId, payload) => fetchJson(`${API_BASE}/vendor/events/${eventId}/applications`, { method: 'POST', body: JSON.stringify(payload) });
export const listOrganizations = () => fetchJson(`${API_BASE}/vendor/organizations`);
export const listUpcomingBazaars = () => fetchJson(`${API_BASE}/vendor/bazaars/upcoming`);
export const listUpcomingBooths = () => fetchJson(`${API_BASE}/vendor/booths/upcoming`);
export const cancelVendorApplication = (applicationId) => fetchJson(`${API_BASE}/vendor/vendor-applications/${applicationId}/cancel`, { method: 'POST' });
export const deleteVendorApplication = (applicationId) => fetchJson(`${API_BASE}/vendor/vendor-applications/${applicationId}`, { method: 'DELETE' });
export const applyToLoyaltyProgram = (payload) => fetchJson(`${API_BASE}/vendor/loyalty/apply`, { method: 'POST', body: JSON.stringify(payload) });
export const listMyLoyaltyApplications = () => fetchJson(`${API_BASE}/vendor/loyalty/mine`);
export const cancelLoyaltyApplication = (applicationId) => fetchJson(`${API_BASE}/vendor/loyalty/${applicationId}/cancel`, { method: 'POST' });
export const deleteLoyaltyApplication = (applicationId) => fetchJson(`${API_BASE}/vendor/loyalty/${applicationId}`, { method: 'DELETE' });

const vendorService = { 
  requestBooth, 
  applyToEvent, 
  listOrganizations, 
  listUpcomingBazaars, 
  listUpcomingBooths,
  cancelVendorApplication,
  deleteVendorApplication,
  applyToLoyaltyProgram,
  listMyLoyaltyApplications,
  cancelLoyaltyApplication,
  deleteLoyaltyApplication
};
export default vendorService;
