import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { listEventsByType, publicRegisterForEvent, registerForEvent } from "../services/eventService";
import { canUserAccessEvent } from "../services/eventRestrictionService";
import { showToast } from "../utils/toast";
import Input from "./UI/Input";
import Select from "./UI/Select";
import Button from "./UI/Button";
import FormLayout from "./UI/FormLayout";

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
      // support API returning either an array or an object like { events: [] }
      const raw = Array.isArray(data) ? data : (Array.isArray(data?.events) ? data.events : []);
      const now = new Date();

      // Check if there's an eventId in URL params (from QR code)
      const urlParams = new URLSearchParams(window.location.search);
      const eventIdFromUrl = urlParams.get('eventId');

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
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <FormLayout
          title="Register for Event"
          subtitle="Submit your interest for upcoming events. Scan a QR code or select an event below."
          maxWidth="max-w-3xl"
        >
          <form onSubmit={onSubmit} className="space-y-6">
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={[
                { value: "Trip", label: "🚌 Trip" },
                { value: "Workshop", label: "🛠️ Workshop" },
                { value: "Bazaar", label: "🏪 Bazaar" },
                { value: "Conference", label: "🎤 Conference" },
                { value: "Booth", label: "🎪 Booth" }
              ]}
            />

            <Select
              label="Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={loadingEvents || events.length === 0}
              options={[
                { value: "", label: loadingEvents ? "Loading events..." : `Select an existing ${form.type}` },
                ...events.map((ev) => {
                  const confirmed = (ev && ev.registeredUsers && Array.isArray(ev.registeredUsers)) ? ev.registeredUsers.length : 0;
                  const publicCount = (ev && ev.publicRegistrations && Array.isArray(ev.publicRegistrations)) ? ev.publicRegistrations.length : 0;
                  const isFull = ev.capacity && (confirmed + publicCount) >= ev.capacity;
                  const when = ev.startDate ? new Date(ev.startDate).toLocaleString() : "TBA";
                  const label = `${ev.title || ev.name || ev._id} — ${when}${isFull ? " (Full)" : ""}`;
                  return { value: ev._id, label, disabled: !!isFull };
                })
              ]}
            />

            {/* Only show form fields if user is not logged in */}
            {!isLoggedIn && (
              <>
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                />

                <Input
                  type="email"
                  label="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                />

                <Input
                  label="Student/Staff ID"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  placeholder="e.g., 202000123 or ST12345"
                />
              </>
            )}

            {isLoggedIn && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 shadow-sm">
                <strong className="flex items-center gap-2 mb-1">
                  <span className="text-xl">✓</span>
                  Logged in as: {userInfo?.name || userInfo?.email || 'User'}
                </strong>
                <div className="text-sm text-amber-800/80 ml-7">
                  Your account information will be used for registration.
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button
                type="submit"
                loading={submitting}
                className="w-full text-lg"
              >
                Submit Registration
              </Button>
            </div>
          </form>
        </FormLayout>
      </div>
    </div>
  );
}
