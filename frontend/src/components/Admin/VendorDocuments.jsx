import React, { useState, useEffect, useCallback } from 'react';
import { showToast } from '../../utils/toast';

export default function VendorDocuments() {
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

  const handleViewDocument = async (vendorId, documentType, vendorName = 'vendor') => {
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

  const handleDownloadDocument = async (vendorId, documentType, vendorName = 'vendor') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast.error('Please login to download documents');
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
      // Add download=true query parameter to force download
      const url = `${API_BASE}/admin/vendor-documents/${vendorId}/${documentType}?download=true`;

      // Fetch the document with authentication
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.statusText}`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${vendorName}_${documentType}.${blob.type.includes('pdf') ? 'pdf' : blob.type.includes('png') ? 'png' : 'jpg'}`;

      if (contentDisposition) {
        // Try to extract filename from Content-Disposition header
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          // Decode URI if needed
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {
            // If decoding fails, use as is
          }
        }
      }

      // Create a download link and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      showToast.success('Document downloaded successfully');
    } catch (err) {
      console.error('Error downloading document:', err);
      showToast.error(err.message || 'Failed to download document');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Vendor Documents</h2>
          <p className="text-slate-500 mt-2">Manage and review vendor documentation</p>
        </div>

        {/* Filters */}
        <form onSubmit={handleApply} className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" className="btn btn-primary">Apply Filters</button>
            <button type="button" onClick={handleReset} className="btn btn-ghost">Reset Filters</button>
            <div className="ml-auto text-slate-600 font-medium">Total: {count}</div>
          </div>
        </form>

        {/* Loading / Error / Empty / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-emerald-600 mb-4"></span>
            <p className="text-lg font-medium text-slate-600">Loading documents...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-sm mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        ) : vendorDocuments.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Vendor Documents</h3>
            <p className="text-slate-500">No vendor documents found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {vendorDocuments.map((doc, i) => (
              <div
                key={doc.applicationId || i}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* HEADER */}
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <h2 className="text-2xl font-bold text-slate-800">
                    {doc.vendor?.companyName || "Unnamed Vendor"}
                  </h2>
                  <p className="text-slate-500 mt-1">
                    Application ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{doc.applicationId}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* EVENT */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-emerald-600">📅</span> Event Details
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p><span className="font-semibold text-slate-700">Title:</span> {doc.event?.title || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Type:</span> {doc.event?.type || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Location:</span> {doc.event?.location || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Status:</span> {doc.event?.status || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Start:</span> {doc.event?.startDate ? new Date(doc.event.startDate).toLocaleString() : 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">End:</span> {doc.event?.endDate ? new Date(doc.event.endDate).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>

                  {/* VENDOR */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-emerald-600">🏢</span> Vendor Information
                    </h3>
                    <div className="space-y-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p><span className="font-semibold text-slate-700">ID:</span> {doc.vendor?.id || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Email:</span> {doc.vendor?.email || 'N/A'}</p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700">Tax Card:</span>
                        {doc.vendor?.taxCardAvailable ? (
                          <div className="flex items-center gap-2">
                            <span className="badge badge-success badge-sm text-white">Available</span>
                            <button
                              onClick={() => handleViewDocument(doc.vendor.id, 'taxCard', doc.vendor.companyName || 'vendor')}
                              className="btn btn-xs btn-outline btn-primary"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc.vendor.id, 'taxCard', doc.vendor.companyName || 'vendor')}
                              className="btn btn-xs btn-primary"
                            >
                              ⬇️ Download
                            </button>
                          </div>
                        ) : <span className="badge badge-ghost badge-sm">Not Provided</span>}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700">Logo:</span>
                        {doc.vendor?.logoAvailable ? (
                          <div className="flex items-center gap-2">
                            <span className="badge badge-success badge-sm text-white">Available</span>
                            <button
                              onClick={() => handleViewDocument(doc.vendor.id, 'logo', doc.vendor.companyName || 'vendor')}
                              className="btn btn-xs btn-outline btn-primary"
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc.vendor.id, 'logo', doc.vendor.companyName || 'vendor')}
                              className="btn btn-xs btn-primary"
                            >
                              ⬇️ Download
                            </button>
                          </div>
                        ) : <span className="badge badge-ghost badge-sm">Not Provided</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* OTHER */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-emerald-600">📝</span> Application Details
                    </h3>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-700">Organization:</span> {doc.organization || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Booth Size:</span> {doc.boothSize || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Paid:</span> {doc.paid ? 'Yes' : 'No'}</p>
                      <p><span className="font-semibold text-slate-700">Created At:</span> {doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>

                  {/* ATTENDEES */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <span className="text-emerald-600">👥</span> Attendees
                    </h3>
                    <div className="space-y-3">
                      {doc.attendees?.length > 0 ? doc.attendees.map((a, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded border border-slate-100 text-sm">
                          <p><span className="font-semibold">Name:</span> {a.name}</p>
                          <p><span className="font-semibold">Email:</span> {a.email}</p>
                          <p><span className="font-semibold">ID Number:</span> {a.idNumber}</p>
                        </div>
                      )) : <p className="text-slate-500 italic">No attendees listed.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
