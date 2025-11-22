import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../utils/designSystem';

export default function VendorDocumentsPage({ hideBackButton = false, backPath = '/Admin' }) {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [eventId, setEventId] = useState("");
  const [organization, setOrganization] = useState("");
  const [vendorId, setVendorId] = useState("");

  useEffect(() => {
    fetchVendorDocuments();
    // eslint-disable-next-line
  }, []);

  const fetchVendorDocuments = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No token found. Please login.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const query = new URLSearchParams();
      if (eventId) query.append("eventId", eventId);
      if (organization) query.append("organization", organization);
      if (vendorId) query.append("vendorId", vendorId);

      const res = await fetch(`${API_BASE}/admin/vendor-documents?${query.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      console.log("Fetched data:", data); // debug

      // Extract the array correctly
      setVendors(data.vendorDocuments || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch vendor documents");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'], marginBottom: spacing.xl, border: `1px solid ${colors.gray200}` }}>
        <div style={{ 
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.xl
        }}>
          {!hideBackButton && (
            <button
              onClick={() => navigate(backPath)}
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
          )}
          <h2 style={{ 
                color: colors.primary, 
                margin: 0,
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                textAlign: 'center',
                textDecoration: 'underline',
                textDecorationColor: colors.primary,
                textUnderlineOffset: '4px'
              }}>Vendor Documents</h2>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: spacing.xl }}>
              <h3 style={{ 
                color: colors.primary, 
                marginTop: 0, 
                marginBottom: spacing.lg,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold
              }}>Filters</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: spacing.lg, marginBottom: spacing.lg }}>
                <input 
                  type="text" 
                  placeholder="Organization name" 
                  value={organization} 
                  onChange={(e) => setOrganization(e.target.value)}
                  style={{ ...inputStyles.base }}
                />
              </div>
              <button
                onClick={fetchVendorDocuments}
                style={{
                  ...buttonStyles.primary,
                  padding: `${spacing.md} ${spacing.xl}`
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Vendor List */}
          {loading ? (
            <div style={{ 
              color: colors.gray500, 
              fontSize: typography.fontSize.base,
              textAlign: 'center',
              padding: spacing['3xl']
            }}>Loading...</div>
          ) : error ? (
            <div style={{ 
              color: colors.error, 
              background: colors.errorLight,
              padding: spacing.md,
              borderRadius: borderRadius.md,
              marginBottom: spacing.lg,
              fontSize: typography.fontSize.sm
            }}>{error}</div>
          ) : vendors.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: spacing['5xl'],
              color: colors.gray500
            }}>
              <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.lg }}>📄</div>
              <h3 style={{
                color: colors.white,
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                marginBottom: spacing.sm
              }}>No Vendor Documents</h3>
              <p style={{
                fontSize: typography.fontSize.base,
                color: colors.gray500,
                margin: 0
              }}>No vendor documents found.</p>
            </div>
          ) : (
            vendors.map((v, i) => (
              <div key={i} style={{ 
                background: colors.white, 
                borderRadius: borderRadius.xl, 
                boxShadow: shadows.md, 
                border: `1px solid ${colors.gray200}`, 
                padding: spacing['2xl'], 
                marginBottom: spacing.xl 
              }}>
                <h2 style={{ 
                  margin: 0, 
                  color: colors.primary,
                  marginBottom: spacing.lg,
                  fontSize: typography.fontSize.xl,
                  fontWeight: typography.fontWeight.bold
                }}>
                  {v.vendor?.companyName || "Unnamed Vendor"}
                </h2>
                <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Organization:</b> {v.organization || "N/A"}</p>
                <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}><b>Event:</b> {v.event?.title || "N/A"}</p>
                <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}>
                  <b>Tax Card:</b>{" "}
                  {v.vendor?.taxCardUrl ? (
                    <a href={v.vendor.taxCardUrl} target="_blank" rel="noreferrer" style={{ color: colors.primary, textDecoration: 'underline' }}>View</a>
                  ) : (
                    "Not uploaded"
                  )}
                </p>
                <p style={{ color: colors.gray700, marginBottom: spacing.sm, fontSize: typography.fontSize.base }}>
                  <b>Logo:</b>{" "}
                  {v.vendor?.logoUrl ? (
                    <a href={v.vendor.logoUrl} target="_blank" rel="noreferrer" style={{ color: colors.primary, textDecoration: 'underline' }}>View</a>
                  ) : (
                    "Not uploaded"
                  )}
                </p>
              </div>
            ))
          )}
        </div>
  );

  if (hideBackButton) {
    return content;
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        {content}
      </div>
    </div>
  );
}
