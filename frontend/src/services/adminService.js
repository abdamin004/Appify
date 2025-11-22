const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

async function fetchJson(url, opts = {}) {
  const token = localStorage.getItem('token') || '';
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Include status code in error for better handling
    const error = new Error(data.message || data.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.response = data;
    throw error;
  }
  return data;
}

export const deleteComment = (id) => fetchJson(`${API_BASE}/admin/delete-comment/${id}`, { method: 'DELETE' });
export const listAllComments = () => fetchJson(`${API_BASE}/admin/comments`);
export const listPendingVendorApplications = () => fetchJson(`${API_BASE}/admin/vendor-applications/pending`);
export const listApprovedVendorApplications = () => fetchJson(`${API_BASE}/admin/vendor-documents`);
export const reviewVendorApplication = (id, action, notes) => fetchJson(`${API_BASE}/admin/vendor-applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ action, notes }) });
export const listAdminNotifications = (unreadOnly = false) => fetchJson(`${API_BASE}/admin/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
export const markNotificationRead = (id) => fetchJson(`${API_BASE}/admin/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () => fetchJson(`${API_BASE}/admin/notifications/read-all`, { method: 'PATCH' });
export const listLoyaltyApplications = (status = null) => {
  const url = status ? `${API_BASE}/admin/loyalty-applications?status=${status}` : `${API_BASE}/admin/loyalty-applications`;
  return fetchJson(url);
};
export const reviewLoyaltyApplication = (id, action, notes) => fetchJson(`${API_BASE}/admin/loyalty-applications/${id}/status`, { method: 'PATCH', body: JSON.stringify({ action, notes }) });
export const getUnreadVendorNotificationsCount = (pendingOnly = false) => {
  const url = `${API_BASE}/admin/notifications/unread-count${pendingOnly ? '?pendingOnly=true' : ''}`;
  return fetchJson(url);
};

export default { listAllComments,deleteComment, listPendingVendorApplications, listApprovedVendorApplications, reviewVendorApplication, listAdminNotifications, markNotificationRead, markAllNotificationsRead, listLoyaltyApplications, reviewLoyaltyApplication, getUnreadVendorNotificationsCount };
