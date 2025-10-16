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
    attendees: [ { name: '', email: '' } ],
    setupDurationWeeks: '',
    setupLocation: '',
    notes: ''
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [bazaarsRes, boothsRes, orgsRes] = await Promise.all([
          vendorService.listUpcomingBazaars().catch(()=>({bazaars:[]})),
          vendorService.listUpcomingBooths().catch(()=>({booths:[]})),
          vendorService.listOrganizations().catch(()=>({organizations:[]}))
        ]);
        const bazaars = bazaarsRes.bazaars || [];
        const booths = boothsRes.booths || [];
        setEvents([...bazaars, ...booths]);
        const orgs = orgsRes.organizations || [];
        setOrganizations(orgs);

        // Prefill organization from logged-in vendor's companyName if available
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            const companyName = parsed && (parsed.companyName || parsed.companyname || parsed.company);
            if (companyName) {
              const found = orgs.find(o => o && (o.name || '').toLowerCase() === companyName.toLowerCase());
              setFormData(prev => ({ ...prev, organization: found ? found.name : companyName }));
            }
          }
        } catch (err) {
          console.warn('Failed to parse stored user for companyName', err);
        }
      } catch (err) {
        console.error('Failed to load events/orgs', err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const ev = events.find(e => e._id === formData.eventId);
    setSelectedEvent(ev || null);
  }, [formData.eventId, events]);

  const setField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const updateAttendee = (idx, key, value) => {
    setFormData(prev => {
      const attendees = [...(prev.attendees || [])];
      attendees[idx] = { ...(attendees[idx] || { name: '', email: '' }), [key]: value };
      return { ...prev, attendees };
    });
  };

  const addAttendee = () => {
    setFormData(prev => ({ ...prev, attendees: [...(prev.attendees||[]), { name:'', email:'' }] }));
  };

  const removeAttendee = (idx) => {
    setFormData(prev => ({ ...prev, attendees: prev.attendees.filter((_,i)=>i!==idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      // Validate minimal required fields
      if (!formData.eventId || !formData.organization || !formData.boothSize) {
  return setMessage('Please select event, organization and booth size');
    }

    const payload = {
    eventId: formData.eventId,
    organization: formData.organization,
    boothSize: formData.boothSize,
    attendees: (formData.attendees || []).slice(0,5).filter(a => a.name && a.email),
    setupDurationWeeks: selectedEvent && selectedEvent.type === 'Booth' ? Number(formData.setupDurationWeeks) : undefined,
    setupLocation: selectedEvent && selectedEvent.type === 'Booth' ? formData.setupLocation : undefined,
    notes: formData.notes,
    eventType: selectedEvent?.type || 'Unknown'  // Add this line!
    };

  // Send the event by name so backend can resolve to the correct id
  const eventKey = selectedEvent?.title || formData.eventId;
  await vendorService.applyToEvent(eventKey, { ...payload, eventName: selectedEvent?.title });
      setMessage('Application submitted successfully.');
      setTimeout(()=> navigate('/VendorDashboard'), 1100);
    } catch (err) {
      console.error(err);
      setMessage(err.message || JSON.stringify(err));
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '24px auto', padding: '24px' }}>
      <h2 style={{ fontSize: '1.6rem', color: '#003366' }}>Apply to Event (Bazaar / Booth)</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Event</label>
          <select name="eventId" value={formData.eventId} onChange={(e)=>setField('eventId', e.target.value)} required style={{ width: '100%', padding: 10 }}>
            <option value="">Select an event</option>
            {events.map(ev => (
              <option key={ev._id} value={ev._id}>{ev.title} — {ev.type} — {new Date(ev.startDate).toLocaleDateString()}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Organization</label>
          <select name="organization" value={formData.organization} onChange={(e)=>setField('organization', e.target.value)} required style={{ width: '100%', padding: 10 }}>
            <option value="">Select organization</option>
            {organizations.map(o => (
              <option key={o._id} value={o.name}>{o.name}</option>
            ))}
            {formData.organization && !organizations.find(o => (o.name||'') === formData.organization) && (
              <option key={formData.organization} value={formData.organization}>{formData.organization} (your company)</option>
            )}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Booth Size</label>
          <select name="boothSize" value={formData.boothSize} onChange={(e)=>setField('boothSize', e.target.value)} required style={{ width: '100%', padding: 10 }}>
            <option value="2x2">2x2</option>
            <option value="4x4">4x4</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Attendees (up to 5)</label>
          {(formData.attendees || []).map((a, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input placeholder="Name" value={a.name} onChange={e=>updateAttendee(idx,'name',e.target.value)} style={{ flex:1, padding:8 }} />
              <input placeholder="Email" value={a.email} onChange={e=>updateAttendee(idx,'email',e.target.value)} style={{ flex:1, padding:8 }} />
              <button type="button" onClick={()=>removeAttendee(idx)}>Remove</button>
            </div>
          ))}
          { (formData.attendees || []).length < 5 && <button type="button" onClick={addAttendee}>Add attendee</button> }
        </div>

        {selectedEvent && selectedEvent.type === 'Booth' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>Setup duration (weeks)</label>
              <input type="number" min={1} max={4} value={formData.setupDurationWeeks} onChange={e=>setField('setupDurationWeeks', e.target.value)} style={{ width:'100%', padding:8 }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 8 }}>Setup location (map slot id)</label>
              <input value={formData.setupLocation} onChange={e=>setField('setupLocation', e.target.value)} style={{ width:'100%', padding:8 }} />
            </div>
          </>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Notes</label>
          <textarea value={formData.notes} onChange={e=>setField('notes', e.target.value)} rows={4} style={{ width:'100%', padding:8 }} />
        </div>

        <button type="submit" style={{ padding: '12px 16px', background: '#d4af37', border: 'none', borderRadius: 8 }}>Submit Application</button>
      </form>

      {message && <div style={{ marginTop: 12, color: message.includes('failed') ? '#dc2626' : '#065f46' }}>{message}</div>}
    </div>
  );
}
