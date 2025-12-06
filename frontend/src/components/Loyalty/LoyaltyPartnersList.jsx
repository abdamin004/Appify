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
      <div className="flex flex-col items-center justify-center py-12 bg-white/95 rounded-2xl shadow-lg p-10 text-center">
        <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Loading Partners...</h3>
        <p className="text-slate-500">Please wait while we fetch GUC loyalty program partners.</p>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('log in') || error.includes('Session expired') || error.includes('authentication');

    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white/95 rounded-2xl shadow-lg p-10 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-error mb-2">Error Loading Partners</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        {isAuthError ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                window.location.href = '/Login';
              }}
              className="btn btn-primary"
            >
              Go to Login
            </button>
            <button
              onClick={fetchPartners}
              className="btn btn-outline"
            >
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={fetchPartners}
            className="btn btn-primary"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white/95 rounded-2xl shadow-lg p-10 text-center">
        <div className="text-5xl mb-4">⭐</div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">No Approved Partners Available</h3>
        <p className="text-slate-500 mb-6">
          There are currently no approved vendors in the GUC loyalty program.
        </p>
        <div className="bg-slate-50 p-4 rounded-lg text-left max-w-lg mx-auto text-sm text-slate-500">
          <strong className="text-slate-800">Note:</strong> Only approved loyalty program applications are displayed here. Pending applications need to be approved by an admin first.
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          GUC Loyalty Program Partners
        </h2>
        <p className="text-slate-500">
          View all vendors offering discounts through the GUC loyalty program. Use promo codes at checkout to get discounts!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((partner) => (
          <div
            key={partner.loyaltyApplicationId}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all duration-300 group"
          >
            {/* Vendor Name */}
            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-800">
                {partner.vendorName || 'Vendor'}
              </h3>
            </div>

            {/* Discount Rate */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl mb-4 text-center text-white shadow-sm">
              <div className="text-sm font-semibold opacity-90 mb-1">Discount Rate</div>
              <div className="text-3xl font-bold">{partner.discountRate || 0}%</div>
            </div>

            {/* Promo Code */}
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border-2 border-dashed border-amber-400/50 group-hover:border-amber-400 transition-colors">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Promo Code</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded-lg text-lg font-bold text-slate-800 text-center tracking-widest border border-slate-200">
                  {partner.promoCode || 'N/A'}
                </code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(partner.promoCode, 'Promo code');
                  }}
                  className="btn btn-square btn-sm btn-ghost text-amber-600 hover:bg-amber-50"
                  title="Copy promo code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            {partner.termsAndConditions && (
              <div>
                <button
                  onClick={() => toggleExpand(partner.loyaltyApplicationId)}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${expandedPartner === partner.loyaltyApplicationId
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-transparent text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                >
                  <span>📋 Terms & Conditions</span>
                  <span>{expandedPartner === partner.loyaltyApplicationId ? '▼' : '▶'}</span>
                </button>
                {expandedPartner === partner.loyaltyApplicationId && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2 duration-200">
                    {partner.termsAndConditions}
                  </div>
                )}
              </div>
            )}

            {/* Info Badge */}
            <div className="mt-4 p-3 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium text-center">
              💡 Use this promo code at checkout to get your discount!
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoyaltyPartnersList;

