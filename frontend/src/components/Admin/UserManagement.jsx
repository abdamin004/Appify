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
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#003366' }}>User Management</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: '#dc2626' }}>{error}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Role</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Verified</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Blocked</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u=> (
            <tr key={u._id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{u.firstName} {u.lastName}</td>
              <td style={{ padding: 8 }}>{u.email}</td>
              <td style={{ padding: 8 }}>
                <select value={selectedRoles[u._id] || u.role} onChange={e=>{
                  const val = e.target.value;
                  setSelectedRoles(prev => ({ ...prev, [u._id]: val }));
                }}>
                  <option value="Student">Student</option>
                  <option value="Staff">Staff</option>
                  <option value="TA">TA</option>
                  <option value="Professor">Professor</option>
                  <option value="Admin">Admin</option>
                  <option value="EventOffice">EventOffice</option>
                </select>
              </td>
              <td style={{ padding: 8 }}>{u.isVerified ? 'Yes' : 'No'}</td>
              <td style={{ padding: 8 }}>{u.isBlocked ? 'Yes' : 'No'}</td>
              <td style={{ padding: 8 }}>
                <button onClick={()=>handleBlock(u._id, u.isBlocked ? 'unblock' : 'block')} style={{ marginRight: 8 }}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                {['Admin','EventOffice'].includes(u.role) && (
                  <button onClick={()=>handleDeleteAdmin(u._id)} style={{ color: '#dc2626', marginRight: 8 }}>Delete Admin</button>
                )}
                {/* Verify & Assign button: visible when user not verified OR selected role differs from current */}
                {(u.isVerified === false || (selectedRoles[u._id] && selectedRoles[u._id] !== u.role)) && (
                  <button onClick={()=>handleAssign(u._id, (selectedRoles[u._id] || u.role))} style={{ backgroundColor: '#0b69ff', color: '#fff', padding: '6px 10px', border: 'none', borderRadius: 4 }}>
                    Verify & Assign
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
