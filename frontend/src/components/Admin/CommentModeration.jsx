import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

export default function CommentModeration() {
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listAllComments();
      setComments(res.comments || res);
    } catch (err) {
      const errorMsg = err?.message || 'Failed to load comments';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog('Are you sure you want to delete this comment?', 'Delete Comment');
    if (!confirmed) return;
    try {
      await adminService.deleteComment(id);
      showToast.success('Comment deleted successfully');
      load();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to delete comment';
      setError(errorMsg);
      showToast.error(errorMsg);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'] }}>
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
            }}>Comment Moderation</h2>
          </div>
          {loading && <div style={{ color: colors.gray500, fontSize: typography.fontSize.base }}>Loading comments...</div>}
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

          <div style={{ marginTop: spacing.lg }}>
            {!loading && !error && comments.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: spacing['5xl'],
                color: colors.gray500
              }}>
                <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.lg }}>💬</div>
                <h3 style={{
                  color: colors.primary,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold,
                  marginBottom: spacing.sm
                }}>No Comments</h3>
                <p style={{
                  fontSize: typography.fontSize.base,
                  color: colors.gray500,
                  margin: 0
                }}>There are no comments to moderate at this time.</p>
              </div>
            )}
            {!loading && comments.length > 0 && comments.map(c => (
              <div key={c._id} style={{ 
                border: `1px solid ${colors.gray200}`, 
                padding: spacing.lg, 
                marginBottom: spacing.md, 
                borderRadius: borderRadius.xl, 
                background: colors.white,
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
                  fontSize: typography.fontSize.sm, 
                  color: colors.gray700,
                  marginBottom: spacing.sm
                }}>
                  <strong style={{ color: colors.primary }}>{c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Unknown user'}</strong> on <em style={{ color: colors.gray500 }}>{c.event ? c.event.title : 'Unknown event'}</em>
                </div>
                <div style={{ 
                  marginTop: spacing.sm, 
                  color: colors.gray800,
                  fontSize: typography.fontSize.base,
                  lineHeight: typography.lineHeight.relaxed
                }}>{c.content}</div>
                <div style={{ marginTop: spacing.md }}>
                  <button 
                    onClick={()=>handleDelete(c._id)} 
                    style={{ 
                      ...buttonStyles.outline,
                      backgroundColor: colors.error,
                      color: colors.white,
                      borderColor: colors.error,
                      padding: `${spacing.sm} ${spacing.lg}`,
                      fontSize: typography.fontSize.sm
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = colors.error;
                      e.target.style.opacity = 0.9;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = colors.error;
                      e.target.style.opacity = 1;
                    }}
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
