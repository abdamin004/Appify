import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

export default function LoyaltyApplications() {
  const navigate = useNavigate();
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
      showToast.success(`Application ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      load();
    } catch (err) {
      showToast.error(err.message || 'Failed to review application');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'], marginBottom: spacing.xl }}>
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
              }}>Loyalty Program Applications</h2>
            </div>
            
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.xl, flexWrap: 'wrap' }}>
              {['pending', 'approved', 'rejected', 'all'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: `${spacing.sm} ${spacing.lg}`,
                    background: filter === f ? `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)` : 'transparent',
                    color: filter === f ? colors.primary : colors.gray500,
                    border: `2px solid ${filter === f ? colors.accent : colors.gray200}`,
                    borderRadius: borderRadius.md,
                    fontWeight: typography.fontWeight.bold,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    fontSize: typography.fontSize.sm,
                    transition: transitions.fast
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading && (
              <div style={{ 
                color: colors.gray500, 
                fontSize: typography.fontSize.base,
                textAlign: 'center',
                padding: spacing['3xl']
              }}>Loading...</div>
            )}
            {error && (
              <div style={{ 
                color: colors.error, 
                background: colors.errorLight,
                padding: spacing.md,
                borderRadius: borderRadius.md,
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.sm
              }}>{error}</div>
            )}
            
            {!loading && !error && apps.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: spacing['5xl'], 
                color: colors.gray500 
              }}>
                <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.lg }}>📋</div>
                <h3 style={{
                  color: colors.primary,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  marginBottom: spacing.sm
                }}>No Applications Found</h3>
                <p style={{
                  fontSize: typography.fontSize.base,
                  color: colors.gray500,
                  margin: 0
                }}>No {filter === 'all' ? '' : filter} loyalty applications found.</p>
              </div>
            )}

            {!loading && !error && apps.length > 0 && (
              <div style={{ display: 'grid', gap: spacing.lg }}>
                {apps.map((app) => (
                  <div
                    key={app._id}
                    style={{
                      padding: spacing.xl,
                      background: colors.white,
                      borderRadius: borderRadius.xl,
                      border: `2px solid ${colors.gray200}`,
                      boxShadow: shadows.sm,
                      transition: transitions.fast
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = shadows.md;
                      e.currentTarget.style.borderColor = colors.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = shadows.sm;
                      e.currentTarget.style.borderColor = colors.gray200;
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
                            ...buttonStyles.primary,
                            background: colors.success,
                            color: colors.white,
                            borderColor: colors.success,
                            padding: `${spacing.sm} ${spacing.lg}`,
                            fontSize: typography.fontSize.sm
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReview(app._id, 'reject')}
                          style={{
                            ...buttonStyles.outline,
                            background: colors.error,
                            color: colors.white,
                            borderColor: colors.error,
                            padding: `${spacing.sm} ${spacing.lg}`,
                            fontSize: typography.fontSize.sm
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

