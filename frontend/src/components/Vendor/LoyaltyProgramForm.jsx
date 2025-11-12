import React, { useState } from 'react';
import vendorService from '../../services/vendorService';

const LoyaltyProgramForm = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    organization: '',
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
        throw new Error('Discount rate must be between 0 and 100');
      }

      const payload = {
        organization: formData.organization,
        discountRate: discountRate,
        promoCode: formData.promoCode.trim(),
        termsAndConditions: formData.termsAndConditions.trim()
      };

      await vendorService.applyToLoyaltyProgram(payload);
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      setFormData({
        organization: '',
        discountRate: '',
        promoCode: '',
        termsAndConditions: ''
      });
    } catch (err) {
      setError(err.message || err.error || 'Failed to submit loyalty program application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)',
      padding: '40px',
      borderRadius: '20px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h2 style={{ fontSize: '1.8rem', color: '#003366', marginBottom: '10px' }}>
        Apply to GUC Loyalty Program
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '30px' }}>
        Fill out the form below to apply for the GUC loyalty program. Your application will be reviewed by administrators.
      </p>

      {error && (
        <div style={{
          padding: '12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#003366', fontWeight: '600' }}>
            Organization Name *
          </label>
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
            placeholder="Enter organization name"
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#003366', fontWeight: '600' }}>
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
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
            placeholder="e.g., 10, 15, 20"
          />
          <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
            Enter a percentage between 0 and 100
          </small>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#003366', fontWeight: '600' }}>
            Promo Code *
          </label>
          <input
            type="text"
            name="promoCode"
            value={formData.promoCode}
            onChange={handleChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box'
            }}
            placeholder="e.g., GUC2024, STUDENT10"
          />
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#003366', fontWeight: '600' }}>
            Terms and Conditions *
          </label>
          <textarea
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onChange={handleChange}
            required
            rows="6"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '1rem',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            placeholder="Enter the terms and conditions for your loyalty program offer..."
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: '#003366',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
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

