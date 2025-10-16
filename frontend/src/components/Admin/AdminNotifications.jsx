import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listAdminNotifications();
      setNotifs(res.notifications || []);
    } catch (err) { setError(err.message || JSON.stringify(err)); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const markRead = async (id) => {
    try { await adminService.markNotificationRead(id); load(); } catch (err) { alert(err.message || JSON.stringify(err)); }
  };

  const markAll = async () => {
    if (!window.confirm('Mark ALL notifications as read?')) return;
    try { await adminService.markAllNotificationsRead(); load(); } catch (err) { alert(err.message || JSON.stringify(err)); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#003366' }}>Admin Notifications</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={markAll}>Mark all as read</button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: '#dc2626' }}>{error}</div>}
      <ul>
        {notifs.map(n => (
          <li key={n._id} style={{ marginBottom: 10, padding: 12, background: n.isRead ? '#f8fafc' : 'white', borderRadius: 8 }}>
            <div><strong>{n.type}</strong> — {n.message}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(n.createdAt).toLocaleString()}</div>
            {!n.isRead && <div style={{ marginTop: 8 }}><button onClick={()=>markRead(n._id)}>Mark read</button></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
