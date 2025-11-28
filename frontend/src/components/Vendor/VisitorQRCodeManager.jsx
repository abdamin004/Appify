import React, { useState, useEffect } from 'react';
import { getEventById } from '../../services/eventService';
import vendorService from '../../services/vendorService';
import { showToast } from '../../utils/toast';

function VisitorQRCodeManager() {
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState({}); // Track which visitors have received emails

  useEffect(() => {
    loadApprovedApplications();
  }, []);

  const loadApprovedApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
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

  const loadVisitors = async (eventId) => {
    setLoading(true);
    setVisitors([]);
    try {
      const event = await getEventById(eventId);
      const registeredUsers = event?.registeredUsers || [];
      
      // Load email status from localStorage
      const storedStatus = localStorage.getItem(`emailStatus_${eventId}`);
      const emailStatusData = storedStatus ? JSON.parse(storedStatus) : {};
      
      // Process registered users
      const visitorsList = registeredUsers.map((user, index) => {
        const userId = user._id || user.id || user;
        const userName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.name || user.email || `Visitor ${index + 1}`;
        const userEmail = user.email || 'No email provided';
        
        // Check if QR code was already sent via email
        const emailSent = emailStatusData[userId] || false;
        
        return {
          id: userId,
          name: userName,
          email: userEmail,
          eventTitle: event.title,
          eventDate: event.startDate,
          eventLocation: event.location,
          emailSent: emailSent,
          emailSentAt: emailStatusData[`${userId}_sentAt`] || null,
        };
      });
      
      setVisitors(visitorsList);
      setEmailStatus(emailStatusData);
    } catch (err) {
      console.error('Error loading visitors:', err);
      showToast.error('Failed to load visitors: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check for new visitors and automatically send QR codes via email
  useEffect(() => {
    if (!selectedEvent || visitors.length === 0) return;

    const checkAndSendQRCodes = async () => {
      const unsentVisitors = visitors.filter(v => !v.emailSent && v.email);
      if (unsentVisitors.length === 0) return;

      try {
        const token = localStorage.getItem("token");
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
        
        // Prepare email data for unsent visitors
        const emailData = {
          eventId: selectedEvent,
          eventTitle: visitors[0]?.eventTitle || 'Event',
          visitors: unsentVisitors.map(visitor => ({
            email: visitor.email,
            name: visitor.name,
            visitorId: visitor.id,
            eventTitle: visitor.eventTitle,
            eventDate: visitor.eventDate,
            eventLocation: visitor.eventLocation,
          })),
        };

        // Send to backend (backend will handle actual email sending and QR code generation)
        // The endpoint should be: POST /api/vendor/send-visitor-qrcodes
        const res = await fetch(`${API_BASE}/vendor/send-visitor-qrcodes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(emailData),
        });

        if (res.ok) {
          // Mark visitors as email sent
          const updatedStatus = { ...emailStatus };
          const now = new Date().toISOString();
          unsentVisitors.forEach(visitor => {
            updatedStatus[visitor.id] = true;
            updatedStatus[`${visitor.id}_sentAt`] = now;
          });
          
          // Save to localStorage
          localStorage.setItem(`emailStatus_${selectedEvent}`, JSON.stringify(updatedStatus));
          setEmailStatus(updatedStatus);
          
          // Update visitors list
          setVisitors(prev => prev.map(v => ({
            ...v,
            emailSent: updatedStatus[v.id] || v.emailSent,
            emailSentAt: updatedStatus[`${v.id}_sentAt`] || v.emailSentAt,
          })));
        }
      } catch (err) {
        console.error('Error sending QR codes automatically:', err);
        // Silently fail - emails will be sent when backend is ready
      }
    };

    // Check and send after a short delay
    const timer = setTimeout(checkAndSendQRCodes, 1000);
    return () => clearTimeout(timer);
  }, [visitors, selectedEvent, emailStatus]);

  return (
    <div>
      <div style={{ 
        marginBottom: '30px'
      }}>
        <h2 style={{ color: '#003366', margin: 0, marginBottom: '10px' }}>Visitor QR Codes</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          QR codes are automatically sent via email to registered visitors when they register for your event.
        </p>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.95)',
        padding: '25px',
        borderRadius: '15px',
        marginBottom: '30px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}>
        <label style={{ display: 'block', marginBottom: '10px', color: '#003366', fontWeight: 600 }}>
          Select Your Event
        </label>
        <select
          value={selectedEvent || ''}
          onChange={(e) => {
            const eventId = e.target.value;
            setSelectedEvent(eventId);
            if (eventId) {
              loadVisitors(eventId);
            } else {
              setVisitors([]);
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '0.95rem',
            color: '#003366',
          }}
        >
          <option value="">-- Select an approved event --</option>
          {approvedApplications.map(app => {
            const event = app.event;
            const eventId = event?._id || event?.id || app.event;
            const eventTitle = event?.title || 'Unknown Event';
            const eventDate = event?.startDate ? new Date(event.startDate).toLocaleDateString() : '';
            return (
              <option key={app._id || app.id} value={eventId}>
                {eventTitle} - {eventDate} ({app.organization})
              </option>
            );
          })}
        </select>
        {approvedApplications.length === 0 && (
          <p style={{ marginTop: '10px', color: '#6b7280', fontSize: '0.85rem' }}>
            No approved applications found. Your applications must be approved first.
          </p>
        )}
      </div>

      {loading && (
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '40px',
          borderRadius: '15px',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          Loading visitors...
        </div>
      )}

      {!loading && visitors.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '25px',
          borderRadius: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#003366', margin: 0 }}>
              Registered Visitors ({visitors.length})
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              {visitors.filter(v => v.emailSent).length} of {visitors.length} QR code(s) sent via email
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {visitors.map((visitor, index) => (
              <div
                key={visitor.id || index}
                style={{
                  padding: '20px',
                  background: visitor.emailSent ? '#f0fdf4' : '#fef3c7',
                  borderRadius: '12px',
                  border: `2px solid ${visitor.emailSent ? '#86efac' : '#fde047'}`,
                }}
              >
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#003366', marginBottom: '4px', fontSize: '1.1rem' }}>
                        {visitor.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {visitor.email}
                      </div>
                    </div>
                    {visitor.emailSent && (
                      <div style={{
                        padding: '4px 8px',
                        background: '#10b981',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        ✓ Sent
                      </div>
                    )}
                    {!visitor.emailSent && (
                      <div style={{
                        padding: '4px 8px',
                        background: '#f59e0b',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}>
                        Pending
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                    📅 {visitor.eventDate ? new Date(visitor.eventDate).toLocaleDateString() : 'TBA'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    📍 {visitor.eventLocation || 'Location TBA'}
                  </div>
                  {visitor.emailSent && visitor.emailSentAt && (
                    <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '8px', fontStyle: 'italic' }}>
                      QR code sent: {new Date(visitor.emailSentAt).toLocaleString()}
                    </div>
                  )}
                  {!visitor.emailSent && (
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '8px', fontStyle: 'italic' }}>
                      QR code will be sent automatically via email
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && selectedEvent && visitors.length === 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '40px',
          borderRadius: '15px',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
          <h3 style={{ color: '#003366', marginBottom: '10px' }}>No Registered Visitors</h3>
          <p>No visitors have registered for this event yet.</p>
        </div>
      )}
    </div>
  );
}

export default VisitorQRCodeManager;

