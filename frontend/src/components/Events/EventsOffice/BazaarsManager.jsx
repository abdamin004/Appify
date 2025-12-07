import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { createBazaar, listBazaars, updateEvent, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import Input from '../../UI/Input';
import DateTimePicker from '../../UI/DateTimePicker';
import Button from '../../UI/Button';
import FormLayout from '../../UI/FormLayout';

function BazaarsManager({ editOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const autoEditApplied = useRef(false);
  const editId = editOnly ? params.id : null;

  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    location: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    status: 'published',
  });
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bazaars, setBazaars] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [editData, setEditData] = useState({});

  const clearEditParam = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
    } catch (_) { }
  };

  async function refresh() {
    if (!editOnly) {
      const rows = await listBazaars();
      setBazaars(rows);
    }
  }

  useEffect(() => { refresh(); }, [editOnly]);

  // Load event for editing when in edit-only mode
  useEffect(() => {
    if (editOnly && editId && !editing) {
      loadBazaarForEdit(editId);
    }
  }, [editOnly, editId]);

  const loadBazaarForEdit = async (id) => {
    setLoading(true);
    try {
      const bazaar = await getEventById(id);
      if (bazaar) {
        setEditData({
          title: bazaar.title || '',
          shortDescription: bazaar.shortDescription || '',
          location: bazaar.location || '',
          startDate: bazaar.startDate ? bazaar.startDate.slice(0, 16) : '',
          endDate: bazaar.endDate ? bazaar.endDate.slice(0, 16) : '',
          registrationDeadline: bazaar.registrationDeadline ? bazaar.registrationDeadline.slice(0, 16) : '',
          status: bazaar.status || 'published'
        });
        setAllowedRoles(Array.isArray(bazaar.allowedRoles) ? bazaar.allowedRoles : []);
        setEditing(id);
      } else {
        showToast.error('Bazaar not found');
        navigate('/EventOfficeDashboard');
      }
    } catch (err) {
      showToast.error(err.message || 'Failed to load bazaar');
      navigate('/EventOfficeDashboard');
    } finally {
      setLoading(false);
    }
  };

  // Legacy support: If opened with ?edit=<id>, auto-start editing that bazaar once
  useEffect(() => {
    if (editOnly) return; // Skip if in edit-only mode
    try {
      if (autoEditApplied.current) return;
      const urlParams = new URLSearchParams(window.location.search || "");
      const targetFromQuery = urlParams.get('edit');
      const targetFromState = (location && location.state && location.state.edit) || null;
      const targetId = targetFromState || targetFromQuery;
      if (targetId && !editing && Array.isArray(bazaars) && bazaars.length) {
        const row = bazaars.find(b => String(b._id) === String(targetId));
        if (row) {
          startEdit(row);
          autoEditApplied.current = true;
        }
      }
    } catch (_) {
      // ignore
    }
  }, [bazaars, editing, editOnly]);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Include allowedRoles in the form data
      const payload = {
        ...form,
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      const createdBazaar = await createBazaar(payload);
      showToast.success('Bazaar created successfully');

      const bazaarEvent = createdBazaar?.event || createdBazaar;

      setForm({ title: '', shortDescription: '', location: '', startDate: '', endDate: '', registrationDeadline: '', status: 'published' });
      setAllowedRoles([]);

      // Create notifications for all users if event is published
      if (bazaarEvent && (bazaarEvent.status === 'published' || form.status === 'published')) {
        const { notifyAllUsersAboutNewEvent } = await import('../../../services/eventService');
        notifyAllUsersAboutNewEvent(bazaarEvent);
      }

      await refresh();
      // Redirect to Event Office dashboard
      navigate('/EventOfficeDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to create bazaar');
    } finally { setLoading(false); }
  };

  const startEdit = (row) => {
    setEditing(row._id);
    setEditData({
      title: row.title || '',
      shortDescription: row.shortDescription || '',
      location: row.location || '',
      startDate: row.startDate ? row.startDate.slice(0, 16) : '',
      endDate: row.endDate ? row.endDate.slice(0, 16) : '',
      registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0, 16) : '',
      status: row.status || 'published'
    });
    setAllowedRoles(Array.isArray(row.allowedRoles) ? row.allowedRoles : []);
  };

  const onSave = async (id) => {
    setLoading(true);
    try {
      const payload = {
        ...editData,
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      await updateEvent(id, payload);
      showToast.success('Bazaar updated successfully');
      setEditing(null);
      setEditData({});
      setAllowedRoles([]);
      clearEditParam();
      // Redirect to EventOfficeDashboard after saving
      navigate('/EventOfficeDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to update bazaar');
    } finally {
      setLoading(false);
    }
  };

  if (editing || (editOnly && editId)) {
    return (
      <FormLayout
        title="Edit Bazaar"
        subtitle="Update bazaar details and settings"
        backLink="/EventOfficeDashboard"
      >
        <div className="space-y-6">
          <Input
            label="Title *"
            value={editData.title}
            onChange={e => setEditData({ ...editData, title: e.target.value })}
            required
          />

          <Input
            label="Short Description"
            value={editData.shortDescription}
            onChange={e => setEditData({ ...editData, shortDescription: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateTimePicker
              label="Start Date/Time *"
              value={editData.startDate}
              onChange={e => setEditData({ ...editData, startDate: e.target.value?.target?.value || e.target.value })}
              required
            />
            <DateTimePicker
              label="End Date/Time *"
              value={editData.endDate}
              onChange={e => setEditData({ ...editData, endDate: e.target.value?.target?.value || e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Location *"
              value={editData.location}
              onChange={e => setEditData({ ...editData, location: e.target.value })}
              required
            />
            <DateTimePicker
              label="Registration Deadline"
              value={editData.registrationDeadline}
              onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value?.target?.value || e.target.value })}
            />
          </div>

          <RoleSelector
            selectedRoles={allowedRoles}
            onChange={setAllowedRoles}
            label="Restrict Event to Specific Roles"
          />

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <Button
              onClick={() => onSave(editOnly ? editId : editing)}
              loading={loading}
              className="flex-1"
            >
              Save Changes
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                if (editOnly) navigate('/EventOfficeDashboard');
              }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </FormLayout>
    );
  }

  return (
    <FormLayout
      title="Create Bazaar"
      subtitle="Set up a new bazaar event for vendors and attendees"
      backLink="/EventOfficeDashboard"
    >
      <form onSubmit={onCreate} className="space-y-6">
        <Input
          label="Title *"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          placeholder="e.g. Spring Bazaar 2024"
        />

        <Input
          label="Short Description"
          value={form.shortDescription}
          onChange={e => setForm({ ...form, shortDescription: e.target.value })}
          placeholder="Brief summary of the event..."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateTimePicker
            label="Start Date/Time *"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value?.target?.value || e.target.value })}
            required
          />
          <DateTimePicker
            label="End Date/Time *"
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value?.target?.value || e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Location *"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            required
            placeholder="e.g. Main Campus Square"
          />
          <DateTimePicker
            label="Registration Deadline"
            value={form.registrationDeadline}
            onChange={e => setForm({ ...form, registrationDeadline: e.target.value?.target?.value || e.target.value })}
          />
        </div>

        <RoleSelector
          selectedRoles={allowedRoles}
          onChange={setAllowedRoles}
          label="Restrict Event to Specific Roles"
        />

        <div className="pt-6">
          <Button
            type="submit"
            loading={loading}
            className="w-full text-lg"
          >
            Create Bazaar
          </Button>
        </div>
      </form>
    </FormLayout>
  );
}

export default BazaarsManager;
