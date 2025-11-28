import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../../services/userService';
import { showToast, confirmDialog } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../utils/designSystem';

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
      const errorMsg = err?.message || 'Failed to load users';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

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
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'] }}>
          <div style={{ 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: spacing.xl
          }}>
            <button
              onClick={() => navigate('/Admin')}
              style={{
                ...buttonStyles.back,
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                background: colors.bgCard,
                color: colors.primary,
                borderColor: colors.primary
              }}
              onMouseEnter={(e) => {
                e.target.style.background = colors.accent;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.accent;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = colors.bgCard;
                e.target.style.color = colors.primary;
                e.target.style.borderColor = colors.primary;
              }}
            >
              ← Back
            </button>
            <h2 style={{ 
              color: colors.primary, 
              margin: 0,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              textAlign: 'center',
              textDecoration: 'underline',
              textDecorationColor: colors.primary,
              textUnderlineOffset: '4px'
            }}>User Management</h2>
          </div>
          {loading && (
            <div style={{ 
              color: colors.gray500, 
              fontSize: typography.fontSize.base,
              textAlign: 'center',
              padding: spacing['3xl']
            }}>Loading users...</div>
          )}
          {error && !loading && (
            <div style={{ 
              color: colors.error, 
              background: colors.errorLight,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.sm
            }}>{error}</div>
          )}
          {!loading && !error && users.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: spacing['5xl'],
              color: colors.gray500
            }}>
              <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.lg }}>👥</div>
              <h3 style={{
                color: colors.primary,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.sm
              }}>No Users Found</h3>
              <p style={{
                fontSize: typography.fontSize.base,
                color: colors.gray500,
                margin: 0
              }}>There are no users in the system yet.</p>
            </div>
          )}
          {!loading && users.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: colors.gray50 }}>
                    <th style={{ textAlign: 'left', padding: spacing.md, color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>Name</th>
                    <th style={{ textAlign: 'left', padding: spacing.md, color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>Email</th>
                    <th style={{ textAlign: 'left', padding: spacing.md, color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>Role</th>
                    <th style={{ textAlign: 'left', padding: spacing.md, color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>Verified</th>
                    <th style={{ textAlign: 'left', padding: spacing.md, color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>Blocked</th>
                    <th style={{ textAlign: 'left', padding: spacing.md, color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.sm }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isDefault = isDefaultAdmin(u);
                    return (
                      <tr key={u._id} style={{ borderTop: `1px solid ${colors.gray200}` }}>
                        <td style={{ padding: spacing.md, fontSize: typography.fontSize.base }}>{u.firstName} {u.lastName}</td>
                        <td style={{ padding: spacing.md, fontSize: typography.fontSize.base }}>{u.email}</td>
                        <td style={{ padding: spacing.md }}>
                          <select 
                            value={selectedRoles[u._id] || u.role} 
                            onChange={e=>{
                              const val = e.target.value;
                              setSelectedRoles(prev => ({ ...prev, [u._id]: val }));
                            }} 
                            disabled={isDefault}
                            style={{ 
                              ...inputStyles.base,
                              padding: `${spacing.xs} ${spacing.sm}`,
                              fontSize: typography.fontSize.sm,
                              cursor: isDefault ? 'not-allowed' : 'pointer',
                              opacity: isDefault ? 0.6 : 1
                            }}
                          >
                            <option value="Student">Student</option>
                            <option value="Staff">Staff</option>
                            <option value="TA">TA</option>
                            <option value="Professor">Professor</option>
                            <option value="Admin">Admin</option>
                            <option value="EventOffice">EventOffice</option>
                          </select>
                          {isDefault && (
                            <div style={{ fontSize: typography.fontSize.xs, color: colors.gray500, marginTop: spacing.xs }}>
                              Default admin
                            </div>
                          )}
                        </td>
                        <td style={{ padding: spacing.md, fontSize: typography.fontSize.base }}>
                          {u.isVerified ? (
                            <span style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.md,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                              background: colors.successLight,
                              color: colors.success
                            }}>
                              Verified
                            </span>
                          ) : u.verificationTokenSent ? (
                            <span style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.md,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                              background: colors.warningLight || '#FEF3C7',
                              color: colors.warning || '#D97706'
                            }}>
                              Email Sent, Not Verified
                            </span>
                          ) : (
                            <span style={{
                              padding: `${spacing.xs} ${spacing.sm}`,
                              borderRadius: borderRadius.md,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                              background: colors.gray100,
                              color: colors.gray600
                            }}>
                              Not Verified
                            </span>
                          )}
                        </td>
                        <td style={{ padding: spacing.md, fontSize: typography.fontSize.base }}>
                          <span style={{
                            padding: `${spacing.xs} ${spacing.sm}`,
                            borderRadius: borderRadius.md,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.semibold,
                            background: u.isBlocked ? colors.errorLight : colors.successLight,
                            color: u.isBlocked ? colors.error : colors.success
                          }}>
                            {u.isBlocked ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{ padding: spacing.md }}>
                          <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
                            {!isDefault && (
                              <button 
                                onClick={()=>handleBlock(u._id, u.isBlocked ? 'unblock' : 'block')} 
                                style={{ 
                                  ...buttonStyles.outline,
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  fontSize: typography.fontSize.xs,
                                  background: u.isBlocked ? colors.success : colors.warning,
                                  color: colors.white,
                                  borderColor: u.isBlocked ? colors.success : colors.warning
                                }}
                              >
                                {u.isBlocked ? 'Unblock' : 'Block'}
                              </button>
                            )}
                            {['Admin','EventOffice'].includes(u.role) && !isDefault && (
                              <button 
                                onClick={()=>handleDeleteAdmin(u._id)} 
                                style={{ 
                                  ...buttonStyles.outline,
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  fontSize: typography.fontSize.xs,
                                  background: colors.error,
                                  color: colors.white,
                                  borderColor: colors.error
                                }}
                              >
                                {u.role === 'EventOffice' ? 'Delete Event Office' : 'Delete Admin'}
                              </button>
                            )}
                            {/* Verify & Assign button: visible when user not verified OR selected role differs from current */}
                            {/* Not shown if current role is Student AND no role change is selected (students get verification email on signup) */}
                            {/* Shown if role is being changed FROM Student TO Staff/TA/Professor */}
                            {!isDefault && (() => {
                              const selectedRole = selectedRoles[u._id] || u.role;
                              const roleChanged = selectedRoles[u._id] && selectedRoles[u._id] !== u.role;
                              const isChangingFromStudent = u.role === 'Student' && selectedRole !== 'Student';
                              const shouldShow = (selectedRole !== 'Student' || isChangingFromStudent) && 
                                                (u.isVerified === false || roleChanged);
                              return shouldShow;
                            })() && (
                              <button 
                                onClick={()=>handleAssign(u._id, (selectedRoles[u._id] || u.role))} 
                                disabled={u.verificationTokenSent && !u.isVerified && (selectedRoles[u._id] || u.role) === u.role}
                                style={{ 
                                  ...buttonStyles.primary,
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  fontSize: typography.fontSize.xs,
                                  opacity: (u.verificationTokenSent && !u.isVerified && (selectedRoles[u._id] || u.role) === u.role) ? 0.5 : 1,
                                  cursor: (u.verificationTokenSent && !u.isVerified && (selectedRoles[u._id] || u.role) === u.role) ? 'not-allowed' : 'pointer'
                                }}
                                title={u.verificationTokenSent && !u.isVerified && (selectedRoles[u._id] || u.role) === u.role ? 'Verification email already sent for this role. User must verify their email first.' : ''}
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
    </div>
  );
}
