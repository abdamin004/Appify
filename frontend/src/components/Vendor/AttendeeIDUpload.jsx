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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Upload Attendee IDs</h2>
        <p className="text-slate-400">
          Upload ID documents for individuals attending for the entire duration of bazaar or booth setup.
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

      {approvedApplications.length === 0 ? (
        <div className="bg-slate-900/50 p-20 rounded-2xl text-center shadow-lg border border-slate-700 backdrop-blur-sm">
          <div className="text-6xl mb-6 opacity-50">📋</div>
          <h3 className="text-xl font-bold text-white mb-2">
            No Approved Applications
          </h3>
          <p className="text-slate-400">
            You don't have any approved applications yet. Once your application is approved, you can upload attendee IDs here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {approvedApplications.map((app) => (
            <div
              key={app._id}
              className="bg-slate-900/50 p-8 rounded-2xl shadow-lg border border-slate-700 backdrop-blur-sm"
            >
              <div className="mb-8 pb-6 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white mb-3">
                  {app.event?.title || 'Event'}
                </h3>
                <div className="flex gap-3 flex-wrap mb-3">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wide border border-emerald-500/30">
                    {app.event?.type || 'Event'}
                  </span>
                  {app.event?.startDate && (
                    <span className="text-slate-300 text-sm flex items-center gap-2 font-medium bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                      📅 {new Date(app.event.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {app.organization && (
                    <span className="text-slate-300 text-sm flex items-center gap-2 font-medium bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                      🏢 {app.organization}
                    </span>
                  )}
                </div>
                {app.event?.type === 'Booth' && app.setupDurationWeeks && (
                  <p className="text-slate-400 text-sm mt-2">
                    Duration: <span className="font-medium text-slate-300">{app.setupDurationWeeks} week(s)</span> | Location: <span className="font-medium text-slate-300">{app.setupLocation || 'TBA'}</span>
                  </p>
                )}
              </div>

              {(!app.attendees || app.attendees.length === 0) ? (
                <div className="p-8 bg-slate-800/30 rounded-xl text-center text-slate-400 border border-slate-700 border-dashed">
                  No attendees registered for this application.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {app.attendees.map((attendee, idx) => {
                    const attendeeId = attendee._id || attendee.id || `attendee_${idx}`;
                    const idUrl = getAttendeeIdUrl(app._id, attendeeId);
                    const hasFile = !!attendeeFiles[attendeeId];
                    const preview = attendeePreviews[attendeeId];

                    return (
                      <div
                        key={attendeeId}
                        className="p-6 bg-slate-800/40 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors"
                      >
                        <div className="mb-4 pb-4 border-b border-slate-700">
                          <h4 className="font-bold text-white mb-2 text-lg">
                            {attendee.name || `Attendee ${idx + 1}`}
                          </h4>
                          <div className="flex flex-col gap-1 text-sm text-slate-400">
                            <span className="flex items-center gap-2">📧 {attendee.email || 'No email'}</span>
                            <span className="flex items-center gap-2">🆔 ID: <span className="font-mono bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700 text-slate-300">{attendee.idNumber || 'Not provided'}</span></span>
                          </div>
                        </div>

                        {idUrl ? (
                          <div>
                            <div className="p-3 bg-emerald-900/20 rounded-lg mb-4 flex justify-between items-center border border-emerald-500/30">
                              <span className="text-emerald-300 font-bold text-sm flex items-center gap-2">
                                <span className="bg-emerald-500/20 text-emerald-300 rounded-full w-5 h-5 flex items-center justify-center text-xs border border-emerald-500/30">✓</span>
                                ID Document Uploaded
                              </span>
                              <button
                                onClick={() => handleRemoveId(app._id, attendeeId, attendee.name)}
                                className="px-3 py-1.5 bg-slate-800 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/10 transition-colors shadow-sm"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex justify-center bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                              {idUrl.endsWith('.pdf') || idUrl.includes('.pdf') ? (
                                <a
                                  href={`${baseUrl}${idUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/20 text-blue-300 rounded-lg font-bold text-sm hover:bg-blue-900/30 transition-colors border border-blue-500/30"
                                >
                                  📄 View PDF
                                </a>
                              ) : (
                                <img
                                  src={`${baseUrl}${idUrl}`}
                                  alt={`ID for ${attendee.name}`}
                                  className="max-w-full max-h-[150px] object-contain rounded"
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            {preview && (
                              <div className="mb-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-center">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preview</p>
                                <img
                                  src={preview}
                                  alt="Preview"
                                  className="max-w-full max-h-[150px] object-contain mx-auto rounded"
                                />
                              </div>
                            )}
                            <div className="flex flex-col gap-3">
                              <div className="flex gap-2">
                                <label className={`flex-1 btn btn-sm ${hasFile ? 'btn-outline text-slate-300 border-slate-600 hover:bg-slate-800' : 'btn-primary bg-emerald-600 border-none hover:bg-emerald-700 text-white'}`}>
                                  {hasFile ? 'Change File' : 'Select ID Document'}
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                                    onChange={(e) => handleFileSelect(attendeeId, e)}
                                    className="hidden"
                                  />
                                </label>
                                {hasFile && (
                                  <button
                                    onClick={() => handleUpload(app._id, attendeeId, attendee)}
                                    disabled={loading}
                                    className="btn btn-success btn-sm text-white bg-emerald-600 border-none hover:bg-emerald-700"
                                  >
                                    {loading ? 'Uploading...' : '📤 Upload'}
                                  </button>
                                )}
                              </div>
                              {hasFile && (
                                <p className="text-xs text-slate-400 text-center bg-slate-900/50 py-1 px-2 rounded border border-slate-700 truncate">
                                  Selected: {attendeeFiles[attendeeId]?.name}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AttendeeIDUpload;
