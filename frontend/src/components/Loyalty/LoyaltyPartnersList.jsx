import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';

function LoyaltyPartnersList() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPartner, setExpandedPartner] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        // Check if user exists in localStorage
        const user = localStorage.getItem("user");
        if (!user) {
          throw new Error('Please log in to view loyalty partners.');
        } else {
          // User exists but token is missing - might need to refresh
          throw new Error('Session expired. Please log in again.');
        }
      }

      const endpoint = `${API_BASE}/vendor/loyalty/partners`;
      console.log('Fetching loyalty partners from:', endpoint);

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Parse response
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        const text = await res.text();
        console.error('Response text:', text);
        throw new Error(`Invalid response from server. Status: ${res.status}`);
      }

      if (!res.ok) {
        // Handle backend error response
        const errorMessage = data.message || data.error || data.error?.message || `HTTP error! status: ${res.status}`;
        console.error('Backend error response:', { status: res.status, data });
        throw new Error(errorMessage);
      }

      // Backend returns: { success: true, count: number, partners: [...] }
      console.log('Response data:', data);
      
      if (data.success && Array.isArray(data.partners)) {
        console.log(`✅ Loaded ${data.count || data.partners.length} loyalty partners`);
        setPartners(data.partners);
      } else if (Array.isArray(data)) {
        // Fallback: if response is directly an array
        console.log(`✅ Loaded ${data.length} loyalty partners (direct array)`);
        setPartners(data);
      } else if (data.partners && Array.isArray(data.partners)) {
        // Fallback: if partners exist but success flag is missing
        console.log(`✅ Loaded ${data.partners.length} loyalty partners (no success flag)`);
        setPartners(data.partners);
      } else if (res.ok) {
        // If we got a 200 but no partners, that's okay - just empty list
        console.log('✅ Response OK but no partners found (empty list)');
        setPartners([]);
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        throw new Error(data.message || data.error || 'Unexpected response format from server');
      }
    } catch (err) {
      console.error('❌ Error fetching loyalty partners:', err);
      // Provide more specific error messages
      let errorMsg = 'Failed to load loyalty partners. ';
      if (err.message) {
        errorMsg += err.message;
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMsg += 'Network error. Please check your connection and ensure the backend server is running.';
      } else {
        errorMsg += 'Please try again later.';
      }
      setError(errorMsg);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (partnerId) => {
    setExpandedPartner(expandedPartner === partnerId ? null : partnerId);
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast.success(`${type} copied to clipboard!`);
    }).catch(() => {
      showToast.error('Failed to copy to clipboard');
    });
  };

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '60px 40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
        <h3 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '10px' }}>
          Loading Partners...
        </h3>
        <p style={{ color: '#6b7280' }}>Please wait while we fetch GUC loyalty program partners.</p>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('log in') || error.includes('Session expired') || error.includes('authentication');
    
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
        <h3 style={{ fontSize: '1.5rem', color: '#ef4444', marginBottom: '10px' }}>
          Error Loading Partners
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
        {isAuthError ? (
          <div>
            <button
              onClick={() => {
                window.location.href = '/Login';
              }}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                color: '#003366',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
                marginRight: '10px',
              }}
            >
              Go to Login
            </button>
            <button
              onClick={fetchPartners}
              style={{
                padding: '12px 24px',
                background: '#f3f4f6',
                color: '#003366',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={fetchPartners}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              color: '#003366',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '60px 40px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⭐</div>
        <h3 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '10px' }}>
          No Approved Partners Available
        </h3>
        <p style={{ color: '#6b7280', marginBottom: '15px' }}>
          There are currently no approved vendors in the GUC loyalty program.
        </p>
        <div style={{
          background: '#f9fafb',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px',
          fontSize: '0.9rem',
          color: '#6b7280',
          textAlign: 'left',
          maxWidth: '500px',
          margin: '20px auto 0',
        }}>
          <strong style={{ color: '#003366' }}>Note:</strong> Only approved loyalty program applications are displayed here. Pending applications need to be approved by an admin first.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#003366', margin: 0, marginBottom: '10px', fontSize: '1.8rem' }}>
          GUC Loyalty Program Partners
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          View all vendors offering discounts through the GUC loyalty program. Use promo codes at checkout to get discounts!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
        {partners.map((partner) => (
          <div
            key={partner.loyaltyApplicationId}
            style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '15px',
              padding: '25px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '2px solid #e5e7eb',
              transition: 'all 0.3s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#d4af37';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
          >
            {/* Vendor Name */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                color: '#003366',
                margin: 0,
                marginBottom: '8px',
                fontSize: '1.3rem',
                fontWeight: '700',
              }}>
                {partner.vendorName || 'Vendor'}
              </h3>
            </div>

            {/* Discount Rate */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '15px',
              textAlign: 'center',
            }}>
              <div style={{ color: 'white', fontSize: '0.9rem', marginBottom: '5px', fontWeight: '600' }}>
                Discount Rate
              </div>
              <div style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold' }}>
                {partner.discountRate || 0}%
              </div>
            </div>

            {/* Promo Code */}
            <div style={{
              background: '#f9fafb',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '15px',
              border: '2px dashed #d4af37',
            }}>
              <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '600' }}>
                Promo Code
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
              }}>
                <code style={{
                  background: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#003366',
                  letterSpacing: '2px',
                  flex: 1,
                  textAlign: 'center',
                }}>
                  {partner.promoCode || 'N/A'}
                </code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(partner.promoCode, 'Promo code');
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(212, 175, 55, 0.15)',
                    color: '#003366',
                    border: '1px solid #d4af37',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                  }}
                  title="Copy promo code"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            {partner.termsAndConditions && (
              <div>
                <button
                  onClick={() => toggleExpand(partner.loyaltyApplicationId)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: expandedPartner === partner.loyaltyApplicationId
                      ? 'rgba(212, 175, 55, 0.15)'
                      : 'transparent',
                    color: '#003366',
                    border: '1px solid #d4af37',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>📋 Terms & Conditions</span>
                  <span>{expandedPartner === partner.loyaltyApplicationId ? '▼' : '▶'}</span>
                </button>
                {expandedPartner === partner.loyaltyApplicationId && (
                  <div style={{
                    marginTop: '12px',
                    padding: '15px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    color: '#374151',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {partner.termsAndConditions}
                  </div>
                )}
              </div>
            )}

            {/* Info Badge */}
            <div style={{
              marginTop: '15px',
              padding: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#3b82f6',
            }}>
              💡 Use this promo code at checkout to get your discount!
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoyaltyPartnersList;

