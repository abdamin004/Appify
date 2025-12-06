import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../../services/userService';
import { showToast, confirmDialog } from '../../utils/toast';


const DEFAULT_ADMIN_EMAIL = 'admin@guc.edu.eg';

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});

  const isDefaultAdmin = (user) => {
    return user.email === DEFAULT_ADMIN_EMAIL || user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
  };

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
    const key = s.replace(/\s+/g, '').toLowerCase();
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
      const errorMsg = err?.message || 'Failed to load users';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAssign = async (id, newRole) => {
    const user = users.find(u => u._id === id);
    if (user && isDefaultAdmin(user)) {
      showToast.error('Cannot change the role of the default admin account');
      return;
    }
    // Prevent resending verification email if already sent for the same role
    const roleToSend = normalizeRole(newRole);
    if (user && user.verificationTokenSent && !user.isVerified && user.role === roleToSend) {
      showToast.error('Verification email already sent for this role. User must verify their email first.');
      return;
    }
    try {
      const response = await userService.assignRole({ userId: id, role: roleToSend });
      // Update user with response data
      setUsers(prev => prev.map(u => {
        if (u._id === id) {
          return {
            ...u,
            role: roleToSend,
            isVerified: response.user?.isVerified ?? u.isVerified,
            verificationTokenSent: response.user?.verificationTokenSent ?? u.verificationTokenSent
          };
        }
        return u;
      }));
      setSelectedRoles(prev => ({ ...prev, [id]: roleToSend }));
      showToast.success(response.message || 'Role assigned successfully');
      // Reload to get latest data
      load();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to assign role';
      showToast.error(errorMsg);
    }
  };

  const handleBlock = async (id, action) => {
    const user = users.find(u => u._id === id);
    if (user && isDefaultAdmin(user)) {
      showToast.error('Cannot block the default admin account');
      return;
    }
    try {
      await userService.blockUser(id, action);
      showToast.success(`User ${action === 'block' ? 'blocked' : 'unblocked'} successfully`);
      load();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to update user status';
      showToast.error(errorMsg);
    }
  };

  const handleDeleteAdmin = async (id) => {
    const user = users.find(u => u._id === id);
    if (user && isDefaultAdmin(user)) {
      showToast.error('Cannot delete the default admin account');
      return;
    }
    const confirmed = await confirmDialog('Are you sure you want to delete this admin account?', 'Delete Admin');
    if (!confirmed) return;
    try {
      await userService.deleteAdmin(id);
      showToast.success('Admin account deleted successfully');
      load();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to delete admin account';
      showToast.error(errorMsg);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 mt-1">Manage user roles, permissions, and account status.</p>
      </div>

      {/* Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading && (
          <div className="p-12 text-center text-slate-500">
            <span className="loading loading-spinner loading-md text-emerald-600 mb-2"></span>
            <p>Loading users...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">No Users Found</h3>
            <p>There are no users in the system yet.</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Blocked</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map(u => {
                  const isDefault = isDefaultAdmin(u);
                  return (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">{u.firstName} {u.lastName}</td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <select
                            value={selectedRoles[u._id] || u.role}
                            onChange={e => {
                              const val = e.target.value;
                              setSelectedRoles(prev => ({ ...prev, [u._id]: val }));
                            }}
                            disabled={isDefault}
                            className={`select select-bordered select-sm w-full max-w-xs bg-white border-slate-300 text-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20 ${isDefault ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <option value="Student">Student</option>
                            <option value="Staff">Staff</option>
                            <option value="TA">TA</option>
                            <option value="Professor">Professor</option>
                            <option value="Admin">Admin</option>
                            <option value="EventOffice">EventOffice</option>
                          </select>
                          {isDefault && (
                            <span className="text-xs text-slate-400">Default admin</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.isVerified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Verified
                          </span>
                        ) : u.verificationTokenSent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            Email Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            Not Verified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isBlocked
                          ? 'bg-red-100 text-red-800'
                          : 'bg-emerald-100 text-emerald-800'
                          }`}>
                          {u.isBlocked ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isDefault && (
                            <button
                              onClick={() => handleBlock(u._id, u.isBlocked ? 'unblock' : 'block')}
                              className={`btn btn-xs ${u.isBlocked ? 'btn-success text-white' : 'btn-warning text-white'}`}
                            >
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                          )}

                          {['Admin', 'EventOffice'].includes(u.role) && !isDefault && (
                            <button
                              onClick={() => handleDeleteAdmin(u._id)}
                              className="btn btn-xs btn-error text-white"
                            >
                              Delete
                            </button>
                          )}

                          {!isDefault && (() => {
                            const selectedRole = selectedRoles[u._id] || u.role;
                            const roleChanged = selectedRoles[u._id] && selectedRoles[u._id] !== u.role;
                            const isChangingFromStudent = u.role === 'Student' && selectedRole !== 'Student';
                            const shouldShow = (selectedRole !== 'Student' || isChangingFromStudent) &&
                              (u.isVerified === false || roleChanged);
                            return shouldShow;
                          })() && (
                              <button
                                onClick={() => handleAssign(u._id, (selectedRoles[u._id] || u.role))}
                                disabled={u.verificationTokenSent && !u.isVerified && (selectedRoles[u._id] || u.role) === u.role}
                                className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                title={u.verificationTokenSent && !u.isVerified && (selectedRoles[u._id] || u.role) === u.role ? 'Verification email already sent.' : ''}
                              >
                                Verify & Assign
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
