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
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-center mb-8 relative">
          <h2 className="text-2xl font-bold text-slate-900">Company Documents</h2>
          <p className="text-slate-500 mt-1">Upload your tax card and company logo to prove company validity</p>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded-xl border-2 flex items-center gap-2 ${message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}>
            <span>{message.type === 'success' ? '✓' : '⚠️'}</span> {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Tax Card Upload */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <label className="block mb-2 font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>📄</span> Tax Card <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-slate-500 mb-4">
              Upload your company tax card (PDF, PNG, JPG - Max 5MB)
            </p>

            <input
              id="taxCardInput"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => handleFileChange('taxCard', e)}
              className="file-input file-input-bordered w-full bg-white mb-4"
            />

            {taxCardFile && (
              <div className="text-sm text-emerald-600 font-medium mb-4 p-2 bg-emerald-50 rounded-lg">
                Selected: {taxCardFile.name} ({(taxCardFile.size / 1024).toFixed(2)} KB)
              </div>
            )}

            <div className="flex flex-col gap-4">
              {vendorData.taxCardUrl && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-2">Current File</div>
                  {vendorData.taxCardUrl.includes('.pdf') ? (
                    <a href={`${baseUrl}${vendorData.taxCardUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold underline">View PDF</a>
                  ) : (
                    <img src={`${baseUrl}${vendorData.taxCardUrl}`} alt="Tax Card" className="max-h-32 mx-auto object-contain" />
                  )}
                </div>
              )}
              {taxCardFile && getFilePreview(taxCardFile) && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-2">Preview</div>
                  <img src={getFilePreview(taxCardFile)} alt="Preview" className="max-h-32 mx-auto object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <label className="block mb-2 font-bold text-slate-800 text-lg flex items-center gap-2">
              <span>🏢</span> Company Logo <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-slate-500 mb-4">
              Upload your company logo (PNG, JPG - Max 5MB)
            </p>

            <input
              id="logoInput"
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => handleFileChange('logo', e)}
              className="file-input file-input-bordered w-full bg-white mb-4"
            />

            {logoFile && (
              <div className="text-sm text-emerald-600 font-medium mb-4 p-2 bg-emerald-50 rounded-lg">
                Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(2)} KB)
              </div>
            )}

            <div className="flex flex-col gap-4">
              {vendorData.logoUrl && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-2">Current Logo</div>
                  <img src={`${baseUrl}${vendorData.logoUrl}`} alt="Logo" className="max-h-32 mx-auto object-contain" />
                </div>
              )}
              {logoFile && getFilePreview(logoFile) && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-2">Preview</div>
                  <img src={getFilePreview(logoFile)} alt="Preview" className="max-h-32 mx-auto object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={handleUpload}
            disabled={uploading || (!taxCardFile && !logoFile)}
            className="btn btn-primary btn-lg w-full md:w-auto min-w-[200px] shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 border-none text-white font-bold rounded-xl"
          >
            {uploading ? <span className="loading loading-spinner"></span> : '📤 Upload Documents'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">📋 Requirements</h3>
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-2">
          <li>Tax card must be a valid PDF or image file</li>
          <li>Company logo must be a PNG, JPG, or JPEG image</li>
          <li>Maximum file size: 5MB per file</li>
          <li>Both documents are required to prove company validity</li>
        </ul>
      </div>
    </div>
  );
}

export default CompanyDocumentsUpload;

