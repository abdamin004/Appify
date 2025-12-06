import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import vendorService from '../../services/vendorService';
import { showToast } from '../../utils/toast';
import Input from '../UI/Input';
import Select from '../UI/Select';
import Button from '../UI/Button';
import FormLayout from '../UI/FormLayout';

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
        const rawBooths = toArray(btRes);
        const orgsRaw = toArray(orgRes);

        // 3) Normalize every event so we *always* have idStr + type
        const norm = (arr, forcedType) =>
          arr.map(e => {
            const id = e?._id ?? e?.id;
            const type = e?.type ?? forcedType;   // ensure type present
            return { ...e, _id: id, idStr: String(id), type };
          });

        const bazaars = norm(rawBazaars, 'Bazaar');
        const booths = norm(rawBooths, 'Booth');

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
    <FormLayout
      title="Apply to Event"
      subtitle="Submit application for Bazaar or Booth"
      backLink="/VendorDashboard"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Select
          label="Event *"
          name="eventId"
          value={formData.eventId}
          onChange={(e) => setField('eventId', e.target.value)}
          required
          disabled={events.length === 0}
          options={[
            { value: "", label: events.length > 0 ? 'Select an event' : 'No upcoming booths or bazaars available' },
            ...events.map(ev => ({
              value: ev.idStr,
              label: `${ev.title} — ${ev.type} — ${ev.startDate ? new Date(ev.startDate).toLocaleDateString() : ''}${ev.location ? ` — ${ev.location}` : ''}`
            }))
          ]}
          helperText={events.length === 0 ? "Event Office needs to publish upcoming booth/bazaar events before vendors can apply." : ""}
        />

        <div>
          <Input
            label="Organization"
            name="organization"
            value={formData.organization}
            onChange={(e) => setField('organization', e.target.value)}
            list="organizations-list"
            placeholder="Type or select organization (e.g., GUC)"
            required
            helperText='💡 Type your organization name (e.g., "GUC") or select from dropdown suggestions'
          />
          <datalist id="organizations-list">
            {organizations.map(o => (
              <option key={o._id || o.name} value={o.name} />
            ))}
            {organizations.length === 0 && <option value="GUC" />}
          </datalist>
        </div>

        <Select
          label="Booth Size"
          name="boothSize"
          value={formData.boothSize}
          onChange={(e) => setField('boothSize', e.target.value)}
          required
          options={[
            { value: "2x2", label: "2x2" },
            { value: "4x4", label: "4x4" }
          ]}
        />

        <div className="border-t border-slate-200 pt-6">
          <label className="block text-sm font-semibold text-slate-700 mb-4">
            Attendees (up to 5) - Name, Email, and ID Number required
          </label>
          <div className="space-y-4">
            {(formData.attendees || []).map((a, idx) => (
              <div key={idx} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex-1 w-full">
                  <Input
                    placeholder="Name *"
                    value={a.name || ''}
                    onChange={e => updateAttendee(idx, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1 w-full">
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={a.email || ''}
                    onChange={e => updateAttendee(idx, 'email', e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1 w-full">
                  <Input
                    placeholder="ID Number *"
                    value={a.idNumber || ''}
                    onChange={e => updateAttendee(idx, 'idNumber', e.target.value)}
                    required
                  />
                </div>
                <Button
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 mb-[2px]"
                  onClick={() => removeAttendee(idx)}
                  type="button"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          {(formData.attendees || []).length < 5 &&
            <Button
              variant="outline"
              onClick={addAttendee}
              className="mt-4 border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              type="button"
            >
              + Add attendee
            </Button>
          }
        </div>

        {/* Booth-only fields */}
        <div className={`transition-all duration-300 ${isBooth ? 'opacity-100' : 'opacity-60 grayscale'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Setup duration (weeks)"
              type="number" min={1} max={4}
              value={formData.setupDurationWeeks}
              onChange={e => setField('setupDurationWeeks', e.target.value)}
              required={!!isBooth}
              disabled={!isBooth}
              placeholder="1-4"
              helperText={isBooth ? 'Required for Booth events.' : 'Required only for Booth events.'}
            />

            <Input
              label="Setup location (map slot id)"
              value={formData.setupLocation}
              onChange={e => setField('setupLocation', e.target.value)}
              required={!!isBooth}
              disabled={!isBooth}
              placeholder="e.g., ZB-04"
              helperText={isBooth ? 'Required for Booth events.' : 'Required only for Booth events.'}
            />
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold text-slate-700">Notes</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={e => setField('notes', e.target.value)}
            rows={4}
            className="textarea w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
            placeholder="Any additional information..."
          />
        </div>

        <div className="pt-6">
          <Button
            type="submit"
            className="w-full text-lg"
          >
            Submit Application
          </Button>
        </div>
      </form>
    </FormLayout>
  );
}
