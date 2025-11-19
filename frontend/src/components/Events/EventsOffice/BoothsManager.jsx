import React, { useEffect, useState } from 'react';
import '../../Form.css';
import '../../managerForm.css';
import { createBooth, listBooths, updateEvent } from '../../../services/eventService';

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
const h1Style = {
  margin: 0,
  color: '#003366',
  fontWeight: 800,
  fontSize: 28,
  textAlign: 'center',
};
const sectionTitle = { color: '#003366', fontWeight: 700, fontSize: 18, marginTop: 8 };
const yellow = '#d4af37';

function BoothsManager() {
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    location: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    status: 'published',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [booths, setBooths] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [editData, setEditData] = useState({});

  async function refresh() {
    const rows = await listBooths();
    setBooths(rows);
  }
  useEffect(() => { refresh(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const createdBooth = await createBooth(form);
      setSuccess('Booth created');
      setForm({ title: '', shortDescription: '', location: '', startDate: '', endDate: '', registrationDeadline: '', status: 'published' });
      
      // Create notifications for all users if event is published
      const boothEvent = createdBooth?.event || createdBooth;
      if (boothEvent && (boothEvent.status === 'published' || form.status === 'published')) {
        const { notifyAllUsersAboutNewEvent } = await import('../../../services/eventService');
        notifyAllUsersAboutNewEvent(boothEvent);
      }
      
      await refresh();
    } catch (err) {
      setError(err.message || 'Failed to create');
    } finally { setLoading(false); }
  };

  const startEdit = (row) => { setEditing(row._id); setEditData({
    title: row.title || '', shortDescription: row.shortDescription || '', location: row.location || '',
    startDate: row.startDate ? row.startDate.slice(0,16) : '', endDate: row.endDate ? row.endDate.slice(0,16) : '',
    registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0,16) : '', status: row.status || 'published'
  }); };
  const onSave = async (id) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = { ...editData };
      await updateEvent(id, payload);
      setSuccess('Booth updated');
      setEditing(null); setEditData({});
      await refresh();
    } catch (err) {
      setError(err.message || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div style={pageWrap}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 260, height: 260, background: 'rgba(212,175,55,0.12)', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>
      <div style={panel}>
        <h1 style={h1Style}>Events Office — Booths</h1>

        <h2 style={sectionTitle}>Create Booth</h2>
        <form className="form managerForm" onSubmit={onCreate}>
          <label>
            <input className="input" required value={form.title} onChange={e=>setForm({ ...form, title: e.target.value })} />
            <span>Title</span>
          </label>
          <label>
            <input className="input" value={form.shortDescription} onChange={e=>setForm({ ...form, shortDescription: e.target.value })} />
            <span>Short Description</span>
          </label>
          {/* Row 1: Start / End */}
          <div className="flex grid-2">
            <label>
              <input className="input" type="datetime-local" placeholder=" " required value={form.startDate} onChange={e=>setForm({ ...form, startDate: e.target.value })} />
              <span>Start Date/Time</span>
            </label>
            <label>
              <input className="input" type="datetime-local" placeholder=" " required value={form.endDate} onChange={e=>setForm({ ...form, endDate: e.target.value })} />
              <span>End Date/Time</span>
            </label>
          </div>
          {/* Row 2: Location / Deadline */}
          <div className="flex grid-2">
            <label>
              <input className="input" required value={form.location} onChange={e=>setForm({ ...form, location: e.target.value })} />
              <span>Location (Booth Setup Location)</span>
            </label>
            <label>
              <input className="input" type="datetime-local" placeholder=" " value={form.registrationDeadline} onChange={e=>setForm({ ...form, registrationDeadline: e.target.value })} />
              <span>Registration Deadline</span>
            </label>
          </div>
          <div className="flex grid-2">
            <label>
              <select className="input" value={form.status} onChange={e=>setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              <span>Status</span>
            </label>
          </div>
          <button type="submit" disabled={loading} style={{ background: yellow, color: '#003366', fontWeight: 700, padding: '12px 24px', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating...' : 'Create Booth'}
          </button>
        </form>

        {error && <div style={{ color: '#dc2626', marginTop: 12 }}>{error}</div>}
        {success && <div style={{ color: '#065f46', marginTop: 12 }}>{success}</div>}

        <h2 style={sectionTitle}>Existing Booths</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Title</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Location</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Start</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>End</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {booths.map(row => (
                <tr key={row._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {editing === row._id ? (
                    <>
                      <td><input className="input" value={editData.title} onChange={e=>setEditData({...editData, title: e.target.value})} style={{ width: '100%', padding: 6 }} /></td>
                      <td><input className="input" value={editData.location} onChange={e=>setEditData({...editData, location: e.target.value})} style={{ width: '100%', padding: 6 }} /></td>
                      <td><input className="input" type="datetime-local" value={editData.startDate} onChange={e=>setEditData({...editData, startDate: e.target.value})} style={{ width: '100%', padding: 6 }} /></td>
                      <td><input className="input" type="datetime-local" value={editData.endDate} onChange={e=>setEditData({...editData, endDate: e.target.value})} style={{ width: '100%', padding: 6 }} /></td>
                      <td>
                        <select className="input" value={editData.status} onChange={e=>setEditData({...editData, status: e.target.value})} style={{ width: '100%', padding: 6 }}>
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                        </select>
                      </td>
                      <td>
                        <button onClick={() => onSave(row._id)} style={{ background: yellow, color: '#003366', padding: '6px 12px', border: 'none', borderRadius: 4, marginRight: 8, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => { setEditing(null); setEditData({}); }} style={{ background: '#6b7280', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: 12 }}>{row.title}</td>
                      <td style={{ padding: 12 }}>{row.location}</td>
                      <td style={{ padding: 12 }}>{row.startDate ? new Date(row.startDate).toLocaleString() : ''}</td>
                      <td style={{ padding: 12 }}>{row.endDate ? new Date(row.endDate).toLocaleString() : ''}</td>
                      <td style={{ padding: 12 }}><span style={{ padding: '4px 8px', borderRadius: 4, background: row.status === 'published' ? '#d1fae5' : '#fef3c7', color: row.status === 'published' ? '#065f46' : '#92400e' }}>{row.status}</span></td>
                      <td style={{ padding: 12 }}>
                        <button onClick={() => startEdit(row)} style={{ background: yellow, color: '#003366', padding: '6px 12px', border: 'none', borderRadius: 4, marginRight: 8, cursor: 'pointer' }}>Edit</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BoothsManager;

