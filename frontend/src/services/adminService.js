const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

async function fetchJson(url, opts = {}) {
  const token = localStorage.getItem('token') || '';
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

export const deleteComment = (id) => fetchJson(`${API_BASE}/admin/delete-comment/${id}`, { method: 'DELETE' });
export const listPendingVendorApplications = () => fetchJson(`${API_BASE}/admin/vendor-applications/pending`);
export const reviewVendorApplication = (id, action, notes) => fetchJson(`${API_BASE}/admin/vendor-applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ action, notes }) });
export const listAdminNotifications = (unreadOnly = false) => fetchJson(`${API_BASE}/admin/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
export const markNotificationRead = (id) => fetchJson(`${API_BASE}/admin/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => fetchJson(`${API_BASE}/admin/notifications/read-all`, { method: 'PATCH' });

export default { deleteComment, listPendingVendorApplications, reviewVendorApplication, listAdminNotifications, markNotificationRead, markAllNotificationsRead };
