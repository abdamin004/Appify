import React, { useState, useEffect } from 'react';
import vendorService from '../../services/vendorService';
import { showToast } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../utils/designSystem';

const LoyaltyProgramForm = ({ onSuccess, onCancel }) => {
  // Get logged-in vendor info to auto-fill organization
  const getVendorInfo = () => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return null;
      const vendor = JSON.parse(raw);
      return {
        companyName: vendor.companyName || vendor.companyname || vendor.company || ''
      };
    } catch {
      return null;
    }
  };

  const vendorInfo = getVendorInfo();

  const [formData, setFormData] = useState({
    organization: vendorInfo?.companyName || '',
    discountRate: '',
    promoCode: '',
    termsAndConditions: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate discount rate
      const discountRate = parseFloat(formData.discountRate);
      if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
        showToast.error('Discount rate must be between 0 and 100');
        setError('Discount rate must be between 0 and 100');
        return;
      }

      const payload = {
        organization: formData.organization,
        discountRate: discountRate,
        promoCode: formData.promoCode.trim(),
        termsAndConditions: formData.termsAndConditions.trim()
      };

      await vendorService.applyToLoyaltyProgram(payload);
      
      showToast.success('Loyalty program application submitted successfully!');
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form (but keep organization if vendor info exists)
      setFormData({
        organization: vendorInfo?.companyName || '',
        discountRate: '',
        promoCode: '',
        termsAndConditions: ''
      });
      setError('');
    } catch (err) {
      const errorMsg = err.message || err.error || 'Failed to submit loyalty program application';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: colors.bgCard,
      padding: spacing['2xl'],
      borderRadius: borderRadius['2xl'],
      boxShadow: shadows.lg,
      maxWidth: '600px',
      margin: '0 auto',
      border: `1px solid ${colors.gray200}`,
    }}>
      <h2 style={{ 
        fontSize: typography.fontSize['2xl'], 
        color: colors.primary, 
        marginBottom: spacing.sm,
        fontWeight: typography.fontWeight.bold,
      }}>
        Apply to GUC Loyalty Program
      </h2>
      <p style={{ 
        color: colors.gray500, 
        marginBottom: spacing['3xl'],
        fontSize: typography.fontSize.base,
      }}>
        Fill out the form below to apply for the GUC loyalty program. Your application will be reviewed by administrators.
      </p>

      {vendorInfo?.companyName && (
        <div style={{ 
          padding: spacing.lg, 
          background: 'rgba(212, 175, 55, 0.1)', 
          borderRadius: borderRadius.lg, 
          marginBottom: spacing.xl, 
          fontSize: typography.fontSize.sm, 
          color: colors.primary 
        }}>
          <strong>✓ Organization name auto-filled with your account info</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: spacing.xl }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm, 
            color: colors.primary, 
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>
            Organization Name *
          </label>
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
            style={{
              ...inputStyles.base,
              width: '100%',
            }}
            placeholder="Enter organization name"
          />
        </div>

        <div style={{ marginBottom: spacing.xl }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm, 
            color: colors.primary, 
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>
            Discount Rate (%) *
          </label>
          <input
            type="number"
            name="discountRate"
            value={formData.discountRate}
            onChange={handleChange}
            required
            min="0"
            max="100"
            step="0.1"
            style={{
              ...inputStyles.base,
              width: '100%',
            }}
            placeholder="e.g., 10, 15, 20"
          />
          <small style={{ 
            color: colors.gray500, 
            fontSize: typography.fontSize.sm,
            display: 'block',
            marginTop: spacing.xs,
          }}>
            Enter a percentage between 0 and 100
          </small>
        </div>

        <div style={{ marginBottom: spacing.xl }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm, 
            color: colors.primary, 
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>
            Promo Code *
          </label>
          <input
            type="text"
            name="promoCode"
            value={formData.promoCode}
            onChange={handleChange}
            required
            style={{
              ...inputStyles.base,
              width: '100%',
            }}
            placeholder="e.g., GUC2024, STUDENT10"
          />
        </div>

        <div style={{ marginBottom: spacing['3xl'] }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm, 
            color: colors.primary, 
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>
            Terms and Conditions *
          </label>
          <textarea
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onChange={handleChange}
            required
            rows="6"
            style={{
              ...inputStyles.base,
              width: '100%',
              resize: 'vertical',
              fontFamily: typography.fontFamily
            }}
            placeholder="Enter the terms and conditions for your loyalty program offer..."
          />
        </div>

        <div style={{ display: 'flex', gap: spacing.lg, justifyContent: 'flex-end' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                ...buttonStyles.outline,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyles.primary,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.boxShadow = shadows.accentHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.boxShadow = shadows.accent;
              }
            }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoyaltyProgramForm;

