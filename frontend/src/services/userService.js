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

export const listUsers = (query = '') => fetchJson(`${API_BASE}/admin/users${query ? `?${query}` : ''}`);
export const createAdmin = (payload) => fetchJson(`${API_BASE}/admin/create-admin`, { method: 'POST', body: JSON.stringify(payload) });
export const assignRole = (payload) => fetchJson(`${API_BASE}/admin/assign-role`, { method: 'PUT', body: JSON.stringify(payload) });
export const blockUser = (id, action) => fetchJson(`${API_BASE}/admin/block-user/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
export const deleteAdmin = (id) => fetchJson(`${API_BASE}/admin/delete-admin/${id}`, { method: 'DELETE' });

export default { listUsers, createAdmin, assignRole, blockUser, deleteAdmin };
