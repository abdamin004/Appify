import React, { useState, useEffect } from 'react';
import vendorService from '../../services/vendorService';
import adminService from '../../services/adminService';
import { showToast } from '../../utils/toast';
import { 
  createStudentNotification, 
  createStaffNotification, 
  createTaNotification,
  createProfessorNotification 
} from '../../services/notificationService';
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

      const result = await vendorService.applyToLoyaltyProgram(payload);
      
      // Check if application was instantly approved (status: 'approved' in response)
      const app = result?.application || result;
      const isInstantlyApproved = app?.status === 'approved' || result?.message?.includes('live and visible');
      
      if (isInstantlyApproved) {
        // Application was instantly approved - create frontend notifications
        const orgName = app?.organization || formData.organization || 'A vendor';
        const discountInfo = typeof app?.discountRate === 'number'
          ? `${app.discountRate}%`
          : typeof formData.discountRate === 'number'
            ? `${formData.discountRate}%`
            : 'a special';
        const promoInfo = (app?.promoCode || formData.promoCode) ? ` Use code ${app?.promoCode || formData.promoCode}.` : '';
        
        const notification = {
          type: 'LoyaltyPartnerAdded',
          message: `${orgName} has joined the GUC loyalty program offering ${discountInfo} off.${promoInfo}`,
          organization: orgName,
          discountRate: app?.discountRate || formData.discountRate,
          promoCode: app?.promoCode || formData.promoCode,
          date: new Date().toISOString(),
        };
        
        try {
          // Create notifications for all user roles
          createStudentNotification(notification);
          createStaffNotification(notification);
          createTaNotification(notification);
          
          // Create notifications for all professors
          try {
            const professors = await adminService.listAllUsers('Professor');
            const professorList = Array.isArray(professors?.users) ? professors.users : (Array.isArray(professors) ? professors : []);
            
            professorList.forEach(professor => {
              const professorId = String(professor._id || professor.id);
              if (professorId) {
                createProfessorNotification(professorId, notification);
              }
            });
          } catch (profErr) {
            console.error('Could not create professor loyalty notifications:', profErr);
            // Fall back to localStorage method
            try {
              const allKeys = Object.keys(localStorage);
              const professorKeys = allKeys.filter(key => key.startsWith('professorNotifications_'));
              professorKeys.forEach(key => {
                const professorId = key.replace('professorNotifications_', '');
                if (professorId) {
                  createProfessorNotification(professorId, notification);
                }
              });
            } catch (localStorageErr) {
              console.error('Could not create professor notifications from localStorage:', localStorageErr);
            }
          }
          
          // Dispatch event to refresh notifications in all dashboards
          window.dispatchEvent(new CustomEvent('loyaltyPartnerAdded', { detail: { notification } }));
          
          showToast.success('Loyalty program application approved instantly! Notifications sent to all users.');
        } catch (notifErr) {
          console.error('Error creating loyalty notifications:', notifErr);
          showToast.success('Loyalty program application approved instantly!');
        }
      } else {
        showToast.success('Loyalty program application submitted successfully!');
      }
      
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

