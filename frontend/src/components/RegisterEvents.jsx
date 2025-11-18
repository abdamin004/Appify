import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { listEventsByType, publicRegisterForEvent, registerForEvent } from "../services/eventService";
import { canUserAccessEvent } from "../services/eventRestrictionService";

export default function RegisterEvents() {
  const [form, setForm] = useState({ type: "Trip", name: "", email: "", id: "" });
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const inputStyle = {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    background: "#fff",
    outline: "none",
    color: "#003366",
    fontSize: "1rem",
    flex: 1,
    minWidth: "220px",
  };

  function validate() {
    if (!form.name.trim() || !form.email.trim() || !form.id.trim()) {
      setError("Please fill in name, email, and student/staff ID.");
      return false;
    }
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRe.test(form.email)) {
      setError("Please enter a valid email address.");
      return false;
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
    setError("");
    setSuccess("");

    if (!selectedEventId) {
      setError(`Please select an existing ${form.type} to register for.`);
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
      setSuccess(data.message || "Registration submitted successfully.");
      // Refresh events to reflect capacity/registration changes
      loadEvents();
      setForm((prev) => ({ ...prev, name: "", email: "", id: "" }));
    } catch (err) {
      setError(err.message || "Submission failed");
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
              background: "rgba(255,255,255,0.95)",
              padding: "35px 40px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              marginBottom: "30px",
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
              background: "rgba(255,255,255,0.95)",
              padding: "30px",
              borderRadius: "20px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center" }}>Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={inputStyle}
              >
                <option value="Trip">🚌 Trip</option>
                <option value="Workshop">🛠️ Workshop</option>
                <option value="Bazaar">🏪 Bazaar</option>
                <option value="Conference">🎤 Conference</option>
                <option value="Booth">🎪 Booth</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center", minWidth: 100 }}>Event</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={inputStyle}
                disabled={loadingEvents || events.length === 0}
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

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center", minWidth: 100 }}>Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center", minWidth: 100 }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ color: "#003366", fontWeight: 600, alignSelf: "center", minWidth: 140 }}>Student/Staff ID</label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="e.g., 202000123 or ST12345"
                style={inputStyle}
              />
            </div>


            {error && (
              <div style={{ color: "#b91c1c", fontWeight: 600 }}>{error}</div>
            )}
            {success && (
              <div style={{ color: "#065f46", fontWeight: 600 }}>{success}</div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "14px 24px",
                  background: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)",
                  color: "#003366",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(212, 175, 55, 0.4)",
                }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
