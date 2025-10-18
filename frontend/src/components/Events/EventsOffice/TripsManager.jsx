import React, { useEffect, useState } from 'react';
import '../../Form.css';
import '../../managerForm.css';
import { createTrip, listTrips, updateEvent } from '../../../services/eventService';

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

function TripsManager() {
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    location: '',
    price: '',
    capacity: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    status: 'published',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [trips, setTrips] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  async function refresh() { const rows = await listTrips(); setTrips(rows); }
  useEffect(() => { refresh(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      await createTrip({ ...form, price: Number(form.price || 0), capacity: Number(form.capacity || 0) });
      setSuccess('Trip created');
      setForm({ title: '', shortDescription: '', location: '', price: '', capacity: '', startDate: '', endDate: '', registrationDeadline: '', status: 'published' });
      await refresh();
    } catch (err) { setError(err.message || 'Failed to create'); }
    finally { setLoading(false); }
  };

  const startEdit = (row) => { setEditing(row._id); setEditData({
    title: row.title || '', shortDescription: row.shortDescription || '', location: row.location || '', price: row.price || 0, capacity: row.capacity || 0,
    startDate: row.startDate ? row.startDate.slice(0,16) : '', endDate: row.endDate ? row.endDate.slice(0,16) : '',
    registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0,16) : '', status: row.status || 'published'
  }); };
  const onSave = async (id) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = { ...editData, price: Number(editData.price || 0), capacity: Number(editData.capacity || 0) };
      await updateEvent(id, payload);
      setSuccess('Trip updated');
      setEditing(null); setEditData({});
      await refresh();
    } catch (err) { setError(err.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  return (
    <div style={pageWrap}>
      <div style={panel}>
        <h1 style={h1Style}>Events Office — Trips</h1>

        <h2 style={sectionTitle}>Create Trip</h2>
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
          <label>
            <input className="input" type="number" required value={form.price} onChange={e=>setForm({ ...form, price: e.target.value })} />
            <span>Price</span>
          </label>
          <label>
            <input className="input" type="number" required value={form.capacity} onChange={e=>setForm({ ...form, capacity: e.target.value })} />
            <span>Capacity</span>
          </label>
          <button className="submit" type="submit" disabled={loading} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
          {error && <p className="message" style={{ color: 'red' }}>{error}</p>}
          {success && <p className="message" style={{ color: 'green' }}>{success}</p>}
        </form>

        <h2 style={sectionTitle}>Existing Trips</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {trips.map((t) => (
            <div key={t._id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
              {editing === t._id ? (
                <div>
                  <input className="input" style={{ marginBottom: 8 }} value={editData.title} onChange={e=>setEditData({ ...editData, title: e.target.value })} placeholder="Title" />
                  <input className="input" style={{ marginBottom: 8 }} value={editData.shortDescription} onChange={e=>setEditData({ ...editData, shortDescription: e.target.value })} placeholder="Short description" />
                  <input className="input" style={{ marginBottom: 8 }} value={editData.location} onChange={e=>setEditData({ ...editData, location: e.target.value })} placeholder="Location" />
                  <input className="input" style={{ marginBottom: 8 }} type="number" value={editData.price} onChange={e=>setEditData({ ...editData, price: e.target.value })} placeholder="Price" />
                  <input className="input" style={{ marginBottom: 8 }} type="number" value={editData.capacity} onChange={e=>setEditData({ ...editData, capacity: e.target.value })} placeholder="Capacity" />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.startDate} onChange={e=>setEditData({ ...editData, startDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" value={editData.endDate} onChange={e=>setEditData({ ...editData, endDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.registrationDeadline} onChange={e=>setEditData({ ...editData, registrationDeadline: e.target.value })} />
                  <button className="submit" onClick={() => onSave(t._id)} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700, marginRight: 8 }}>Save</button>
                  <button className="submit" onClick={() => setEditing(null)} style={{ backgroundColor: '#e5e7eb', color: '#111827' }}>Cancel</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, color: '#003366' }}>{t.title}</div>
                  <div style={{ color: '#374151', fontSize: 14 }}>{t.shortDescription || '—'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>{t.location} • ${t.price}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>Capacity: {t.capacity ?? '-'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>From {new Date(t.startDate).toLocaleString()} to {t.endDate ? new Date(t.endDate).toLocaleString() : '—'}</div>
                  <button className="submit" onClick={() => startEdit(t)} style={{ marginTop: 8, backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TripsManager;
