import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import vendorService from '../../services/vendorService';
import { showToast } from '../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../utils/designSystem';

export default function RequestBooth() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Get logged-in vendor info
  const getVendorInfo = () => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return null;
      const vendor = JSON.parse(raw);
      return {
        name: `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.email?.split('@')[0] || '',
        email: vendor.email || '',
        companyName: vendor.companyName || vendor.companyname || vendor.company || ''
      };
    } catch {
      return null;
    }
  };

  const vendorInfo = getVendorInfo();
  const initialAttendee = vendorInfo ? { name: vendorInfo.name, email: vendorInfo.email, idNumber: '' } : { name: '', email: '', idNumber: '' };

  const [formData, setFormData] = useState({
    eventId: '',
    organization: vendorInfo?.companyName || '',
    boothSize: '2x2',
    attendees: [initialAttendee],
    setupDurationWeeks: '',
    setupLocation: '',
    notes: ''
  });


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
        const keys = ['events', 'bazaars', 'booths', 'items', 'organizations', 'orgs', 'results'];
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

      // Autoselect first event if available
      if (!formData.eventId && merged.length) {
        setFormData(prev => ({ ...prev, eventId: merged[0].idStr }));
      }

      // Add default organizations if list is empty, or add GUC to the list
      const defaultOrgs = [{ _id: 'default-guc', name: 'GUC' }];
      if (orgsRaw.length === 0) {
        setOrganizations(defaultOrgs);
      } else {
        // Check if GUC already exists, if not add it
        const hasGUC = orgsRaw.some(o => (o.name || '').toLowerCase() === 'guc');
        if (!hasGUC) {
          setOrganizations([...defaultOrgs, ...orgsRaw]);
        } else {
          setOrganizations(orgsRaw);
        }
      }

      // Auto-fill organization from vendor info if not already set
      const currentVendorInfo = getVendorInfo();
      if (currentVendorInfo?.companyName) {
        setFormData(prev => {
          // Only update if organization is empty
          if (prev.organization) return prev;
          const found = orgsRaw.find(o => (o?.name || '').toLowerCase() === currentVendorInfo.companyName.toLowerCase());
          return {
            ...prev,
            organization: found?.name || currentVendorInfo.companyName
          };
        });
      }

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
  }, [formData.eventId, events]);

  const updateAttendee = (idx, key, value) => {
    setFormData(prev => {
      const attendees = [...(prev.attendees || [])];
      attendees[idx] = { ...(attendees[idx] || { name: '', email: '', idNumber: '' }), [key]: value };
      return { ...prev, attendees };
    });
  };

  const addAttendee = () => {
    setFormData(prev => ({ ...prev, attendees: [...(prev.attendees || []), { name: '', email: '', idNumber: '' }] }));
  };

  const removeAttendee = (idx) => {
    setFormData(prev => ({ ...prev, attendees: prev.attendees.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isBooth = selectedEvent?.type === 'Booth';

    if (!formData.eventId || !formData.organization || !formData.boothSize) {
      showToast.error('Please select event, organization, and booth size');
      return;
    }
    
    // Validate attendees have all required fields (name, email, and ID number)
    const validAttendees = (formData.attendees || []).slice(0, 5).filter(a => a.name && a.email && a.idNumber);
    if (formData.attendees.length > 0 && validAttendees.length !== formData.attendees.filter(a => a.name || a.email || a.idNumber).length) {
      showToast.error('All attendees must have name, email, and ID number');
      return;
    }
    
    if (isBooth) {
      const w = Number(formData.setupDurationWeeks);
      if (!w || w < 1 || w > 4 || !formData.setupLocation) {
        showToast.error('Booth requires setup duration (1–4 weeks) and setup location');
        return;
      }
    }

    try {
      const payload = {
        organization: formData.organization,
        boothSize: formData.boothSize,
        attendees: (formData.attendees || []).slice(0, 5).filter(a => a.name && a.email && a.idNumber),
        ...(isBooth ? {
          setupDurationWeeks: Number(formData.setupDurationWeeks),
        } : {}),
        ...(isBooth && formData.setupLocation ? {
          setupLocation: formData.setupLocation,
        } : {}),
        notes: formData.notes,
      };

      console.log('POST payload:', payload, 'eventId:', formData.eventId);
      
      await vendorService.applyToEvent(formData.eventId, payload);

      showToast.success('Application submitted successfully!');
      setTimeout(() => navigate('/VendorDashboard'), 1500);
      
      } catch (err) {
        console.error('applyToEvent error:', err);
        const msg =
          (err && err.message) ||
          (err && err.error) ||
          (err && err.response && err.response.data && err.response.data.message) ||
          (typeof err === 'string' ? err : JSON.stringify(err));
        showToast.error(msg || 'Failed to submit application');
      }

  };

  const isBooth = selectedEvent?.type === 'Booth';

  return (
    <div style={{ 
      minHeight: '100vh',
      background: colors.bgPrimary,
      padding: `${spacing['8xl']} ${spacing.xl} ${spacing['6xl']}`,
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)',
        borderRadius: borderRadius['2xl'],
        padding: spacing['3xl'],
        boxShadow: '0 10px 40px rgba(0,51,102,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        border: `1px solid rgba(0,51,102,0.1)`,
        position: 'relative',
      }}>
        <button
          onClick={() => navigate('/VendorDashboard')}
          style={{
            ...buttonStyles.back,
            marginBottom: spacing.lg,
          }}
          onMouseEnter={(e) => {
            e.target.style.background = colors.accent;
            e.target.style.color = colors.primary;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = colors.primary;
          }}
        >
          ← Back
        </button>
        
        <h2 style={{ 
          fontSize: typography.fontSize['2xl'], 
          color: colors.primary,
          fontWeight: typography.fontWeight.bold,
          marginBottom: spacing.xl,
        }}>Apply to Event (Bazaar / Booth)</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm,
            color: colors.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>Event *</label>
          <select
            name="eventId"
            value={formData.eventId}
            onChange={(e) => setField('eventId', e.target.value)}
            required
            style={{ width: '100%', padding: 10 }}
            disabled={events.length === 0}
          >
            <option value="">{events.length > 0 ? 'Select an event' : 'No upcoming booths or bazaars available'}</option>
            {events.map(ev => (
              <option key={ev.idStr} value={ev.idStr}>
                {ev.title} — {ev.type} — {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : ''}
                {ev.location ? ` — ${ev.location}` : ''}
              </option>
            ))}
          </select>
          {events.length === 0 && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#6b7280' }}>
              Event Office needs to publish upcoming booth/bazaar events before vendors can apply.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Organization</label>
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={(e) => setField('organization', e.target.value)}
            list="organizations-list"
            placeholder="Type or select organization (e.g., GUC)"
            required
            style={{ width: '100%', padding: 10, border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem' }}
          />
          <datalist id="organizations-list">
            {organizations.map(o => (
              <option key={o._id || o.name} value={o.name} />
            ))}
            {organizations.length === 0 && <option value="GUC" />}
          </datalist>
          <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#6b7280' }}>
            💡 Type your organization name (e.g., "GUC") or select from dropdown suggestions
          </div>
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm,
            color: colors.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>Booth Size</label>
          <select
            name="boothSize"
            value={formData.boothSize}
            onChange={(e) => setField('boothSize', e.target.value)}
            required
            style={{ 
              ...inputStyles.base,
              width: '100%',
              padding: '14px 18px',
              border: `2px solid ${colors.gray200}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.accent;
              e.target.style.boxShadow = `0 0 0 3px rgba(184, 148, 31, 0.1)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.gray200;
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }}
          >
            <option value="2x2">2x2</option>
            <option value="4x4">4x4</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 8 }}>Attendees (up to 5) - Name, Email, and ID Number required</label>
          {(formData.attendees || []).map((a, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <input placeholder="Name *" value={a.name || ''} onChange={e => updateAttendee(idx, 'name', e.target.value)} required style={{ flex: 1, minWidth: '150px', padding: 8 }} />
              <input type="email" placeholder="Email *" value={a.email || ''} onChange={e => updateAttendee(idx, 'email', e.target.value)} required style={{ flex: 1, minWidth: '150px', padding: 8 }} />
              <input placeholder="ID Number *" value={a.idNumber || ''} onChange={e => updateAttendee(idx, 'idNumber', e.target.value)} required style={{ flex: 1, minWidth: '120px', padding: 8 }} />
              <button type="button" onClick={() => removeAttendee(idx)} style={{ padding: '8px 12px' }}>Remove</button>
            </div>
          ))}
          {(formData.attendees || []).length < 5 &&
            <button type="button" onClick={addAttendee} style={{ padding: '8px 16px', marginTop: 8 }}>Add attendee</button>
          }
        </div>

        {/* Booth-only fields */}
        <div style={{ marginBottom: spacing.lg, opacity: isBooth ? 1 : 0.6 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.xs,
            color: colors.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>Setup duration (weeks)</label>
          <input
            type="number" min={1} max={4}
            value={formData.setupDurationWeeks}
            onChange={e => setField('setupDurationWeeks', e.target.value)}
            required={!!isBooth}
            disabled={!isBooth}
            placeholder="1-4"
            style={{ 
              ...inputStyles.base,
              width: '100%',
              opacity: !isBooth ? 0.6 : 1,
            }}
          />
          <div style={{ 
            fontSize: typography.fontSize.xs, 
            color: colors.gray500, 
            marginTop: spacing.xs 
          }}>
            {isBooth ? 'Required for Booth events.' : 'Required only for Booth events.'}
          </div>
        </div>

        <div style={{ marginBottom: spacing.lg, opacity: isBooth ? 1 : 0.6 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.xs,
            color: colors.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>Setup location (map slot id)</label>
          <input
            value={formData.setupLocation}
            onChange={e => setField('setupLocation', e.target.value)}
            required={!!isBooth}
            disabled={!isBooth}
            placeholder="e.g., ZB-04"
            style={{ 
              ...inputStyles.base,
              width: '100%',
              opacity: !isBooth ? 0.6 : 1,
            }}
          />
          <div style={{ 
            fontSize: typography.fontSize.xs, 
            color: colors.gray500, 
            marginTop: spacing.xs 
          }}>
            {isBooth ? 'Required for Booth events.' : 'Required only for Booth events.'}
          </div>
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm,
            color: colors.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>Notes</label>
          <textarea 
            value={formData.notes} 
            onChange={e => setField('notes', e.target.value)} 
            rows={4} 
            style={{ 
              ...inputStyles.base,
              width: '100%',
              resize: 'vertical',
              fontFamily: typography.fontFamily,
              padding: '14px 18px',
              border: `2px solid ${colors.gray200}`,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.accent;
              e.target.style.boxShadow = `0 0 0 3px rgba(184, 148, 31, 0.1)`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.gray200;
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }} 
          />
        </div>

        <button 
          type="submit" 
          style={{ 
            ...buttonStyles.primary,
            width: '100%',
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = shadows.accentHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = shadows.accent;
          }}
        >
          Submit Application
        </button>
      </form>
      </div>
    </div>
  );
}
