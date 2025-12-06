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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Company Documents</h2>
        <p className="text-slate-400">
          Upload your tax card and company logo to prove company validity
        </p>
      </div>

      {message.text && (
        <div className={`p-4 mb-6 rounded-xl border flex items-center gap-3 ${message.type === 'success'
          ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300'
          : 'bg-red-900/20 border-red-500/30 text-red-300'
          }`}>
          <span className="text-xl">{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-slate-900/50 p-8 rounded-2xl shadow-lg border border-slate-700 backdrop-blur-sm mb-8">
        {/* Tax Card Upload */}
        <div className="mb-10">
          <label className="block mb-2 text-white font-bold text-lg flex items-center gap-2">
            📄 Tax Card <span className="text-red-400">*</span>
          </label>
          <p className="text-slate-400 text-sm mb-6">
            Upload your company tax card (PDF, PNG, JPG, or JPEG - Max 5MB)
          </p>

          <div className="flex gap-8 flex-wrap items-start">
            <div className="flex-1 min-w-[300px]">
              <input
                id="taxCardInput"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => handleFileChange('taxCard', e)}
                className="file-input file-input-bordered file-input-primary w-full bg-slate-800/50 border-slate-600 text-white focus:border-emerald-500 transition-colors"
              />
              {taxCardFile && (
                <div className="mt-3 text-sm text-slate-300 font-medium flex items-center gap-2 bg-slate-800/30 p-2 rounded-lg border border-slate-700 inline-block">
                  <span>📎</span>
                  Selected: {taxCardFile.name} ({(taxCardFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            {vendorData.taxCardUrl && (
              <div className="text-center bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current Tax Card</div>
                {vendorData.taxCardUrl.endsWith('.pdf') || vendorData.taxCardUrl.includes('.pdf') ? (
                  <a
                    href={`${baseUrl}${vendorData.taxCardUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg font-bold hover:bg-slate-800 hover:border-slate-500 transition-all shadow-sm"
                  >
                    📄 View PDF
                  </a>
                ) : (
                  <img
                    src={`${baseUrl}${vendorData.taxCardUrl}`}
                    alt="Tax Card"
                    className="max-w-[200px] max-h-[150px] border border-slate-700 rounded-lg bg-slate-900 shadow-sm object-contain"
                  />
                )}
              </div>
            )}

            {taxCardFile && getFilePreview(taxCardFile) && (
              <div className="text-center bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Preview</div>
                <img
                  src={getFilePreview(taxCardFile)}
                  alt="Tax Card Preview"
                  className="max-w-[200px] max-h-[150px] border border-slate-700 rounded-lg bg-slate-900 shadow-sm object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <div className="divider before:bg-slate-700 after:bg-slate-700"></div>

        {/* Logo Upload */}
        <div className="mb-10">
          <label className="block mb-2 text-white font-bold text-lg flex items-center gap-2">
            🏢 Company Logo <span className="text-red-400">*</span>
          </label>
          <p className="text-slate-400 text-sm mb-6">
            Upload your company logo (PNG, JPG, or JPEG - Max 5MB)
          </p>

          <div className="flex gap-8 flex-wrap items-start">
            <div className="flex-1 min-w-[300px]">
              <input
                id="logoInput"
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={(e) => handleFileChange('logo', e)}
                className="file-input file-input-bordered file-input-primary w-full bg-slate-800/50 border-slate-600 text-white focus:border-emerald-500 transition-colors"
              />
              {logoFile && (
                <div className="mt-3 text-sm text-slate-300 font-medium flex items-center gap-2 bg-slate-800/30 p-2 rounded-lg border border-slate-700 inline-block">
                  <span>📎</span>
                  Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            {vendorData.logoUrl && (
              <div className="text-center bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current Logo</div>
                <img
                  src={`${baseUrl}${vendorData.logoUrl}`}
                  alt="Company Logo"
                  className="max-w-[200px] max-h-[150px] border border-slate-700 rounded-lg bg-slate-900 shadow-sm object-contain"
                />
              </div>
            )}

            {logoFile && getFilePreview(logoFile) && (
              <div className="text-center bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Preview</div>
                <img
                  src={getFilePreview(logoFile)}
                  alt="Logo Preview"
                  className="max-w-[200px] max-h-[150px] border border-slate-700 rounded-lg bg-slate-900 shadow-sm object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleUpload}
            disabled={uploading || (!taxCardFile && !logoFile)}
            className={`px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-sm ${uploading || (!taxCardFile && !logoFile)
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg hover:-translate-y-0.5'
              }`}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>📤</span> Upload Documents
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bg-slate-900/50 p-8 rounded-2xl shadow-lg border border-slate-700 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📋</span> Requirements
        </h3>
        <ul className="space-y-3 text-slate-400">
          <li className="flex items-start gap-3">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>Tax card must be a valid PDF or image file</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>Company logo must be a PNG, JPG, or JPEG image</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>Maximum file size: 5MB per file</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>Both documents are required to prove company validity</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-500 mt-1">✓</span>
            <span>You can update your documents at any time</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CompanyDocumentsUpload;
