import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';

export default function VendorApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listPendingVendorApplications();
      setApps(res.applications || []);
    } catch (err) { setError(err.message || JSON.stringify(err)); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const handleReview = async (id, action) => {
    const notes = window.prompt('Optional notes (enter to skip)');
    try {
      await adminService.reviewVendorApplication(id, action, notes);
      load();
    } catch (err) { alert(err.message || JSON.stringify(err)); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#003366' }}>Pending Vendor Applications</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: '#dc2626' }}>{error}</div>}
      <ul>
        {apps.map(a => (
          <li key={a._id} style={{ marginBottom: 12, padding: 12, background: 'white', borderRadius: 8 }}>
            <div><strong>Event:</strong> {a.event?.title} ({a.event?.type})</div>
            <div><strong>Organization:</strong> {a.organization?.name}</div>
            <div><strong>Vendor Email:</strong> {a.vendorUser?.email}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={()=>handleReview(a._id, 'approve')} style={{ marginRight: 8 }}>Approve</button>
              <button onClick={()=>handleReview(a._id, 'reject')}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
