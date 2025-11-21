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
  const initialAttendee = vendorInfo ? { name: vendorInfo.name, email: vendorInfo.email } : { name: '', email: '' };

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

    const isBooth = selectedEvent?.type === 'Booth';

    if (!formData.eventId || !formData.organization || !formData.boothSize) {
      showToast.error('Please select event, organization, and booth size');
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
          }}>Event</label>
          <select
            name="eventId"
            value={formData.eventId}
            onChange={(e) => setField('eventId', e.target.value)}
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
            <option value="">Select an event</option>
            {events.map(ev => (
              <option key={ev.idStr} value={ev.idStr}>
                {ev.title} — {ev.type} — {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm,
            color: colors.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>Organization</label>
          <select
            name="organization"
            value={formData.organization}
            onChange={(e) => setField('organization', e.target.value)}
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
            <option value="">Select organization</option>
            {organizations.map(o => (
              <option key={o._id} value={o.name}>{o.name}</option>
            ))}
          </select>
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

        <div style={{ marginBottom: spacing.lg }}>
          <label style={{ 
            display: 'block', 
            marginBottom: spacing.sm,
            color: colors.primary,
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.base,
          }}>Attendees (up to 5)</label>
          {vendorInfo && formData.attendees?.[0]?.name && (
            <div style={{ 
              padding: `${spacing.md} ${spacing.lg}`, 
              background: 'linear-gradient(135deg, rgba(184, 148, 31, 0.12) 0%, rgba(184, 148, 31, 0.08) 100%)', 
              borderRadius: borderRadius.lg, 
              marginBottom: spacing.sm, 
              fontSize: typography.fontSize.sm, 
              color: colors.primary,
              border: '2px solid rgba(184, 148, 31, 0.3)',
              boxShadow: '0 2px 8px rgba(184, 148, 31, 0.15)',
            }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>✓</span>
                First attendee auto-filled with your account info
              </strong>
            </div>
          )}
          {(formData.attendees || []).map((a, idx) => (
            <div key={idx} style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.sm }}>
              <input 
                placeholder="Name" 
                value={a.name} 
                onChange={e => updateAttendee(idx, 'name', e.target.value)} 
                style={{ 
                  ...inputStyles.base,
                  flex: 1,
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
              <input 
                placeholder="Email" 
                value={a.email} 
                onChange={e => updateAttendee(idx, 'email', e.target.value)} 
                style={{ 
                  ...inputStyles.base,
                  flex: 1,
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
              <button 
                type="button" 
                onClick={() => removeAttendee(idx)}
                style={{
                  ...buttonStyles.outline,
                  padding: `${spacing.sm} ${spacing.md}`,
                  fontSize: typography.fontSize.sm,
                }}
              >
                Remove
              </button>
            </div>
          ))}
          {(formData.attendees || []).length < 5 &&
            <button 
              type="button" 
              onClick={addAttendee}
              style={{
                ...buttonStyles.secondary,
                padding: `${spacing.sm} ${spacing.md}`,
                fontSize: typography.fontSize.sm,
              }}
            >
              Add attendee
            </button>
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
