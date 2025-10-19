import React, { useEffect, useState } from 'react';
import userService from '../../services/userService';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});

  const normalizeRole = (r) => {
    if (!r) return r;
    const s = String(r).trim();
    // map common lowercase inputs to backend-expected casing
    const map = {
      'student': 'Student',
      'staff': 'Staff',
      'ta': 'TA',
      't.a.': 'TA',
      'professor': 'Professor',
      'admin': 'Admin',
      'eventoffice': 'EventOffice',
      'event office': 'EventOffice'
    };
    const key = s.replace(/\s+/g,'').toLowerCase();
    return map[key] || s;
  };

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await userService.listUsers();
      const u = res.users || res;
      setUsers(u);
      // initialize selectedRoles map
      const map = {};
  // normalize roles to match backend expected casing
  (u || []).forEach(user => { map[user._id] = normalizeRole(user.role); });
      setSelectedRoles(map);
    } catch (err) {
      setError(err.message || JSON.stringify(err));
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const handleAssign = async (id, newRole) => {
    try {
      const roleToSend = normalizeRole(newRole);
      await userService.assignRole({ userId: id, role: roleToSend });
      // reflect change locally
      setUsers(prev => prev.map(u => u._id === id ? { ...u, role: roleToSend, isVerified: true } : u));
      setSelectedRoles(prev => ({ ...prev, [id]: roleToSend }));
    } catch (err) { alert(err.message || JSON.stringify(err)); }
  };

  const handleBlock = async (id, action) => {
    try {
      await userService.blockUser(id, action);
      load();
    } catch (err) { alert(err.message || JSON.stringify(err)); }
  };

  const handleDeleteAdmin = async (id) => {
    if (!window.confirm('Delete this admin account?')) return;
    try {
      await userService.deleteAdmin(id);
      load();
    } catch (err) { alert(err.message || JSON.stringify(err)); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: 'rgba(255,255,255,0.95)', borderRadius: 20, boxShadow: '0 8px 25px rgba(0,0,0,0.3)', padding: 24 }}>
      <h2 style={{ color: '#003366', marginTop: 0 }}>User Management</h2>
      {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
      {error && <div style={{ color: '#dc2626' }}>{error}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 10, color: '#6b7280', fontWeight: 700 }}>Name</th>
            <th style={{ textAlign: 'left', padding: 10, color: '#6b7280', fontWeight: 700 }}>Email</th>
            <th style={{ textAlign: 'left', padding: 10, color: '#6b7280', fontWeight: 700 }}>Role</th>
            <th style={{ textAlign: 'left', padding: 10, color: '#6b7280', fontWeight: 700 }}>Verified</th>
            <th style={{ textAlign: 'left', padding: 10, color: '#6b7280', fontWeight: 700 }}>Blocked</th>
            <th style={{ textAlign: 'left', padding: 10, color: '#6b7280', fontWeight: 700 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u=> (
            <tr key={u._id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{u.firstName} {u.lastName}</td>
              <td style={{ padding: 10 }}>{u.email}</td>
              <td style={{ padding: 10 }}>
                <select value={selectedRoles[u._id] || u.role} onChange={e=>{
                  const val = e.target.value;
                  setSelectedRoles(prev => ({ ...prev, [u._id]: val }));
                }} style={{ padding: 6, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                  <option value="TA">TA</option>
                  <option value="Professor">Professor</option>
                  <option value="Admin">Admin</option>
                  <option value="EventOffice">EventOffice</option>
                </select>
              </td>
              <td style={{ padding: 10 }}>{u.isVerified ? 'Yes' : 'No'}</td>
              <td style={{ padding: 10 }}>{u.isBlocked ? 'Yes' : 'No'}</td>
              <td style={{ padding: 10 }}>
                <button onClick={()=>handleBlock(u._id, u.isBlocked ? 'unblock' : 'block')} style={{ marginRight: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: u.isBlocked ? '#10b981' : '#f59e0b', color: '#fff', fontWeight: 600 }}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                {['Admin','EventOffice'].includes(u.role) && (
                  <button onClick={()=>handleDeleteAdmin(u._id)} style={{ color: '#fff', background: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: 8, marginRight: 8, fontWeight: 600 }}>
                    {u.role === 'EventOffice' ? 'Delete Event Office' : 'Delete Admin'}
                  </button>
                )}
                {/* Verify & Assign button: visible when user not verified OR selected role differs from current */}
                {(u.isVerified === false || (selectedRoles[u._id] && selectedRoles[u._id] !== u.role)) && (
                  <button onClick={()=>handleAssign(u._id, (selectedRoles[u._id] || u.role))} style={{ backgroundColor: '#0b69ff', color: '#fff', padding: '6px 10px', border: 'none', borderRadius: 8, fontWeight: 700 }}>
                    Verify & Assign
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      </div>
    </div>
  );
}
