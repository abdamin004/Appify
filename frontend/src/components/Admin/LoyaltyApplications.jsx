import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';

export default function LoyaltyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listLoyaltyApplications(filter === 'all' ? null : filter);
      setApps(res.applications || []);
    } catch (err) {
      setError(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleReview = async (id, action) => {
    const notes = window.prompt('Optional notes/reason (press Enter to skip):');
    try {
      await adminService.reviewLoyaltyApplication(id, action, notes || '');
      alert(`Application ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      load();
    } catch (err) {
      alert(err.message || JSON.stringify(err));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: '120px', padding: '120px 40px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 20, boxShadow: '0 8px 25px rgba(0,0,0,0.3)', padding: 24, marginBottom: 20 }}>
            <h2 style={{ color: '#003366', marginTop: 0, marginBottom: 20 }}>Loyalty Program Applications</h2>
            
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              {['pending', 'approved', 'rejected', 'all'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '10px 20px',
                    background: filter === f ? 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)' : 'transparent',
                    color: filter === f ? '#003366' : '#6b7280',
                    border: `2px solid ${filter === f ? '#d4af37' : '#e5e7eb'}`,
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading && <div style={{ color: '#6b7280', padding: '20px', textAlign: 'center' }}>Loading...</div>}
            {error && <div style={{ color: '#dc2626', padding: '12px', background: '#fee2e2', borderRadius: 8, marginBottom: 20 }}>{error}</div>}
            
            {!loading && !error && apps.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📋</div>
                <p>No {filter === 'all' ? '' : filter} loyalty applications found.</p>
              </div>
            )}

            {!loading && !error && apps.length > 0 && (
              <div style={{ display: 'grid', gap: 16 }}>
                {apps.map((app) => (
                  <div
                    key={app._id}
                    style={{
                      padding: 20,
                      background: '#fff',
                      borderRadius: 12,
                      border: '2px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <h3 style={{ color: '#003366', margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>
                            {app.vendorUser?.companyName || app.organization || 'Vendor'}
                          </h3>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: 6,
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              background:
                                app.status === 'approved'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : app.status === 'rejected'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(251, 191, 36, 0.15)',
                              color:
                                app.status === 'approved'
                                  ? '#22c55e'
                                  : app.status === 'rejected'
                                  ? '#ef4444'
                                  : '#f59e0b',
                            }}
                          >
                            {app.status?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                        <div style={{ color: '#374151', fontSize: '0.9rem', marginTop: 8 }}>
                          <div><strong>Organization:</strong> {app.organization}</div>
                          <div style={{ marginTop: 4 }}><strong>Vendor Email:</strong> {app.vendorUser?.email || 'N/A'}</div>
                          <div style={{ marginTop: 4 }}>
                            <strong>Discount Rate:</strong>{' '}
                            <span style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>{app.discountRate}%</span>
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <strong>Promo Code:</strong>{' '}
                            <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700 }}>
                              {app.promoCode}
                            </code>
                          </div>
                          {app.termsAndConditions && (
                            <details style={{ marginTop: 12 }}>
                              <summary style={{ cursor: 'pointer', color: '#003366', fontWeight: 600 }}>
                                Terms & Conditions
                              </summary>
                              <div
                                style={{
                                  marginTop: 8,
                                  padding: 12,
                                  background: '#f9fafb',
                                  borderRadius: 6,
                                  whiteSpace: 'pre-wrap',
                                  fontSize: '0.9rem',
                                  color: '#374151',
                                }}
                              >
                                {app.termsAndConditions}
                              </div>
                            </details>
                          )}
                          {app.createdAt && (
                            <div style={{ marginTop: 8, color: '#9ca3af', fontSize: '0.85rem' }}>
                              Applied: {new Date(app.createdAt).toLocaleString()}
                            </div>
                          )}
                          {app.reviewedAt && (
                            <div style={{ marginTop: 4, color: '#9ca3af', fontSize: '0.85rem' }}>
                              Reviewed: {new Date(app.reviewedAt).toLocaleString()}
                            </div>
                          )}
                          {app.notes && (
                            <div style={{ marginTop: 8, padding: 8, background: '#fef3c7', borderRadius: 6, fontSize: '0.85rem' }}>
                              <strong>Review Notes:</strong> {app.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {app.status === 'pending' && (
                      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => handleReview(app._id, 'approve')}
                          style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReview(app._id, 'reject')}
                          style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            border: 'none',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                          }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

