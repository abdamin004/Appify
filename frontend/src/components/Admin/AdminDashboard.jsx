import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
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
              <Link style={linkStyle} to="/admin/notifications">Notifications</Link>
              <Link style={linkStyle} to="/admin/comments">Comment Moderation</Link>
              <Link style={linkStyle} to="/admin/view-events">View Events</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
