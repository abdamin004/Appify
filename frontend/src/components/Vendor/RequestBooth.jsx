import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import vendorService from '../../services/vendorService';

export default function RequestBooth() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [formData, setFormData] = useState({
    eventId: '',
    organization: '',
    boothSize: '2x2',
    attendees: [{ name: '', email: '' }],
    setupDurationWeeks: '',
    setupLocation: '',
    notes: ''
  });

  const [message, setMessage] = useState('');

  const setField = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }));

useEffect(() => {
  const load = async () => {
    try {
      // 1) Call services (don’t assume any specific shape)
      const [bzRes, btRes, orgRes] = await Promise.all([
        vendorService.listUpcomingBazaars().catch(() => null),
        vendorService.listUpcomingBooths().catch(() => null),
        (vendorService.listOrganizations?.() ?? Promise.resolve(null)).catch(() => null),
      ]);

      // 2) Universal array extractor
      const toArray = (x) => {
        if (!x) return [];
        if (Array.isArray(x)) return x;
        if (Array.isArray(x.data)) return x.data;

      // NEW: handle common named arrays
        const d = x.data ?? x;
        const keys = ['bazaars', 'booths', 'items', 'organizations', 'orgs', 'results'];
        for (const k of keys) {
          if (Array.isArray(d?.[k])) return d[k];
        }
      return [];
    };


      const rawBazaars = toArray(bzRes);
      const rawBooths  = toArray(btRes);
      const orgsRaw    = toArray(orgRes);

      // 3) Normalize every event so we *always* have idStr + type
      const norm = (arr, forcedType) =>
        arr.map(e => {
          const id = e?._id ?? e?.id;
          const type = e?.type ?? forcedType;   // ensure type present
          return { ...e, _id: id, idStr: String(id), type };
        });

      const bazaars = norm(rawBazaars, 'Bazaar');
      const booths  = norm(rawBooths,  'Booth');

      const merged = [...bazaars, ...booths];
      setEvents(merged);

      // (Optional) autoselect first event so the form is immediately usable
      if (!formData.eventId && merged.length) {
        setFormData(prev => ({ ...prev, eventId: merged[0].idStr }));
      }

      setOrganizations(orgsRaw);

      // Optional: preselect org from localStorage vendor profile
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser && orgsRaw.length) {
          const parsed = JSON.parse(storedUser);
          const companyName = parsed?.companyName || parsed?.companyname || parsed?.company;
          if (companyName) {
            const found = orgsRaw.find(o => (o?.name || '').toLowerCase() === companyName.toLowerCase());
            if (found?.name) {
              setFormData(prev => ({ ...prev, organization: found.name }));
            } else {
              setFormData(prev => ({ ...prev, organization: companyName }));
            }
          }
        }
      } catch {}

      // DEBUG: see what we actually got
      console.log('bazaars:', bazaars);
      console.log('booths:', booths);
      console.log('orgs:', orgsRaw);
    } catch (err) {
      console.error('Failed to load events/orgs', err);
    }
  };
  load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  useEffect(() => {
    const ev = events.find(e => e.idStr === String(formData.eventId));
    setSelectedEvent(ev || null);

    // DEBUG: remove once it works
    console.log('eventId:', formData.eventId);
    console.log('events sample:', events.slice(0, 3).map(x => ({ idStr: x.idStr, type: x.type, title: x.title })));
    console.log('selectedEvent:', ev);
  }, [formData.eventId, events]);

  const updateAttendee = (idx, key, value) => {
    setFormData(prev => {
      const attendees = [...(prev.attendees || [])];
      attendees[idx] = { ...(attendees[idx] || { name: '', email: '' }), [key]: value };
      return { ...prev, attendees };
    });
  };

  const addAttendee = () => {
    setFormData(prev => ({ ...prev, attendees: [...(prev.attendees || []), { name: '', email: '' }] }));
  };

  const removeAttendee = (idx) => {
    setFormData(prev => ({ ...prev, attendees: prev.attendees.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const isBooth = selectedEvent?.type === 'Booth';

    if (!formData.eventId || !formData.organization || !formData.boothSize) {
      return setMessage('Please select event, organization, and booth size');
    }
    if (isBooth) {
      const w = Number(formData.setupDurationWeeks);
      if (!w || w < 1 || w > 4 || !formData.setupLocation) {
        return setMessage('Booth requires setup duration (1–4 weeks) and setup location');
      }
    }

    try {
      const payload = {
        organization: formData.organization,
        boothSize: formData.boothSize,
        attendees: (formData.attendees || []).slice(0, 5).filter(a => a.name && a.email),
        ...(isBooth ? {
          setupDurationWeeks: Number(formData.setupDurationWeeks),
          setupLocation: formData.setupLocation,
        } : {}),
        notes: formData.notes,
      };

      console.log('POST payload:', payload, 'eventId:', formData.eventId);
      
      // eventId must be the URL param, not in body
      await vendorService.applyToEvent(formData.eventId, payload);

      setMessage('Application submitted successfully.');
      setTimeout(() => navigate('/VendorDashboard'), 1000);
      
      } catch (err) {
        console.error('applyToEvent error:', err);
        const msg =
          (err && err.message) ||
          (err && err.error) ||
          (err && err.response && err.response.data && err.response.data.message) ||
          (typeof err === 'string' ? err : JSON.stringify(err));
        setMessage(msg);
      }

  };

  const isBooth = selectedEvent?.type === 'Booth';

  return (
    <div style={{ maxWidth: '800px', margin: '24px auto', padding: '24px' }}>
      <h2 style={{ fontSize: '1.6rem', color: '#003366' }}>Apply to Event (Bazaar / Booth)</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Event</label>
          <select
            name="eventId"
            value={formData.eventId}
            onChange={(e) => setField('eventId', e.target.value)}
            required
            style={{ width: '100%', padding: 10 }}
          >
            <option value="">Select an event</option>
            {events.map(ev => (
              <option key={ev.idStr} value={ev.idStr}>
                {ev.title} — {ev.type} — {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Organization</label>
          <select
            name="organization"
            value={formData.organization}
            onChange={(e) => setField('organization', e.target.value)}
            required
            style={{ width: '100%', padding: 10 }}
          >
            <option value="">Select organization</option>
            {organizations.map(o => (
              <option key={o._id} value={o.name}>{o.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Booth Size</label>
          <select
            name="boothSize"
            value={formData.boothSize}
            onChange={(e) => setField('boothSize', e.target.value)}
            required
            style={{ width: '100%', padding: 10 }}
          >
            <option value="2x2">2x2</option>
            <option value="4x4">4x4</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Attendees (up to 5)</label>
          {(formData.attendees || []).map((a, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input placeholder="Name" value={a.name} onChange={e => updateAttendee(idx, 'name', e.target.value)} style={{ flex: 1, padding: 8 }} />
              <input placeholder="Email" value={a.email} onChange={e => updateAttendee(idx, 'email', e.target.value)} style={{ flex: 1, padding: 8 }} />
              <button type="button" onClick={() => removeAttendee(idx)}>Remove</button>
            </div>
          ))}
          {(formData.attendees || []).length < 5 &&
            <button type="button" onClick={addAttendee}>Add attendee</button>
          }
        </div>

        {/* Booth-only fields */}
        <div style={{ marginBottom: 12, opacity: isBooth ? 1 : 0.6 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Setup duration (weeks)</label>
          <input
            type="number" min={1} max={4}
            value={formData.setupDurationWeeks}
            onChange={e => setField('setupDurationWeeks', e.target.value)}
            required={!!isBooth}
            disabled={!isBooth}
            placeholder="1-4"
            style={{ width: '100%', padding: 8 }}
          />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {isBooth ? 'Required for Booth events.' : 'Required only for Booth events.'}
          </div>
        </div>

        <div style={{ marginBottom: 12, opacity: isBooth ? 1 : 0.6 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Setup location (map slot id)</label>
          <input
            value={formData.setupLocation}
            onChange={e => setField('setupLocation', e.target.value)}
            required={!!isBooth}
            disabled={!isBooth}
            placeholder="e.g., ZB-04"
            style={{ width: '100%', padding: 8 }}
          />
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {isBooth ? 'Required for Booth events.' : 'Required only for Booth events.'}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Notes</label>
          <textarea value={formData.notes} onChange={e => setField('notes', e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
        </div>

        <button type="submit" style={{ padding: '12px 16px', background: '#d4af37', border: 'none', borderRadius: 8 }}>
          Submit Application
        </button>
      </form>

      {message && (
        <div style={{ marginTop: 12, color: message.includes('failed') || message.includes('already') ? '#dc2626' : '#065f46' }}>
          {message}
        </div>
      )}
    </div>
  );
}
