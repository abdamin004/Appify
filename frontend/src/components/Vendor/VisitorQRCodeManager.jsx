import React, { useState, useEffect } from 'react';
import { getEventById } from '../../services/eventService';
import vendorService from '../../services/vendorService';
import { showToast } from '../../utils/toast';
import Select from '../UI/Select';

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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Visitor QR Codes</h2>
        <p className="text-slate-500">
          QR codes are automatically sent via email to registered visitors when they register for your event.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <Select
          label="Select Your Event"
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
          options={[
            { value: "", label: "-- Select an approved event --" },
            ...approvedApplications.map(app => {
              const event = app.event;
              const eventId = event?._id || event?.id || app.event;
              const eventTitle = event?.title || 'Unknown Event';
              const eventDate = event?.startDate ? new Date(event.startDate).toLocaleDateString() : '';
              return {
                value: eventId,
                label: `${eventTitle} - ${eventDate} (${app.organization})`
              };
            })
          ]}
        />
        {approvedApplications.length === 0 && (
          <p className="mt-3 text-slate-500 text-sm flex items-center gap-2">
            <span className="text-amber-500">⚠️</span>
            No approved applications found. Your applications must be approved first.
          </p>
        )}
      </div>

      {loading && (
        <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-100">
          <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
          <p className="text-slate-500">Loading visitors...</p>
        </div>
      )}

      {!loading && visitors.length > 0 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-900">
              Registered Visitors ({visitors.length})
            </h3>
            <div className="text-sm font-medium text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              {visitors.filter(v => v.emailSent).length} of {visitors.length} QR code(s) sent via email
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visitors.map((visitor, index) => (
              <div
                key={visitor.id || index}
                className={`p-6 rounded-xl border transition-all hover:shadow-md ${visitor.emailSent
                  ? 'bg-white border-emerald-200 shadow-sm'
                  : 'bg-white border-amber-200 shadow-sm'
                  }`}
              >
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="font-bold text-slate-900 text-lg truncate mb-1">
                        {visitor.name}
                      </div>
                      <div className="text-sm text-slate-500 truncate font-medium">
                        {visitor.email}
                      </div>
                    </div>
                    {visitor.emailSent ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold whitespace-nowrap border border-emerald-200">
                        ✓ Sent
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold whitespace-nowrap border border-amber-200">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600 flex items-center gap-2">
                      <span>📅</span>
                      <span className="font-medium">{visitor.eventDate ? new Date(visitor.eventDate).toLocaleDateString() : 'TBA'}</span>
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-2">
                      <span>📍</span>
                      <span className="font-medium">{visitor.eventLocation || 'Location TBA'}</span>
                    </div>
                  </div>

                  {visitor.emailSent && visitor.emailSentAt && (
                    <div className="text-xs text-emerald-600 mt-4 pt-3 border-t border-emerald-100 flex items-center gap-1">
                      <span>📧</span>
                      QR code sent: {new Date(visitor.emailSentAt).toLocaleString()}
                    </div>
                  )}
                  {!visitor.emailSent && (
                    <div className="text-xs text-amber-600 mt-4 pt-3 border-t border-amber-100 flex items-center gap-1 font-medium">
                      <span>⏳</span>
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
        <div className="bg-white p-20 rounded-2xl text-center shadow-sm border border-slate-100">
          <div className="text-6xl mb-6 opacity-50">👥</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Registered Visitors</h3>
          <p className="text-slate-500">No visitors have registered for this event yet.</p>
        </div>
      )}
    </div>
  );
}

export default VisitorQRCodeManager;
