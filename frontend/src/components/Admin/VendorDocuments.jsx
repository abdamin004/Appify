import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography, buttonStyles, inputStyles } from '../../utils/designSystem';
import { showToast } from '../../utils/toast';

export default function VendorDocuments({ hideBackButton = false, backPath = '/Admin' }) {
  const navigate = useNavigate();

  const [vendorDocuments, setVendorDocuments] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [eventId, setEventId] = useState('');
  const [organization, setOrganization] = useState('');
  const [vendorId, setVendorId] = useState('');

  const buildQuery = useCallback(() => {
    const q = new URLSearchParams();
    if (eventId) q.append('eventId', eventId);
    if (organization) q.append('organization', organization);
    if (vendorId) q.append('vendorId', vendorId);
    return q.toString();
  }, [eventId, organization, vendorId]);

  const fetchVendorDocuments = useCallback(async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(null);

    if (!token) {
      setError('No token found. Please login.');
      setLoading(false);
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const query = buildQuery();
      const url = `${API_BASE}/admin/vendor-documents${query ? `?${query}` : ''}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text || res.statusText}`);
      }

      const data = await res.json();
      setVendorDocuments(data.vendorDocuments || []);
      setCount(typeof data.count === 'number' ? data.count : (data.vendorDocuments || []).length);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch vendor documents');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchVendorDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = async (e) => {
    e?.preventDefault();
    await fetchVendorDocuments();
  };

  const handleReset = () => {
    setEventId('');
    setOrganization('');
    setVendorId('');
    setTimeout(() => fetchVendorDocuments(), 0);
  };

  const handleViewDocument = async (vendorId, documentType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast.error('Please login to view documents');
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      const url = `${API_BASE}/admin/vendor-documents/${vendorId}/${documentType}`;
      
      // Fetch the document with authentication
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a blob URL and open it in a new window
      const blobUrl = URL.createObjectURL(blob);
      const newWindow = window.open(blobUrl, '_blank');
      
      // Clean up the blob URL after a delay (the browser will keep it as long as the window is open)
      if (newWindow) {
        newWindow.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(blobUrl);
        });
      } else {
        // If popup was blocked, create a download link instead
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${documentType}_${vendorId}.${blob.type.includes('pdf') ? 'pdf' : blob.type.includes('png') ? 'png' : 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      }
    } catch (err) {
      console.error('Error viewing document:', err);
      showToast.error(err.message || 'Failed to view document');
    }
  };

  const content = (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ background: colors.bgCard, borderRadius: borderRadius['2xl'], boxShadow: shadows.lg, padding: spacing['3xl'], marginBottom: spacing.xl, border: `1px solid ${colors.gray200}` }}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl }}>
          {!hideBackButton && (
            <button onClick={() => navigate(backPath)} style={{ ...buttonStyles.back, position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>← Back</button>
          )}

          <h2 style={{ color: colors.primary, margin: 0, fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, textAlign: 'center' }}>Vendor Documents</h2>
        </div>

        {/* Filters */}
        <form onSubmit={handleApply} style={{ marginBottom: spacing.xl }}>
          <h3 style={{ color: colors.primary, marginTop: 0, marginBottom: spacing.lg, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold }}>Filters</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing.lg, marginBottom: spacing.lg }}>
            <input type="text" placeholder="Organization" value={organization} onChange={(e) => setOrganization(e.target.value)} style={{ ...inputStyles.base }} />
          </div>

          <div style={{ display: 'flex', gap: spacing.md }}>
            <button type="submit" style={{ ...buttonStyles.primary, padding: `${spacing.md} ${spacing.xl}` }}>Apply Filters</button>
            <button type="button" onClick={handleReset} style={{ ...buttonStyles.secondary, padding: `${spacing.md} ${spacing.xl}` }}>Reset Filters</button>
            <div style={{ marginLeft: 'auto', alignSelf: 'center', color: colors.gray600 }}>Total: {count}</div>
          </div>
        </form>

        {/* Loading / Error / Empty / List */}
        {loading ? (
          <div style={{ color: colors.gray500, fontSize: typography.fontSize.base, textAlign: 'center', padding: spacing['3xl'] }}>Loading...</div>
        ) : error ? (
          <div style={{ color: colors.error, background: colors.errorLight, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg }}>{error}</div>
        ) : vendorDocuments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing['5xl'], color: colors.gray500 }}>
            <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: spacing.lg }}>📄</div>
            <h3 style={{ color: colors.primary, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.sm }}>No Vendor Documents</h3>
            <p style={{ fontSize: typography.fontSize.base, color: colors.gray500, margin: 0 }}>No vendor documents found.</p>
          </div>
        ) : (
          vendorDocuments.map((doc, i) => (
            <div
              key={doc.applicationId || i}
              style={{
                background: colors.white,
                borderRadius: borderRadius.xl,
                boxShadow: shadows.md,
                border: `1px solid ${colors.gray200}`,
                padding: spacing['2xl'],
                marginBottom: spacing.xl
              }}
            >
              {/* HEADER */}
              <div style={{ marginBottom: spacing.lg }}>
                <h2 style={{ margin: 0, color: colors.primary, fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold }}>
                  {doc.vendor?.companyName || "Unnamed Vendor"}
                </h2>
                <p style={{ color: colors.gray600, marginTop: spacing.xs }}>
                  Application ID: <b>{doc.applicationId}</b>
                </p>
              </div>

              {/* EVENT */}
              <div style={{ marginBottom: spacing.lg }}>
                <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>Event Details</h3>
                <div style={{ paddingLeft: spacing.lg, color: colors.gray700 }}>
                  <p><b>Title:</b> {doc.event?.title || 'N/A'}</p>
                  <p><b>Type:</b> {doc.event?.type || 'N/A'}</p>
                  <p><b>Location:</b> {doc.event?.location || 'N/A'}</p>
                  <p><b>Status:</b> {doc.event?.status || 'N/A'}</p>
                  <p><b>Start:</b> {doc.event?.startDate ? new Date(doc.event.startDate).toLocaleString() : 'N/A'}</p>
                  <p><b>End:</b> {doc.event?.endDate ? new Date(doc.event.endDate).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              <hr style={{ border: 0, borderTop: `1px solid ${colors.gray200}`, marginBottom: spacing.lg }} />

              {/* VENDOR */}
              <div style={{ marginBottom: spacing.lg }}>
                <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>Vendor Information</h3>
                <div style={{ paddingLeft: spacing.lg, color: colors.gray700 }}>
                  <p><b>ID:</b> {doc.vendor?.id || 'N/A'}</p>
                  <p><b>Email:</b> {doc.vendor?.email || 'N/A'}</p>
                  <p><b>Tax Card:</b> {doc.vendor?.taxCardAvailable ? (
                    <span>
                      Available - <button
                        onClick={() => handleViewDocument(doc.vendor.id, 'taxCard')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.primary,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 'inherit',
                          fontFamily: 'inherit'
                        }}
                      >
                        View/Download
                      </button>
                    </span>
                  ) : "Not Provided"}</p>
                  <p><b>Logo:</b> {doc.vendor?.logoAvailable ? (
                    <span>
                      Available - <button
                        onClick={() => handleViewDocument(doc.vendor.id, 'logo')}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: colors.primary,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 'inherit',
                          fontFamily: 'inherit'
                        }}
                      >
                        View/Download
                      </button>
                    </span>
                  ) : "Not Provided"}</p>
                </div>
              </div>

              <hr style={{ border: 0, borderTop: `1px solid ${colors.gray200}`, marginBottom: spacing.lg }} />

              {/* OTHER */}
              <div style={{ marginBottom: spacing.lg }}>
                <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>Application Details</h3>
                <div style={{ paddingLeft: spacing.lg, color: colors.gray700 }}>
                  <p><b>Organization:</b> {doc.organization || 'N/A'}</p>
                  <p><b>Booth Size:</b> {doc.boothSize || 'N/A'}</p>
                  <p><b>Paid:</b> {doc.paid ? 'Yes' : 'No'}</p>
                  <p><b>Created At:</b> {doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              {/* ATTENDEES */}
              <div>
                <h3 style={{ color: colors.primary, marginBottom: spacing.md }}>Attendees</h3>
                {doc.attendees?.length > 0 ? doc.attendees.map((a, idx) => (
                  <div key={idx} style={{ paddingLeft: spacing.lg, color: colors.gray700, marginBottom: spacing.md }}>
                    <p><b>Name:</b> {a.name}</p>
                    <p><b>Email:</b> {a.email}</p>
                    <p><b>ID Number:</b> {a.idNumber}</p>
                  </div>
                )) : <p style={{ paddingLeft: spacing.lg, color: colors.gray500 }}>No attendees listed.</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (hideBackButton) return content;

  return (
    <div style={{ minHeight: '100vh', background: colors.bgPrimary, position: 'relative', overflow: 'hidden' }}>
      <div style={{ paddingTop: spacing['8xl'], padding: `${spacing['8xl']} ${spacing['2xl']} ${spacing['6xl']}`, position: 'relative', zIndex: 1 }}>
        {content}
      </div>
    </div>
  );
}
