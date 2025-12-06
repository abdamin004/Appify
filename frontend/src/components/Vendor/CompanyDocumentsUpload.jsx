import React, { useState, useEffect } from 'react';

function CompanyDocumentsUpload() {
  const [taxCardFile, setTaxCardFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [vendorData, setVendorData] = useState({ taxCardUrl: null, logoUrl: null });

  useEffect(() => {
    loadVendorData();
  }, []);

  const loadVendorData = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      
      // Get vendor data from login response stored in localStorage
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // If user object has taxCardUrl and logoUrl, use them
        if (user.taxCardUrl || user.logoUrl) {
          setVendorData({
            taxCardUrl: user.taxCardUrl,
            logoUrl: user.logoUrl,
          });
        }
      }
      
      // Also try to get from backend if there's a profile endpoint
      // The upload response will also update this, so this is just for initial load
    } catch (err) {
      console.error('Error loading vendor data:', err);
      // If endpoint doesn't exist, that's okay - user can still upload
    }
  };

  const handleFileChange = (type, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Invalid file type. Please upload PNG, JPG, or PDF files only.' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB.' });
      return;
    }

    if (type === 'taxCard') {
      setTaxCardFile(file);
    } else if (type === 'logo') {
      setLogoFile(file);
    }
    setMessage({ type: '', text: '' });
  };

  const handleUpload = async () => {
    if (!taxCardFile && !logoFile) {
      setMessage({ type: 'error', text: 'Please select at least one file to upload.' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      
      const formData = new FormData();
      if (taxCardFile) {
        formData.append('taxCard', taxCardFile);
      }
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await fetch(`${API_BASE}/vendor/vendor-documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Documents uploaded successfully!' });
        setTaxCardFile(null);
        setLogoFile(null);
        // Reset file inputs
        const taxCardInput = document.getElementById('taxCardInput');
        const logoInput = document.getElementById('logoInput');
        if (taxCardInput) taxCardInput.value = '';
        if (logoInput) logoInput.value = '';
        
        // Update vendor data from response
        if (data.vendor) {
          setVendorData({
            taxCardUrl: data.vendor.taxCardUrl,
            logoUrl: data.vendor.logoUrl,
          });
          
          // Also update localStorage user object
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            user.taxCardUrl = data.vendor.taxCardUrl;
            user.logoUrl = data.vendor.logoUrl;
            localStorage.setItem("user", JSON.stringify(user));
          }
        }
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to upload documents.' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: 'Failed to upload documents. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const getFilePreview = (file) => {
    if (!file) return null;
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const baseUrl = API_BASE.replace('/api', ''); // Remove /api to get base URL for static files

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#003366', margin: 0, marginBottom: '10px' }}>Company Documents</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          Upload your tax card and company logo to prove company validity
        </p>
      </div>

      {message.text && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '10px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `2px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: message.type === 'success' ? '#065f46' : '#991b1b',
        }}>
          {message.text}
        </div>
      )}

      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '30px',
      }}>
        {/* Tax Card Upload */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#003366', fontWeight: 600, fontSize: '1.1rem' }}>
            📄 Tax Card *
          </label>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '15px' }}>
            Upload your company tax card (PDF, PNG, JPG, or JPEG - Max 5MB)
          </p>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input
                id="taxCardInput"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleFileChange('taxCard', e)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              />
              {taxCardFile && (
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#6b7280' }}>
                  Selected: {taxCardFile.name} ({(taxCardFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
            
            {vendorData.taxCardUrl && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>Current Tax Card:</div>
                {vendorData.taxCardUrl.endsWith('.pdf') || vendorData.taxCardUrl.includes('.pdf') ? (
                  <a
                    href={`${baseUrl}${vendorData.taxCardUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#003366',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}
                  >
                    📄 View PDF
                  </a>
                ) : (
                  <img
                    src={`${baseUrl}${vendorData.taxCardUrl}`}
                    alt="Tax Card"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '150px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px',
                      background: 'white',
                    }}
                  />
                )}
              </div>
            )}
            
            {taxCardFile && getFilePreview(taxCardFile) && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>Preview:</div>
                <img
                  src={getFilePreview(taxCardFile)}
                  alt="Tax Card Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '150px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                    background: 'white',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Logo Upload */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: '#003366', fontWeight: 600, fontSize: '1.1rem' }}>
            🏢 Company Logo *
          </label>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '15px' }}>
            Upload your company logo (PNG, JPG, or JPEG - Max 5MB)
          </p>
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input
                id="logoInput"
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={(e) => handleFileChange('logo', e)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              />
              {logoFile && (
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#6b7280' }}>
                  Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
            
            {vendorData.logoUrl && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>Current Logo:</div>
                <img
                  src={`${baseUrl}${vendorData.logoUrl}`}
                  alt="Company Logo"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '150px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                    background: 'white',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
            
            {logoFile && getFilePreview(logoFile) && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>Preview:</div>
                <img
                  src={getFilePreview(logoFile)}
                  alt="Logo Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '150px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px',
                    background: 'white',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || (!taxCardFile && !logoFile)}
          style={{
            padding: '14px 28px',
            background: (uploading || (!taxCardFile && !logoFile))
              ? '#9ca3af'
              : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            color: '#003366',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: (uploading || (!taxCardFile && !logoFile)) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
          }}
        >
          {uploading ? 'Uploading...' : '📤 Upload Documents'}
        </button>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ color: '#003366', marginBottom: '15px', fontSize: '1.1rem' }}>📋 Requirements</h3>
        <ul style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
          <li>Tax card must be a valid PDF or image file</li>
          <li>Company logo must be a PNG, JPG, or JPEG image</li>
          <li>Maximum file size: 5MB per file</li>
          <li>Both documents are required to prove company validity</li>
          <li>You can update your documents at any time</li>
        </ul>
      </div>
    </div>
  );
}

export default CompanyDocumentsUpload;

