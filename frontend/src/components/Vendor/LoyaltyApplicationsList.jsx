import React, { useState, useEffect } from 'react';
import vendorService from '../../services/vendorService';
import { showToast, confirmDialog } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

const LoyaltyApplicationsList = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await vendorService.listMyLoyaltyApplications();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch loyalty applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (applicationId) => {
    const confirmed = await confirmDialog('Are you sure you want to cancel this loyalty application? This action cannot be undone.', 'Cancel Application');
    if (!confirmed) {
      return;
    }

    try {
      await vendorService.cancelLoyaltyApplication(applicationId);
      showToast.success('Loyalty application cancelled successfully');
      fetchApplications();
    } catch (err) {
      showToast.error(err.message || 'Failed to cancel application');
    }
  };

  const handleDelete = async (applicationId) => {
    const confirmed = await confirmDialog('Are you sure you want to permanently delete this cancelled loyalty application? This action cannot be undone.', 'Delete Application');
    if (!confirmed) {
      return;
    }

    try {
      await vendorService.deleteLoyaltyApplication(applicationId);
      showToast.success('Loyalty application deleted successfully');
      fetchApplications();
    } catch (err) {
      showToast.error(err.message || 'Failed to delete application. Only cancelled applications can be deleted.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' };
      case 'rejected':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' };
      case 'pending':
        return { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' };
      case 'cancelled':
        return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' };
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '60px 40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
        <h3 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '10px' }}>Loading...</h3>
        <p style={{ color: '#6b7280' }}>Please wait while we fetch your loyalty applications.</p>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
        <h3 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '10px' }}>Unable to Load Applications</h3>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
        <button
          onClick={fetchApplications}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            color: '#003366',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '60px 40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📭</div>
        <h3 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '10px' }}>No Loyalty Applications</h3>
        <p style={{ color: '#6b7280' }}>You haven't submitted any loyalty program applications yet.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      padding: '30px',
      borderRadius: '20px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
    }}>
      <h3 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '20px' }}>
        My Loyalty Applications
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {applications.map((app) => {
          const statusStyle = getStatusColor(app.status);
          return (
            <div
              key={app._id}
              style={{
                padding: '20px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                background: '#f9fafb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.2rem', color: '#003366', marginBottom: '8px' }}>
                    {app.organization}
                  </h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{
                      padding: '6px 12px',
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {app.status}
                    </span>
                    <span style={{
                      padding: '6px 12px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#d4af37',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {app.discountRate}% Discount
                    </span>
                    <span style={{
                      padding: '6px 12px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      Code: {app.promoCode}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {app.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(app._id)}
                      style={{
                        padding: '8px 16px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  {app.status === 'cancelled' && (
                    <button
                      onClick={() => handleDelete(app._id)}
                      style={{
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div style={{ marginTop: '15px' }}>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '8px', fontWeight: '600' }}>
                  Terms and Conditions:
                </p>
                <p style={{ color: '#374151', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  {app.termsAndConditions}
                </p>
              </div>
              {app.createdAt && (
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '15px' }}>
                  Submitted: {new Date(app.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoyaltyApplicationsList;
