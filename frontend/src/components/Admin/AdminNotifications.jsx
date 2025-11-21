import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listAdminNotifications();
      // Handle different response formats
      const notifications = Array.isArray(res) ? res : (res?.notifications || []);
      setNotifs(notifications);
      // Clear any previous errors if we got a valid response
      setError(null);
    } catch (err) { 
      // If backend route doesn't exist (404) or not implemented, show empty state gracefully
      const status = err?.status || (err?.response?.status);
      const errorMsg = err?.message || err?.error || 'Failed to load notifications';
      
      if (status === 404 || errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('No notifications')) {
        // Backend route not implemented yet - show empty state instead of error
        setError(null);
        setNotifs([]);
      } else {
        // Real error - show it
        setError(errorMsg);
        showToast.error(errorMsg);
      }
    }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const markRead = async (id) => {
    try { 
      await adminService.markNotificationRead(id); 
      load(); 
      showToast.success('Notification marked as read');
    } catch (err) { 
      showToast.error(err.message || 'Failed to mark notification as read');
    }
  };

  const markAll = async () => {
    const confirmed = await confirmDialog('Mark ALL notifications as read?', 'Confirm');
    if (!confirmed) return;
    try { 
      await adminService.markAllNotificationsRead(); 
      load(); 
      showToast.success('All notifications marked as read');
    } catch (err) { 
      showToast.error(err.message || 'Failed to mark all notifications as read');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'] }}>
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
            }}>Admin Notifications</h2>
          </div>
          {notifs.length > 0 && (
            <div style={{ marginBottom: spacing.lg }}>
              <button 
                onClick={markAll} 
                style={{ 
                  ...buttonStyles.primary,
                  padding: `${spacing.md} ${spacing.xl}`
                }}
              >Mark all as read</button>
            </div>
          )}
          {loading && (
            <div style={{ 
              color: colors.gray500, 
              fontSize: typography.fontSize.base,
              textAlign: 'center',
              padding: spacing['3xl']
            }}>Loading notifications...</div>
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
          {!loading && !error && notifs.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: spacing['5xl'],
              color: colors.gray500
            }}>
              <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.lg }}>🔔</div>
              <h3 style={{
                color: colors.primary,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.sm
              }}>No Notifications</h3>
              <p style={{
                fontSize: typography.fontSize.base,
                color: colors.gray500,
                margin: 0
              }}>You don't have any notifications at this time.</p>
            </div>
          )}
          {!loading && notifs.length > 0 && (
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {notifs.map(n => (
              <li key={n._id} style={{ 
                marginBottom: spacing.lg, 
                padding: spacing.lg, 
                background: n.isRead ? colors.gray50 : colors.white, 
                borderRadius: borderRadius.xl, 
                border: `1px solid ${colors.gray200}`,
                transition: transitions.fast
              }}
              onMouseEnter={(e) => {
                if (!n.isRead) {
                  e.currentTarget.style.boxShadow = shadows.md;
                  e.currentTarget.style.borderColor = colors.accent;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = colors.gray200;
              }}
              >
                <div style={{ 
                  color: colors.primary, 
                  fontWeight: typography.fontWeight.bold,
                  fontSize: typography.fontSize.base,
                  marginBottom: spacing.xs
                }}>{n.type}</div>
                <div style={{ 
                  color: colors.gray800, 
                  marginTop: spacing.xs,
                  fontSize: typography.fontSize.base,
                  lineHeight: typography.lineHeight.relaxed
                }}>{n.message}</div>
                <div style={{ 
                  fontSize: typography.fontSize.xs, 
                  color: colors.gray500, 
                  marginTop: spacing.sm 
                }}>{new Date(n.createdAt).toLocaleString()}</div>
                {!n.isRead && (
                  <div style={{ marginTop: spacing.md }}>
                    <button 
                      onClick={()=>markRead(n._id)} 
                      style={{ 
                        ...buttonStyles.secondary,
                        padding: `${spacing.sm} ${spacing.lg}`,
                        fontSize: typography.fontSize.sm
                      }}
                    >Mark read</button>
                  </div>
                )}
              </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
