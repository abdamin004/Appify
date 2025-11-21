import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

export default function VendorApplications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listPendingVendorApplications();
      setApps(res.applications || []);
    } catch (err) { 
      const errorMsg = err?.message || 'Failed to load vendor applications';
      setError(errorMsg);
      showToast.error(errorMsg);
    }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const handleReview = async (id, action) => {
    const notes = window.prompt('Optional notes (enter to skip)');
    try {
      await adminService.reviewVendorApplication(id, action, notes);
      showToast.success(`Vendor application ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      load();
    } catch (err) { 
      const errorMsg = err?.message || 'Failed to review application';
      showToast.error(errorMsg);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'] }}>
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
            }}>Pending Vendor Applications</h2>
          </div>
          {loading && (
            <div style={{ 
              color: colors.gray500, 
              fontSize: typography.fontSize.base,
              textAlign: 'center',
              padding: spacing['3xl']
            }}>Loading applications...</div>
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
          {!loading && !error && apps.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: spacing['5xl'],
              color: colors.gray500
            }}>
              <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.lg }}>🏪</div>
              <h3 style={{
                color: colors.primary,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.sm
              }}>No Pending Applications</h3>
              <p style={{
                fontSize: typography.fontSize.base,
                color: colors.gray500,
                margin: 0
              }}>There are no pending vendor applications at this time.</p>
            </div>
          )}
          {!loading && apps.length > 0 && (
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {apps.map(a => (
                <li key={a._id} style={{ 
                  marginBottom: spacing.lg, 
                  padding: spacing.xl, 
                  background: colors.white, 
                  borderRadius: borderRadius.xl, 
                  border: `1px solid ${colors.gray200}`,
                  transition: transitions.fast
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = shadows.md;
                  e.currentTarget.style.borderColor = colors.accent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = colors.gray200;
                }}
                >
                  <div style={{ 
                    color: colors.primary, 
                    fontWeight: typography.fontWeight.bold,
                    fontSize: typography.fontSize.lg,
                    marginBottom: spacing.sm
                  }}>
                    {a.event?.title} <span style={{ color: colors.gray500, fontWeight: typography.fontWeight.normal }}>({a.event?.type})</span>
                  </div>
                  <div style={{ color: colors.gray700, marginTop: spacing.xs, fontSize: typography.fontSize.base }}>
                    <strong>Organization:</strong> {a.organization?.name || 'N/A'}
                  </div>
                  <div style={{ color: colors.gray700, marginTop: spacing.xs, fontSize: typography.fontSize.base }}>
                    <strong>Vendor Email:</strong> {a.vendorUser?.email || 'N/A'}
                  </div>
                  <div style={{ marginTop: spacing.lg, display: 'flex', gap: spacing.sm }}>
                    <button 
                      onClick={()=>handleReview(a._id, 'approve')} 
                      style={{ 
                        ...buttonStyles.primary,
                        background: colors.success,
                        color: colors.white,
                        borderColor: colors.success,
                        padding: `${spacing.sm} ${spacing.lg}`,
                        fontSize: typography.fontSize.sm
                      }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={()=>handleReview(a._id, 'reject')} 
                      style={{ 
                        ...buttonStyles.outline,
                        background: colors.error,
                        color: colors.white,
                        borderColor: colors.error,
                        padding: `${spacing.sm} ${spacing.lg}`,
                        fontSize: typography.fontSize.sm
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
