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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', background: 'rgba(255,255,255,0.95)', borderRadius: 20, boxShadow: '0 8px 25px rgba(0,0,0,0.3)', padding: 24 }}>
          <h2 style={{ color: '#003366', marginTop: 0 }}>Admin Notifications</h2>
          <div style={{ marginBottom: 12 }}>
            <button onClick={markAll} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#d4af37', color: '#003366', fontWeight: 700 }}>Mark all as read</button>
          </div>
          {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
          {error && <div style={{ color: '#dc2626' }}>{error}</div>}
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {notifs.map(n => (
              <li key={n._id} style={{ marginBottom: 12, padding: 12, background: n.isRead ? '#f8fafc' : '#ffffff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ color: '#003366', fontWeight: 700 }}>{n.type}</div>
                <div style={{ color: '#111827', marginTop: 4 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                {!n.isRead && (
                  <div style={{ marginTop: 8 }}>
                    <button onClick={()=>markRead(n._id)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#0b69ff', color: '#fff', fontWeight: 700 }}>Mark read</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
