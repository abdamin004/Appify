import React, { useEffect, useState } from 'react';
import userService from '../../services/userService';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await userService.listUsers();
      setUsers(res.users || res);
    } catch (err) {
      setError(err.message || JSON.stringify(err));
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const handleAssign = async (id, newRole) => {
    try {
      await userService.assignRole({ userId: id, role: newRole });
      load();
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
                <select defaultValue={u.role} onChange={e=>handleAssign(u._id, e.target.value)}>
                  <option>Student</option>
                  <option>Staff</option>
                  <option>TA</option>
                  <option>Professor</option>
                  <option>EventOffice</option>
                </select>
              </td>
              <td style={{ padding: 8 }}>{u.isVerified ? 'Yes' : 'No'}</td>
              <td style={{ padding: 8 }}>{u.isBlocked ? 'Yes' : 'No'}</td>
              <td style={{ padding: 8 }}>
                <button onClick={()=>handleBlock(u._id, u.isBlocked ? 'unblock' : 'block')} style={{ marginRight: 8 }}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                {['Admin','EventOffice'].includes(u.role) && (
                  <button onClick={()=>handleDeleteAdmin(u._id)} style={{ color: '#dc2626' }}>Delete Admin</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
