import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import '../../Form.css';
import '../../managerForm.css';
import { createGymSession, listGymSessions, updateGymSession, cancelGymSession } from '../../../services/eventService';

const pageWrap = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)',
  padding: '100px 20px 60px',
};
const panel = {
  maxWidth: 1100,
  margin: '0 auto',
  background: '#fff',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 18px 40px -24px rgba(0,0,0,0.35)',
  border: '1px solid #e5e7eb',
};
const h1Style = { margin: 0, color: '#003366', fontWeight: 800, fontSize: 28, textAlign: 'center' };
const sectionTitle = { color: '#003366', fontWeight: 700, fontSize: 18, marginTop: 8 };
const yellow = '#d4af37';

const SESSION_TYPES = [
  { label: 'Yoga', value: 'yoga' },
  { label: 'Pilates', value: 'pilates' },
  { label: 'Aerobics', value: 'cardio' },
  { label: 'Zumba', value: 'zumba' },
  { label: 'Cross Circuit', value: 'crossfit' },
  { label: 'Kick-boxing', value: 'other' },
];

function GymSessionsManager() {
  const [form, setForm] = useState({
    date: '',
    time: '',
    duration: 60, // minutes
    sessionType: 'yoga',
    instructor: '',
    capacity: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessions, setSessions] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [editData, setEditData] = useState({}); // { date, time, duration }
  const autoEditApplied = useRef(false);
  const location = useLocation();

  const clearEditParam = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
  };

  function toDateInputValue(d) {
    const dt = new Date(d);
    return dt.toISOString().slice(0,10);
  }
  function toTimeInputValue(d) {
    const dt = new Date(d);
    return dt.toISOString().slice(11,16);
  }

  async function refresh() {
    const rows = await listGymSessions();
    setSessions(Array.isArray(rows) ? rows : []);
  }
  useEffect(() => { refresh(); }, []);

  // If opened with ?edit=<id>, auto-start editing that session once
  useEffect(() => {
    try {
      if (autoEditApplied.current) return;
      const params = new URLSearchParams(window.location.search || "");
      const targetFromQuery = params.get('edit');
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
  }, [sessions, editing]);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
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
      };
      await createGymSession(payload);
      setSuccess('Gym session created');
      setForm({ date: '', time: '', duration: 60, sessionType: 'yoga', instructor: '', capacity: '' });
      await refresh();
    } catch (err) { setError(err.message || 'Failed to create'); }
    finally { setLoading(false); }
  };

  const startEdit = (row) => {
    const start = row.startDate ? new Date(row.startDate) : new Date();
    const end = row.endDate ? new Date(row.endDate) : new Date(start.getTime() + 60*60000);
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
  };

  const onSave = async (id) => {
    setLoading(true); setError(''); setSuccess('');
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
      });
      setSuccess('Gym session updated');
      setEditing(null); setEditData({});
      clearEditParam();
      await refresh();
    } catch (err) { setError(err.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  const onCancelEditClick = () => {
    setEditing(null);
    setEditData({});
    clearEditParam();
  };

  const onCancel = async (id) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      await cancelGymSession(id);
      setSuccess('Gym session cancelled');
      await refresh();
    } catch (err) { setError(err.message || 'Failed to cancel'); }
    finally { setLoading(false); }
  };

  return (
    <div style={pageWrap}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 260, height: 260, background: 'rgba(212,175,55,0.12)', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>
      <div style={panel}>
        <h1 style={h1Style}>Events Office – Gym Sessions</h1>

        <h2 style={sectionTitle}>Create Gym Session</h2>
        <form className="form managerForm" onSubmit={onCreate}>
          <div className="flex grid-3">
            <label>
              <input className="input" type="date" required value={form.date} onChange={e=>setForm({ ...form, date: e.target.value })} />
              <span>Date</span>
            </label>
            <label>
              <input className="input" type="time" required value={form.time} onChange={e=>setForm({ ...form, time: e.target.value })} />
              <span>Time</span>
            </label>
            <label>
              <input className="input" type="number" min="10" step="5" required value={form.duration} onChange={e=>setForm({ ...form, duration: e.target.value })} />
              <span>Duration (minutes)</span>
            </label>
          </div>
          <div className="flex grid-2">
            <label>
              <select className="input" value={form.sessionType} onChange={e=>setForm({ ...form, sessionType: e.target.value })}>
                {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <span>Type</span>
            </label>
            <label>
              <input className="input" type="number" min="1" required value={form.capacity} onChange={e=>setForm({ ...form, capacity: e.target.value })} />
              <span>Max Participants</span>
            </label>
          </div>
          <div className="flex">
            <label style={{ width: '100%' }}>
              <input className="input" required value={form.instructor} onChange={e=>setForm({ ...form, instructor: e.target.value })} />
              <span>Instructor</span>
            </label>
          </div>
          <button className="submit" type="submit" disabled={loading} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>
            {loading ? 'Creating...' : 'Create Session'}
          </button>
          {error && <p className="message" style={{ color: 'red' }}>{error}</p>}
          {success && <p className="message" style={{ color: 'green' }}>{success}</p>}
        </form>

        <h2 style={sectionTitle}>Existing Gym Sessions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {sessions.map((s) => (
            <div key={s._id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
              {editing === s._id ? (
                <div>
                  <input className="input" style={{ marginBottom: 8 }} type="date" value={editData.date} onChange={e=>setEditData({ ...editData, date: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="time" value={editData.time} onChange={e=>setEditData({ ...editData, time: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="number" min="10" step="5" value={editData.duration} onChange={e=>setEditData({ ...editData, duration: e.target.value })} />
                  <select className="input" style={{ marginBottom: 8 }} value={editData.sessionType} onChange={e=>setEditData({ ...editData, sessionType: e.target.value })}>
                    {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input className="input" style={{ marginBottom: 8 }} type="number" min="1" value={editData.capacity} onChange={e=>setEditData({ ...editData, capacity: e.target.value })} placeholder="Max Participants" />
                  <input className="input" style={{ marginBottom: 8 }} value={editData.instructor} onChange={e=>setEditData({ ...editData, instructor: e.target.value })} placeholder="Instructor" />
                  <button type="button" className="submit" onClick={() => onSave(s._id)} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700, marginRight: 8 }}>Save</button>
                  <button type="button" className="submit" onClick={onCancelEditClick} style={{ backgroundColor: '#e5e7eb', color: '#111827' }}>Cancel</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, color: '#003366' }}>{s.title || 'Gym Session'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                    {(s.sessionType ? s.sessionType : (s.tags && s.tags[0] ? s.tags[0] : '')) || '-'} • Capacity: {s.capacity ?? '-'}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>From {s.startDate ? new Date(s.startDate).toLocaleString() : '-'} to {s.endDate ? new Date(s.endDate).toLocaleString() : '-'}</div>
                  <div style={{ color: s.status === 'cancelled' ? '#b91c1c' : '#6b7280', fontSize: 12 }}>Status: {s.status}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="submit" onClick={() => startEdit(s)} disabled={s.status === 'cancelled'} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>Edit</button>
                    <button className="submit" onClick={() => onCancel(s._id)} disabled={s.status === 'cancelled'} style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>Cancel Session</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GymSessionsManager;

