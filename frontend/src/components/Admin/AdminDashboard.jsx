import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: '#003366' }}>Admin Dashboard</h1>
      <p>Quick links:</p>
      <ul>
        <li><Link to="/admin/users">User Management</Link></li>
        <li><Link to="/admin/create">Create Admin / EventOffice</Link></li>
        <li><Link to="/admin/vendor-applications">Vendor Applications</Link></li>
        <li><Link to="/admin/notifications">Notifications</Link></li>
        <li><Link to="/admin/comments">Comment Moderation</Link></li>
      </ul>
    </div>
  );
}
