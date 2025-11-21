import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { listEventsByType, publicRegisterForEvent, registerForEvent } from "../services/eventService";
import { canUserAccessEvent } from "../services/eventRestrictionService";
import { showToast } from "../utils/toast";

export default function RegisterEvents() {
  // Check if user is logged in and get user info
  const isLoggedIn = (() => {
    try {
      return !!(typeof localStorage !== 'undefined' && localStorage.getItem('token'));
    } catch {
      return false;
    }
  })();

  const getUserInfo = () => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return null;
      const user = JSON.parse(raw);
      return {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || '',
        email: user.email || '',
        id: user.gucId || user.studentId || user.staffId || ''
      };
    } catch {
      return null;
    }
  };

  const userInfo = getUserInfo();
  
  const [form, setForm] = useState({ 
    type: "Trip", 
    name: userInfo?.name || "", 
    email: userInfo?.email || "", 
    id: userInfo?.id || "" 
  });
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const inputStyle = {
    padding: "14px 18px",
    borderRadius: "12px",
    border: "2px solid #e5e7eb",
    background: "#ffffff",
    outline: "none",
    color: "#003366",
    fontSize: "1rem",
    flex: 1,
    minWidth: "220px",
    transition: "all 0.2s ease",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
  };

  function validate() {
    if (!isLoggedIn && (!form.name.trim() || !form.email.trim() || !form.id.trim())) {
      showToast.error("Please fill in name, email, and student/staff ID.");
      return false;
    }
    if (!isLoggedIn) {
      const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      if (!emailRe.test(form.email)) {
        showToast.error("Please enter a valid email address.");
        return false;
      }
    }
    return true;
  }

  // Load existing, upcoming, published events for the chosen type
  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const data = await listEventsByType(form.type);
      //console.log('loadEvents: fetched data for type', form.type, data);
      // support API returning either an array or an object like { events: [] }
      const raw = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const now = new Date();
      
      // Check if there's an eventId in URL params (from QR code)
      const urlParams = new URLSearchParams(window.location.search);
      const eventIdFromUrl = urlParams.get('eventId');
      const typeFromUrl = urlParams.get('type');
      
      const filtered = raw.filter((ev) => {
        // First check if user has access to this event
        const eventId = ev._id || ev.id;
        if (eventId && !canUserAccessEvent(eventId)) {
          console.log('Filtering out restricted event from registration form:', eventId, ev.title);
          return false;
        }
        // Then check if event is upcoming
        const upcoming = ev.startDate ? new Date(ev.startDate) > now : true;
        return upcoming;
      });
      
      if (form.type === 'Workshop' && filtered.length === 0) {
        console.debug('loadEvents: No workshops returned from API', { raw, data });
      }
      
      setEvents(filtered);
      
      // Don't auto-select here - let the useEffect handle it after events are loaded
      // This ensures the type is set correctly first
      if (!eventIdFromUrl && filtered.length && !selectedEventId) {
        setSelectedEventId(filtered[0]._id);
      } else if (!filtered.length) {
        setSelectedEventId("");
      }
    } catch (_) {
      setEvents([]);
      setSelectedEventId("");
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    // Check URL params on mount to set type if coming from QR code
    const urlParams = new URLSearchParams(window.location.search);
    const typeFromUrl = urlParams.get('type');
    const eventIdFromUrl = urlParams.get('eventId');
    
    // Set type from URL if provided (Bazaar, Workshop, Trip, Conference, Booth)
    if (typeFromUrl && (typeFromUrl === 'Bazaar' || typeFromUrl === 'Workshop' || typeFromUrl === 'Trip' || typeFromUrl === 'Conference' || typeFromUrl === 'Booth')) {
      setForm(prev => ({ ...prev, type: typeFromUrl }));
    }
    
    // If eventId is in URL, we'll select it after events load
    if (eventIdFromUrl) {
      console.log('QR Code detected - Event ID:', eventIdFromUrl, 'Type:', typeFromUrl);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type]);

  // Separate effect to handle event selection after events are loaded
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdFromUrl = urlParams.get('eventId');
    const typeFromUrl = urlParams.get('type');
    
    if (eventIdFromUrl && events.length > 0 && typeFromUrl === form.type) {
      const matchingEvent = events.find(ev => {
        const evId = String(ev._id || ev.id);
        return evId === String(eventIdFromUrl);
      });
      
      if (matchingEvent) {
        console.log('Selecting event from QR code:', matchingEvent.title);
        setSelectedEventId(eventIdFromUrl);
      } else {
        console.warn('Event from QR code not found in events list:', eventIdFromUrl);
      }
    }
  }, [events, form.type]);

  async function onSubmit(e) {
    e.preventDefault();

    if (!selectedEventId) {
      showToast.error(`Please select an existing ${form.type} to register for.`);
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    try {
      const token = (typeof localStorage !== 'undefined') ? (localStorage.getItem('token') || '') : '';
      const data = token
        ? await registerForEvent(selectedEventId)
        : await publicRegisterForEvent(selectedEventId, {
            name: form.name,
            email: form.email,
            studentStaffId: form.id,
          });
      showToast.success(data.message || "Registration submitted successfully!");
      // Refresh events to reflect capacity/registration changes
      loadEvents();
      if (!isLoggedIn) {
        setForm((prev) => ({ ...prev, name: "", email: "", id: "" }));
      }
    } catch (err) {
      showToast.error(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #003366 0%, #000d1a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Navbar />

      <div style={{ paddingTop: "120px", padding: "120px 40px 80px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)",
              padding: "40px 45px",
              borderRadius: "24px",
              boxShadow: "0 10px 40px rgba(0,51,102,0.15), 0 2px 8px rgba(0,0,0,0.1)",
              marginBottom: "32px",
              border: "1px solid rgba(0,51,102,0.1)",
            }}
          >
            <h1 style={{ color: "#003366", margin: 0 }}>Register for Event</h1>
            <p style={{ color: "#6b7280", marginTop: "8px" }}>
              Submit your interest for upcoming events. Scan a QR code or select an event below.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)",
              padding: "40px",
              borderRadius: "24px",
              boxShadow: "0 10px 40px rgba(0,51,102,0.15), 0 2px 8px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              border: "1px solid rgba(0,51,102,0.1)",
            }}
          >
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ 
                color: "#003366", 
                fontWeight: 600, 
                alignSelf: "center",
                minWidth: "100px",
                fontSize: "0.95rem",
              }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = "#b8941f";
                  e.target.style.boxShadow = "0 0 0 3px rgba(184, 148, 31, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                }}
              >
                <option value="Trip">🚌 Trip</option>
                <option value="Workshop">🛠️ Workshop</option>
                <option value="Bazaar">🏪 Bazaar</option>
                <option value="Conference">🎤 Conference</option>
                <option value="Booth">🎪 Booth</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ 
                color: "#003366", 
                fontWeight: 600, 
                alignSelf: "center", 
                minWidth: 100,
                fontSize: "0.95rem",
              }}>Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{
                  ...inputStyle,
                  opacity: loadingEvents || events.length === 0 ? 0.6 : 1,
                  cursor: loadingEvents || events.length === 0 ? "not-allowed" : "pointer",
                }}
                disabled={loadingEvents || events.length === 0}
                onFocus={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.borderColor = "#b8941f";
                    e.target.style.boxShadow = "0 0 0 3px rgba(184, 148, 31, 0.1)";
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                }}
              >
                <option value="">
                  {loadingEvents ? "Loading events..." : `Select an existing ${form.type}`}
                </option>
                {events.map((ev) => {
                  const confirmed = (ev && ev.registeredUsers && Array.isArray(ev.registeredUsers)) ? ev.registeredUsers.length : 0;
                  const publicCount = (ev && ev.publicRegistrations && Array.isArray(ev.publicRegistrations)) ? ev.publicRegistrations.length : 0;
                  const isFull = ev.capacity && (confirmed + publicCount) >= ev.capacity;
                  const when = ev.startDate ? new Date(ev.startDate).toLocaleString() : "TBA";
                  const label = `${ev.title || ev.name || ev._id} — ${when}${isFull ? " (Full)" : ""}`;
                  return (
                    <option key={ev._id} value={ev._id} disabled={!!isFull}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Only show form fields if user is not logged in */}
            {!isLoggedIn && (
              <>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ 
                    color: "#003366", 
                    fontWeight: 600, 
                    alignSelf: "center", 
                    minWidth: 100,
                    fontSize: "0.95rem",
                  }}>Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#b8941f";
                      e.target.style.boxShadow = "0 0 0 3px rgba(184, 148, 31, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ 
                    color: "#003366", 
                    fontWeight: 600, 
                    alignSelf: "center", 
                    minWidth: 100,
                    fontSize: "0.95rem",
                  }}>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#b8941f";
                      e.target.style.boxShadow = "0 0 0 3px rgba(184, 148, 31, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ 
                    color: "#003366", 
                    fontWeight: 600, 
                    alignSelf: "center", 
                    minWidth: 140,
                    fontSize: "0.95rem",
                  }}>Student/Staff ID</label>
                  <input
                    type="text"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    placeholder="e.g., 202000123 or ST12345"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#b8941f";
                      e.target.style.boxShadow = "0 0 0 3px rgba(184, 148, 31, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                    }}
                  />
                </div>
              </>
            )}

            {isLoggedIn && (
              <div style={{ 
                padding: "18px 20px", 
                background: "linear-gradient(135deg, rgba(184, 148, 31, 0.12) 0%, rgba(184, 148, 31, 0.08) 100%)", 
                borderRadius: "14px", 
                border: "2px solid rgba(184, 148, 31, 0.3)",
                color: "#003366",
                fontSize: "0.95rem",
                boxShadow: "0 2px 8px rgba(184, 148, 31, 0.15)",
              }}>
                <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>✓</span>
                  Logged in as: {userInfo?.name || userInfo?.email || 'User'}
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "6px" }}>
                  Your account information will be used for registration.
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "16px 32px",
                  background: "linear-gradient(135deg, #b8941f 0%, #9a7a1a 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 6px 20px rgba(184, 148, 31, 0.4)",
                  transition: "all 0.2s ease",
                  opacity: submitting ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 8px 25px rgba(184, 148, 31, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 6px 20px rgba(184, 148, 31, 0.4)";
                }}
              >
                {submitting ? "Submitting..." : "Submit Registration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
