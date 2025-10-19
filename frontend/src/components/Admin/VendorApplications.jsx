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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: 'rgba(255,255,255,0.95)', borderRadius: 20, boxShadow: '0 8px 25px rgba(0,0,0,0.3)', padding: 24 }}>
          <h2 style={{ color: '#003366', marginTop: 0 }}>Pending Vendor Applications</h2>
          {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
          {error && <div style={{ color: '#dc2626' }}>{error}</div>}
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {apps.map(a => (
              <li key={a._id} style={{ marginBottom: 12, padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ color: '#003366', fontWeight: 700 }}>{a.event?.title} <span style={{ color: '#6b7280', fontWeight: 500 }}>({a.event?.type})</span></div>
                <div style={{ color: '#374151', marginTop: 4 }}><strong>Organization:</strong> {a.organization?.name}</div>
                <div style={{ color: '#374151', marginTop: 2 }}><strong>Vendor Email:</strong> {a.vendorUser?.email}</div>
                <div style={{ marginTop: 10 }}>
                  <button onClick={()=>handleReview(a._id, 'approve')} style={{ marginRight: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700 }}>Approve</button>
                  <button onClick={()=>handleReview(a._id, 'reject')} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700 }}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
