import React from 'react';
import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

const adminLinks = [
  { to: '/admin/users', label: 'User Management', icon: '👥', description: 'Manage users, roles, and permissions' },
  { to: '/admin/create', label: 'Create Account', icon: '➕', description: 'Create new admin or event office accounts' },
  { to: '/admin/vendor-applications', label: 'Vendor Applications', icon: '🏪', description: 'Review and approve vendor applications' },
  { to: '/admin/notifications', label: 'Notifications', icon: '🔔', description: 'View and manage admin notifications' },
  { to: '/admin/comments', label: 'Comment Moderation', icon: '💬', description: 'Moderate user comments on events' },
  { to: '/admin/view-events', label: 'View Events', icon: '📅', description: 'Browse and manage all events' },
];

export default function AdminDashboard() {
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
                  }}>{link.label}</h3>
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
