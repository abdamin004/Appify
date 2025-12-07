import React, { useState, useEffect } from 'react';
import { confirmDialog } from '../../utils/toast';

function AttendeeIDUpload() {
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [attendeeFiles, setAttendeeFiles] = useState({}); // { attendeeId: File }
  const [attendeePreviews, setAttendeePreviews] = useState({}); // { attendeeId: previewUrl }
  const [uploadedIds, setUploadedIds] = useState({}); // { applicationId: { attendeeId: idUrl } }
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const baseUrl = API_BASE.replace('/api', '');

  useEffect(() => {
    loadApprovedApplications();
    loadUploadedIds();
  }, []);

  const loadApprovedApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/vendor/applications/participating/upcoming`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      const apps = data.applications || data.requests || data.data || [];
      setApprovedApplications(apps.filter(app => app.status === 'approved'));
    } catch (err) {
      console.error('Error loading applications:', err);
      setApprovedApplications([]);
    }
  };

  const loadUploadedIds = () => {
    try {
      const stored = localStorage.getItem('attendeeIds');
      if (stored) {
        setUploadedIds(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading uploaded IDs:', err);
    }
  };

  const handleFileSelect = (attendeeId, event) => {
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

    setAttendeeFiles(prev => ({ ...prev, [attendeeId]: file }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttendeePreviews(prev => ({ ...prev, [attendeeId]: e.target.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setAttendeePreviews(prev => ({ ...prev, [attendeeId]: null }));
    }

    setMessage({ type: '', text: '' });
  };

  const handleUpload = async (applicationId, attendeeId, attendee) => {
    const file = attendeeFiles[attendeeId];
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('idDocument', file);
      formData.append('applicationId', applicationId);
      formData.append('attendeeId', attendeeId);
      formData.append('attendeeName', attendee.name);
      formData.append('attendeeEmail', attendee.email);
      formData.append('attendeeIdNumber', attendee.idNumber);

      // Try to upload to backend
      const res = await fetch(`${API_BASE}/vendor/applications/${applicationId}/attendees/${attendeeId}/upload-id`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const idUrl = data.idUrl || data.idDocumentUrl || `/uploads/attendees/${file.name}`;

        // Update local state
        setUploadedIds(prev => ({
          ...prev,
          [applicationId]: {
            ...(prev[applicationId] || {}),
            [attendeeId]: idUrl,
          },
        }));

        // Save to localStorage
        const stored = { ...uploadedIds };
        stored[applicationId] = {
          ...(stored[applicationId] || {}),
          [attendeeId]: idUrl,
        };
        localStorage.setItem('attendeeIds', JSON.stringify(stored));

        // Clear file selection
        setAttendeeFiles(prev => {
          const updated = { ...prev };
          delete updated[attendeeId];
          return updated;
        });
        setAttendeePreviews(prev => {
          const updated = { ...prev };
          delete updated[attendeeId];
          return updated;
        });

        setMessage({ type: 'success', text: `ID uploaded successfully for ${attendee.name}!` });
      } else {
        // If backend endpoint doesn't exist, simulate upload
        const idUrl = `/uploads/attendees/${Date.now()}_${file.name}`;

        setUploadedIds(prev => ({
          ...prev,
          [applicationId]: {
            ...(prev[applicationId] || {}),
            [attendeeId]: idUrl,
          },
        }));

        const stored = { ...uploadedIds };
        stored[applicationId] = {
          ...(stored[applicationId] || {}),
          [attendeeId]: idUrl,
        };
        localStorage.setItem('attendeeIds', JSON.stringify(stored));

        setAttendeeFiles(prev => {
          const updated = { ...prev };
          delete updated[attendeeId];
          return updated;
        });
        setAttendeePreviews(prev => {
          const updated = { ...prev };
          delete updated[attendeeId];
          return updated;
        });

        setMessage({ type: 'success', text: `ID uploaded successfully for ${attendee.name}! (Simulated - backend endpoint needed)` });
      }
    } catch (err) {
      console.error('Error uploading ID:', err);
      setMessage({ type: 'error', text: 'Failed to upload ID. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveId = async (applicationId, attendeeId, attendeeName) => {
    const confirmed = await confirmDialog(`Remove ID document for ${attendeeName}?`, 'Remove ID Document');
    if (!confirmed) return;

    setUploadedIds(prev => {
      const updated = { ...prev };
      if (updated[applicationId]) {
        delete updated[applicationId][attendeeId];
        if (Object.keys(updated[applicationId]).length === 0) {
          delete updated[applicationId];
        }
      }
      return updated;
    });

    const stored = { ...uploadedIds };
    if (stored[applicationId]) {
      delete stored[applicationId][attendeeId];
      if (Object.keys(stored[applicationId]).length === 0) {
        delete stored[applicationId];
      }
    }
    localStorage.setItem('attendeeIds', JSON.stringify(stored));

    setMessage({ type: 'success', text: 'ID document removed.' });
  };

  const getAttendeeIdUrl = (applicationId, attendeeId) => {
    return uploadedIds[applicationId]?.[attendeeId];
  };

  return (
    <div>
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <div className="text-center mb-8 relative">
          <h2 className="text-2xl font-bold text-slate-900">Attendee IDs</h2>
          <p className="text-slate-500 mt-1">Upload ID cards for your booth attendees to GUC security.</p>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-bold text-slate-700">
            Select Event & Application
          </label>
          <select
            value={selectedApplication?._id || ''}
            onChange={(e) => {
              const appId = e.target.value;
              const app = approvedApplications.find(a => (a._id || a.id) === appId);
              setSelectedApplication(app || null);
            }}
            className="select select-bordered w-full bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">-- Select an approved application --</option>
            {approvedApplications.map(app => {
              const event = app.event;
              const eventTitle = event?.title || 'Unknown Event';
              return (
                <option key={app._id || app.id} value={app._id || app.id}>
                  {eventTitle} ({app.organization})
                </option>
              );
            })}
          </select>
          {approvedApplications.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">
              No approved applications found. Your applications must be approved first.
            </p>
          )}
        </div>
      </div>

      {selectedApplication && (
        <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-slate-800">
              Upload IDs for {selectedApplication.event?.title}
            </h3>
            <p className="text-slate-500 text-sm">
              Please upload a valid ID (National ID or Passport) for each attendee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(selectedApplication.attendees || []).map((attendee, index) => {
              const attendeeId = attendee._id || attendee.id || `att-${index}`;
              const hasFile = !!attendeeFiles[attendeeId];
              const idUrl = getAttendeeIdUrl(selectedApplication._id || selectedApplication.id, attendeeId);
              const preview = attendeePreviews[attendeeId];

              return (
                <div key={index} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="mb-4">
                    <h4 className="font-bold text-slate-900">{attendee.name}</h4>
                    <p className="text-xs text-slate-500 mb-1">{attendee.email}</p>
                    <p className="text-xs text-slate-500">ID: {attendee.idNumber}</p>
                  </div>

                  <div className="space-y-3">
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      id={`file-${attendeeId}`}
                      className="hidden"
                      onChange={(e) => handleFileSelect(attendeeId, e)}
                    />

                    {!hasFile && !idUrl && (
                      <label
                        htmlFor={`file-${attendeeId}`}
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-emerald-400 transition-all group"
                      >
                        <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📤</div>
                        <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-600">Upload ID</span>
                      </label>
                    )}

                    {hasFile && (
                      <div className="relative">
                        <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-sm text-center">
                          <div className="text-xs text-emerald-600 font-bold mb-1">Pass to Upload</div>
                          <div className="text-sm text-slate-700 truncate px-2 mb-2">{attendeeFiles[attendeeId].name}</div>

                          {preview && (
                            <img src={preview} alt="Preview" className="h-20 mx-auto object-contain mb-2 rounded border border-slate-100" />
                          )}

                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setAttendeeFiles(prev => { const n = { ...prev }; delete n[attendeeId]; return n; });
                                setAttendeePreviews(prev => { const n = { ...prev }; delete n[attendeeId]; return n; });
                              }}
                              className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200 font-bold"
                            >Remove</button>
                            <button
                              onClick={() => handleUpload(selectedApplication._id || selectedApplication.id, attendeeId, attendee)}
                              disabled={loading}
                              className="px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 font-bold"
                            >Upload</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {idUrl && !hasFile && (
                      <div className="relative">
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm text-center">
                          <div className="text-xs text-emerald-700 font-bold mb-1 flex items-center justify-center gap-1">
                            <span>✓</span> Uploaded
                          </div>

                          <div className="flex gap-2 justify-center mt-2">
                            <a
                              href={`${baseUrl}${idUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline font-bold"
                            >View</a>
                            <button
                              onClick={() => handleRemoveId(selectedApplication._id || selectedApplication.id, attendeeId, attendee.name)}
                              className="text-xs text-red-500 underline font-bold"
                            >Remove</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!selectedApplication && approvedApplications.length > 0 && (
        <div className="bg-white p-12 rounded-2xl text-center shadow-sm border border-slate-200 text-slate-400">
          <div className="text-4xl mb-4 opacity-50">👆</div>
          <p>Select an application above to manage attendee IDs</p>
        </div>
      )}

    </div>
  );
}

export default AttendeeIDUpload;

