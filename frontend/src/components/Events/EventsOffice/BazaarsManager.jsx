import React, { useEffect, useState } from 'react';
import '../../Form.css';
import '../../managerForm.css';
import { createBazaar, listBazaars, updateEvent } from '../../../services/eventService';

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

function BazaarsManager() {
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
  const [bazaars, setBazaars] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [editData, setEditData] = useState({});

  async function refresh() {
    const rows = await listBazaars();
    setBazaars(rows);
  }
  useEffect(() => { refresh(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await createBazaar(form);
      setSuccess('Bazaar created');
      setForm({ title: '', shortDescription: '', location: '', startDate: '', endDate: '', registrationDeadline: '', status: 'published' });
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
      setSuccess('Bazaar updated');
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
        <h1 style={h1Style}>Events Office — Bazaars</h1>

        <h2 style={sectionTitle}>Create Bazaar</h2>
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
              <span>Location</span>
            </label>
            <label>
              <input className="input" type="datetime-local" placeholder=" " value={form.registrationDeadline} onChange={e=>setForm({ ...form, registrationDeadline: e.target.value })} />
              <span>Registration Deadline</span>
            </label>
          </div>
          <button className="submit" type="submit" disabled={loading} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>
            {loading ? 'Creating...' : 'Create Bazaar'}
          </button>
          {error && <p className="message" style={{ color: 'red' }}>{error}</p>}
          {success && <p className="message" style={{ color: 'green' }}>{success}</p>}
        </form>

        <h2 style={sectionTitle}>Existing Bazaars</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {bazaars.map((bz) => (
            <div key={bz._id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
              {editing === bz._id ? (
                <div>
                  <input className="input" style={{ marginBottom: 8 }} value={editData.title} onChange={e=>setEditData({ ...editData, title: e.target.value })} placeholder="Title" />
                  <input className="input" style={{ marginBottom: 8 }} value={editData.shortDescription} onChange={e=>setEditData({ ...editData, shortDescription: e.target.value })} placeholder="Short description" />
                  <input className="input" style={{ marginBottom: 8 }} value={editData.location} onChange={e=>setEditData({ ...editData, location: e.target.value })} placeholder="Location" />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.startDate} onChange={e=>setEditData({ ...editData, startDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" value={editData.endDate} onChange={e=>setEditData({ ...editData, endDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.registrationDeadline} onChange={e=>setEditData({ ...editData, registrationDeadline: e.target.value })} />
                  <button className="submit" onClick={() => onSave(bz._id)} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700, marginRight: 8 }}>Save</button>
                  <button className="submit" onClick={() => setEditing(null)} style={{ backgroundColor: '#e5e7eb', color: '#111827' }}>Cancel</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, color: '#003366' }}>{bz.title}</div>
                  <div style={{ color: '#374151', fontSize: 14 }}>{bz.shortDescription || '—'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>{bz.location}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>From {new Date(bz.startDate).toLocaleString()} to {bz.endDate ? new Date(bz.endDate).toLocaleString() : '—'}</div>
                  <button className="submit" onClick={() => startEdit(bz)} style={{ marginTop: 8, backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BazaarsManager;
