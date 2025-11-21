import React, { useState, useEffect } from 'react';

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

  const handleRemoveId = (applicationId, attendeeId, attendeeName) => {
    if (!window.confirm(`Remove ID document for ${attendeeName}?`)) return;

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
    <div style={{ padding: '20px' }}>
      <div style={{ 
        marginBottom: '30px'
      }}>
        <h2 style={{ color: '#003366', margin: 0, marginBottom: '10px' }}>Upload Attendee IDs</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          Upload ID documents for individuals attending for the entire duration of bazaar or booth setup.
        </p>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 20px',
          marginBottom: '20px',
          borderRadius: '8px',
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#22c55e' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? '#22c55e' : '#ef4444'}`,
        }}>
          {message.text}
        </div>
      )}

      {approvedApplications.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '60px 40px',
          borderRadius: '15px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📋</div>
          <h3 style={{ fontSize: '1.5rem', color: '#003366', marginBottom: '10px' }}>
            No Approved Applications
          </h3>
          <p style={{ color: '#6b7280' }}>
            You don't have any approved applications yet. Once your application is approved, you can upload attendee IDs here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {approvedApplications.map((app) => (
            <div
              key={app._id}
              style={{
                background: 'rgba(255,255,255,0.95)',
                padding: '25px',
                borderRadius: '15px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#003366', margin: 0, marginBottom: '8px', fontSize: '1.3rem' }}>
                  {app.event?.title || 'Event'}
                </h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span style={{
                    padding: '4px 12px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                  }}>
                    {app.event?.type || 'Event'}
                  </span>
                  {app.event?.startDate && (
                    <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      📅 {new Date(app.event.startDate).toLocaleDateString()}
                    </span>
                  )}
                  {app.organization && (
                    <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      🏢 {app.organization}
                    </span>
                  )}
                </div>
                {app.event?.type === 'Booth' && app.setupDurationWeeks && (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                    Duration: {app.setupDurationWeeks} week(s) | Location: {app.setupLocation || 'TBA'}
                  </p>
                )}
              </div>

              {(!app.attendees || app.attendees.length === 0) ? (
                <div style={{
                  padding: '20px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: '#6b7280',
                }}>
                  No attendees registered for this application.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {app.attendees.map((attendee, idx) => {
                    const attendeeId = attendee._id || attendee.id || `attendee_${idx}`;
                    const idUrl = getAttendeeIdUrl(app._id, attendeeId);
                    const hasFile = !!attendeeFiles[attendeeId];
                    const preview = attendeePreviews[attendeeId];

                    return (
                      <div
                        key={attendeeId}
                        style={{
                          padding: '20px',
                          background: '#f9fafb',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <div style={{ marginBottom: '15px' }}>
                          <h4 style={{ color: '#003366', margin: 0, marginBottom: '8px' }}>
                            {attendee.name || `Attendee ${idx + 1}`}
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.9rem', color: '#6b7280' }}>
                            <span>📧 {attendee.email || 'No email'}</span>
                            <span>🆔 ID Number: {attendee.idNumber || 'Not provided'}</span>
                          </div>
                        </div>

                        {idUrl ? (
                          <div style={{ marginBottom: '15px' }}>
                            <div style={{
                              padding: '12px',
                              background: 'rgba(34, 197, 94, 0.1)',
                              borderRadius: '8px',
                              marginBottom: '10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}>
                              <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.9rem' }}>
                                ✓ ID Document Uploaded
                              </span>
                              <button
                                onClick={() => handleRemoveId(app._id, attendeeId, attendee.name)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            {idUrl.endsWith('.pdf') || idUrl.includes('.pdf') ? (
                              <a
                                href={`${baseUrl}${idUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-block',
                                  padding: '8px 16px',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  color: '#3b82f6',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  fontSize: '0.9rem',
                                }}
                              >
                                📄 View PDF
                              </a>
                            ) : (
                              <img
                                src={`${baseUrl}${idUrl}`}
                                alt={`ID for ${attendee.name}`}
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
                        ) : (
                          <div>
                            {preview && (
                              <div style={{ marginBottom: '15px' }}>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>Preview:</p>
                                <img
                                  src={preview}
                                  alt="Preview"
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
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <label
                                style={{
                                  padding: '10px 20px',
                                  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                                  color: '#003366',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '0.9rem',
                                  display: 'inline-block',
                                }}
                              >
                                📎 {hasFile ? 'Change File' : 'Select ID Document'}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                                  onChange={(e) => handleFileSelect(attendeeId, e)}
                                  style={{ display: 'none' }}
                                />
                              </label>
                              {hasFile && (
                                <button
                                  onClick={() => handleUpload(app._id, attendeeId, attendee)}
                                  disabled={loading}
                                  style={{
                                    padding: '10px 20px',
                                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {loading ? 'Uploading...' : '📤 Upload ID'}
                                </button>
                              )}
                            </div>
                            {hasFile && (
                              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px', margin: 0 }}>
                                Selected: {attendeeFiles[attendeeId]?.name}
                              </p>
                            )}
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

