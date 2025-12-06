import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createGymSession, listGymSessions, updateGymSession, cancelGymSession, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast, confirmDialog } from '../../../utils/toast';
import Input from '../../UI/Input';
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
    date: '',
    time: '',
    duration: 60, // minutes
    sessionType: 'yoga',
    instructor: '',
    capacity: '',
  });
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [editData, setEditData] = useState({}); // { date, time, duration }
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
  function toTimeInputValue(d) {
    const dt = new Date(d);
    return dt.toISOString().slice(11, 16);
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
          date: toDateInputValue(start),
          time: toTimeInputValue(start),
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
      if (!form.date || !form.time) throw new Error('Please select date and time');
      if (!form.instructor) throw new Error('Please enter instructor name');
      const start = new Date(`${form.date}T${form.time}:00`);
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

      setForm({ date: '', time: '', duration: 60, sessionType: 'yoga', instructor: '', capacity: '' });
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
      date: toDateInputValue(start),
      time: toTimeInputValue(start),
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
      const start = new Date(`${editData.date}T${editData.time}:00`);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Date *"
              type="date"
              value={editData.date}
              onChange={e => setEditData({ ...editData, date: e.target.value })}
              required
            />
            <Input
              label="Time *"
              type="time"
              value={editData.time}
              onChange={e => setEditData({ ...editData, time: e.target.value })}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Date *"
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            required
          />
          <Input
            label="Time *"
            type="time"
            value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
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

      {!editOnly && (
        <div className="mt-16 pt-10 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Existing Gym Sessions</h2>

          {sessions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No gym sessions scheduled.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map((s) => (
                <div
                  key={s._id}
                  className={`bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group ${s.status === 'cancelled' ? 'opacity-60 bg-slate-50' : ''
                    }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {s.title || 'Gym Session'}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${s.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                      {s.status || 'published'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-500 mb-6">
                    <div className="flex items-center gap-2">
                      <span>🏋️</span>
                      {(s.sessionType ? s.sessionType : (s.tags && s.tags[0] ? s.tags[0] : '')) || '-'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      Capacity: {s.capacity ?? '-'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      {s.startDate ? new Date(s.startDate).toLocaleDateString() : '-'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⏰</span>
                      {s.startDate ? new Date(s.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'} - {s.endDate ? new Date(s.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/events-office/gym-sessions/edit/${s._id}`)}
                      disabled={s.status === 'cancelled'}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      onClick={() => onCancel(s._id)}
                      disabled={s.status === 'cancelled'}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </FormLayout>
  );
}

export default GymSessionsManager;

