import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createGymSession, listGymSessions, updateGymSession, cancelGymSession, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast, confirmDialog } from '../../../utils/toast';
import Input from '../../UI/Input';
import DateTimePicker from '../../UI/DateTimePicker';
import Select from '../../UI/Select';
import Button from '../../UI/Button';
import FormLayout from '../../UI/FormLayout';

const SESSION_TYPES = [
  { label: 'Yoga', value: 'yoga' },
  { label: 'Pilates', value: 'pilates' },
  { label: 'Aerobics', value: 'cardio' },
  { label: 'Zumba', value: 'zumba' },
  { label: 'Cross Circuit', value: 'crossfit' },
  { label: 'Kick-boxing', value: 'other' },
];

function GymSessionsManager({ editOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [form, setForm] = useState({
    startDate: '',
    duration: 60, // minutes
    sessionType: 'yoga',
    instructor: '',
    capacity: '',
  });
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [editData, setEditData] = useState({ startDate: '', duration: '', sessionType: 'yoga', instructor: '', capacity: '' }); // { startDate, duration }
  const [loadedSession, setLoadedSession] = useState(null); // Store loaded session for edit-only mode
  const autoEditApplied = useRef(false);
  const editId = editOnly ? params.id : null;

  const clearEditParam = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
    } catch (_) { }
  };

  function toDateInputValue(d) {
    const dt = new Date(d);
    return dt.toISOString().slice(0, 10);
  }

  async function refresh() {
    if (!editOnly) {
      const rows = await listGymSessions();
      setSessions(Array.isArray(rows) ? rows : []);
    }
  }
  useEffect(() => { refresh(); }, [editOnly]);

  // Load event for editing when in edit-only mode
  useEffect(() => {
    if (editOnly && editId && !editing) {
      loadSessionForEdit(editId);
    }
  }, [editOnly, editId]);

  const loadSessionForEdit = async (id) => {
    setLoading(true);
    try {
      const session = await getEventById(id);
      if (session) {
        // Store the loaded session so it's available for rendering
        setLoadedSession(session);
        // Also add it to sessions array so the edit form can find it
        setSessions([session]);

        const start = session.startDate ? new Date(session.startDate) : new Date();
        setEditData({
          startDate: start.toISOString(),
          duration: session.durationMinutes || 60,
          sessionType: session.sessionType || 'yoga',
          instructor: session.instructor || '',
          capacity: session.capacity || '',
        });
        setAllowedRoles(Array.isArray(session.allowedRoles) ? session.allowedRoles : []);
        setEditing(id);
      } else {
        showToast.error('Gym session not found');
        navigate('/EventOfficeDashboard');
      }
    } catch (err) {
      showToast.error(err.message || 'Failed to load gym session');
      navigate('/EventOfficeDashboard');
    } finally {
      setLoading(false);
    }
  };

  // Legacy support: If opened with ?edit=<id>, auto-start editing that session once
  useEffect(() => {
    if (editOnly) return; // Skip if in edit-only mode
    try {
      if (autoEditApplied.current) return;
      const urlParams = new URLSearchParams(window.location.search || "");
      const targetFromQuery = urlParams.get('edit');
      const targetFromState = (location && location.state && location.state.edit) || null;
      const targetId = targetFromState || targetFromQuery;
      if (targetId && !editing && Array.isArray(sessions) && sessions.length) {
        const row = sessions.find(s => String(s._id) === String(targetId));
        if (row) {
          startEdit(row);
          autoEditApplied.current = true;
        }
      }
    } catch (_) {
      // ignore
    }
  }, [sessions, editing, editOnly]);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.startDate) throw new Error('Please select date and time');
      if (!form.instructor) throw new Error('Please enter instructor name');
      const start = new Date(form.startDate);
      const end = new Date(start.getTime() + Number(form.duration || 0) * 60000);
      const payload = {
        title: `Gym: ${form.sessionType} Session`,
        shortDescription: `${form.sessionType} - ${form.duration} min`,
        location: 'GUC Gym',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        status: 'published',
        capacity: Number(form.capacity || 0),
        sessionType: form.sessionType,
        instructor: form.instructor,
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      const createdSession = await createGymSession(payload);
      showToast.success('Gym session created successfully');

      const sessionEvent = createdSession?.event || createdSession;

      setForm({ startDate: '', duration: 60, sessionType: 'yoga', instructor: '', capacity: '' });
      setAllowedRoles([]);

      // Create notifications for all users if event is published
      if (sessionEvent && (sessionEvent.status === 'published' || payload.status === 'published')) {
        const { notifyAllUsersAboutNewEvent } = await import('../../../services/eventService');
        notifyAllUsersAboutNewEvent(sessionEvent);
      }

      await refresh();
      // Redirect to Event Office dashboard
      navigate('/EventOfficeDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to create gym session');
    }
    finally { setLoading(false); }
  };

  const startEdit = (row) => {
    const start = row.startDate ? new Date(row.startDate) : new Date();
    const end = row.endDate ? new Date(row.endDate) : new Date(start.getTime() + 60 * 60000);
    const duration = Math.max(0, Math.round((end - start) / 60000));
    setEditing(row._id);
    setEditData({
      startDate: row.startDate ? new Date(row.startDate).toISOString() : '',
      duration: duration || 60,
      sessionType: row.sessionType || 'yoga',
      instructor: row.instructor || '',
      capacity: (row.capacity ?? '').toString(),
    });
    setAllowedRoles(Array.isArray(row.allowedRoles) ? row.allowedRoles : []);
  };

  const onSave = async (id) => {
    setLoading(true);
    try {
      const start = new Date(editData.startDate);
      const end = new Date(start.getTime() + Number(editData.duration || 0) * 60000);
      await updateGymSession(id, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        sessionType: editData.sessionType,
        instructor: editData.instructor,
        capacity: Number(editData.capacity || 0),
        durationMinutes: Number(editData.duration || 0),
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      });
      showToast.success('Gym session updated successfully');
      setEditing(null);
      setEditData({});
      setAllowedRoles([]);
      clearEditParam();
      // Redirect to EventOfficeDashboard after saving
      navigate('/EventOfficeDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to update gym session');
      setLoading(false);
    }
  };

  const onCancel = async (id) => {
    const confirmed = await confirmDialog('Are you sure you want to cancel this gym session?', 'Cancel Gym Session');
    if (!confirmed) return;

    setLoading(true);
    try {
      await cancelGymSession(id);
      showToast.success('Gym session cancelled successfully');
      await refresh();
    } catch (err) {
      showToast.error(err.message || 'Failed to cancel gym session');
    }
    finally { setLoading(false); }
  };

  if (editing || (editOnly && editId)) {
    return (
      <FormLayout
        title="Edit Gym Session"
        subtitle="Update session details"
        backLink="/EventOfficeDashboard"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateTimePicker
              label="Start Date/Time *"
              value={editData.startDate}
              onChange={e => setEditData({ ...editData, startDate: e.target.value?.target?.value || e.target.value })}
              required
            />
            <Input
              label="Duration (minutes) *"
              type="number"
              min="10"
              step="5"
              value={editData.duration}
              onChange={e => setEditData({ ...editData, duration: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Session Type *"
              value={editData.sessionType}
              onChange={e => setEditData({ ...editData, sessionType: e.target.value })}
              options={SESSION_TYPES}
              required
            />
            <Input
              label="Max Participants *"
              type="number"
              min="1"
              value={editData.capacity}
              onChange={e => setEditData({ ...editData, capacity: e.target.value })}
              required
            />
          </div>

          <Input
            label="Instructor *"
            value={editData.instructor}
            onChange={e => setEditData({ ...editData, instructor: e.target.value })}
            required
          />

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
      title="Create Gym Session"
      subtitle="Schedule fitness classes and sessions"
      backLink="/EventOfficeDashboard"
    >
      <form onSubmit={onCreate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateTimePicker
            label="Start Date/Time *"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value?.target?.value || e.target.value })}
            required
          />
          <Input
            label="Duration (minutes) *"
            type="number"
            min="10"
            step="5"
            value={form.duration}
            onChange={e => setForm({ ...form, duration: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Session Type *"
            value={form.sessionType}
            onChange={e => setForm({ ...form, sessionType: e.target.value })}
            options={SESSION_TYPES}
            required
          />
          <Input
            label="Max Participants *"
            type="number"
            min="1"
            value={form.capacity}
            onChange={e => setForm({ ...form, capacity: e.target.value })}
            required
          />
        </div>

        <Input
          label="Instructor *"
          value={form.instructor}
          onChange={e => setForm({ ...form, instructor: e.target.value })}
          required
          placeholder="e.g. John Doe"
        />

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
            Create Session
          </Button>
        </div>
      </form>
    </FormLayout>
  );
}

export default GymSessionsManager;

