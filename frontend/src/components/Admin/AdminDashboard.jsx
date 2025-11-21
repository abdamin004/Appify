import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoyaltyPartnersList from '../Loyalty/LoyaltyPartnersList';

export default function AdminDashboard() {
  const [showLoyalty, setShowLoyalty] = React.useState(false);
  
  const cardStyle = {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
    border: '1px solid #e5e7eb',
    padding: '28px 24px',
  };
  const linkStyle = {
    display: 'block',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
    color: '#003366',
    borderRadius: 12,
    fontWeight: 700,
    textDecoration: 'none',
    textAlign: 'center'
  };
  
  if (showLoyalty) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <button
              onClick={() => setShowLoyalty(false)}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.95)',
                color: '#003366',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '20px',
              }}
            >
              ← Back to Admin Dashboard
            </button>
            <LoyaltyPartnersList />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={cardStyle}>
            <h1 style={{ color: '#003366', marginTop: 0, marginBottom: 8 }}>Admin Dashboard</h1>
            <p style={{ color: '#6b7280', marginTop: 0 }}>Quick actions</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Link style={linkStyle} to="/admin/users">User Management</Link>
              <Link style={linkStyle} to="/admin/create">Create Admin / EventOffice</Link>
              <Link style={linkStyle} to="/admin/vendor-applications">Vendor Applications</Link>
              <Link style={linkStyle} to="/admin/loyalty-applications">Loyalty Applications</Link>
              <Link style={linkStyle} to="/admin/notifications">Notifications</Link>
              <Link style={linkStyle} to="/admin/comments">Comment Moderation</Link>
              <Link style={linkStyle} to="/admin/view-events">View Events</Link>
              <button
                onClick={() => setShowLoyalty(true)}
                style={linkStyle}
              >
                ⭐ Loyalty Partners
              </button>
import adminService from '../../services/adminService';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

const adminLinks = [
  { to: '/admin/users', label: 'User Management', icon: '👥', description: 'Manage users, roles, and permissions' },
  { to: '/admin/create', label: 'Create Account', icon: '➕', description: 'Create new admin or event office accounts' },
  { to: '/admin/vendor-applications', label: 'Vendor Applications', icon: '🏪', description: 'Review and approve vendor applications' },
  { to: '/admin/notifications', label: 'Notifications', icon: '🔔', description: 'View and manage admin notifications' },
  { to: '/admin/comments', label: 'Comment Moderation', icon: '💬', description: 'Moderate user comments on events' },
  { to: '/admin/view-events', label: 'View Events', icon: '📅', description: 'Browse and manage all events' },
  { to: '/admin/vendor-documents', label: 'Vendor Documents', icon: '📄', description: 'View and manage vendor documents' },
  { to: '/admin/attendees-report', label: 'Attendees Report', icon: '📊', description: 'View attendees reports and statistics' },
  { to: '/admin/sales-report', label: 'Sales Report', icon: '💰', description: 'View sales reports and analytics' },
];

export default function AdminDashboard() {
  const [pendingCount, setPendingCount] = useState(0);
  
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await adminService.getUnreadVendorNotificationsCount(true);
        setPendingCount(res.unreadCount || 0);
      } catch (err) {
        console.error('Failed to fetch pending vendor notifications', err);
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000); // optional refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{
            background: colors.bgCard,
            borderRadius: borderRadius['2xl'],
            boxShadow: shadows.lg,
            border: `1px solid ${colors.gray200}`,
            padding: `${spacing['4xl']} ${spacing['3xl']}`,
            marginBottom: spacing['3xl']
          }}>
            <h1 style={{ 
              color: colors.primary, 
              marginTop: 0, 
              marginBottom: spacing.sm,
              fontSize: typography.fontSize['4xl'],
              fontWeight: typography.fontWeight.bold
            }}>Admin Dashboard</h1>
            <p style={{ 
              color: colors.gray500, 
              marginTop: 0,
              fontSize: typography.fontSize.lg,
              marginBottom: spacing['3xl']
            }}>Manage your platform and oversee all activities</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: spacing.xl }}>
              {adminLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'block',
                    textDecoration: 'none',
                    background: colors.white,
                    borderRadius: borderRadius.xl,
                    padding: spacing['2xl'],
                    border: `2px solid ${colors.gray200}`,
                    transition: transitions.normal,
                    boxShadow: shadows.sm,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = shadows.lg;
                    e.currentTarget.style.borderColor = colors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = shadows.sm;
                    e.currentTarget.style.borderColor = colors.gray200;
                  }}
                >
                  <div style={{ 
                    fontSize: typography.fontSize['3xl'], 
                    marginBottom: spacing.md,
                    textAlign: 'center'
                  }}>{link.icon}</div>
                  <h3 style={{ 
                    color: colors.primary, 
                    marginTop: 0,
                    marginBottom: spacing.sm,
                    fontSize: typography.fontSize.xl,
                    fontWeight: typography.fontWeight.bold,
                    textAlign: 'center'
                  }}>
                    {link.label}
                    {link.to === '/admin/vendor-applications' && pendingCount > 0 && (
                      <span style={{ 
                        marginLeft: spacing.xs,
                        color: colors.error,
                        fontSize: typography.fontSize.base
                      }}>({pendingCount})</span>
                    )}
                  </h3>
                  <p style={{ 
                    color: colors.gray500, 
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                    textAlign: 'center',
                    lineHeight: typography.lineHeight.relaxed
                  }}>{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
