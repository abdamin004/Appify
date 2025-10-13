import React, { useEffect, useState } from 'react';
import '../../Form.css';
import '../../managerForm.css';
import { createConference, listConferences, updateEvent } from '../../../services/eventService';

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

function ConferencesManager() {
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    status: 'published',
    // Conference-specific fields (frontend only)
    agenda: '',
    website: '',
    requiredBudget: '',
    fundingSource: 'GUC', // 'GUC' or 'external'
    extraRequiredResourses: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confs, setConfs] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  async function refresh() {
    try {
      setListLoading(true);
      const rows = await listConferences();
      setConfs(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error('Failed to load conferences', e);
      setError('Failed to load conferences');
      setConfs([]);
    } finally {
      setListLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      // Backend requires location; send a default since UI omits it
      const payload = { ...form, location: 'N/A' };
      await createConference(payload);
      setSuccess('Conference created');
      setForm({
        title: '',
        shortDescription: '',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        status: 'published',
        agenda: '',
        website: '',
        requiredBudget: '',
        fundingSource: 'GUC',
        extraRequiredResourses: false,
      });
      await refresh();
    } catch (err) {
      setError(err.message || 'Failed to create');
    } finally { setLoading(false); }
  };

  const startEdit = (row) => {
    setEditing(row._id);
    setEditData({
      title: row.title || '',
      shortDescription: row.shortDescription || '',
      startDate: row.startDate ? row.startDate.slice(0,16) : '',
      endDate: row.endDate ? row.endDate.slice(0,16) : '',
      registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0,16) : '',
      status: row.status || 'published',
      // New fields (may not exist on backend yet)
      agenda: row.agenda || '',
      website: row.website || '',
      requiredBudget: row.requiredBudget ?? '',
      fundingSource: row.fundingSource || 'GUC',
      extraRequiredResourses: !!row.extraRequiredResourses,
    });
  };

  const onSave = async (id) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = { ...editData };
      await updateEvent(id, payload);
      setSuccess('Conference updated');
      setEditing(null); setEditData({});
      await refresh();
    } catch (err) { setError(err.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  return (
    <div style={pageWrap}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 260, height: 260, background: 'rgba(212,175,55,0.12)', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>
      <div style={panel}>
        <h1 style={h1Style}>Events Office — Conferences</h1>

        <h2 style={sectionTitle}>Create Conference</h2>
        <form className="form managerForm" onSubmit={onCreate}>
          <label>
            <input className="input" required value={form.title} onChange={e=>setForm({ ...form, title: e.target.value })} />
            <span>Title</span>
          </label>
          <label>
            <input className="input" value={form.shortDescription} onChange={e=>setForm({ ...form, shortDescription: e.target.value })} />
            <span>Short Description</span>
          </label>
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
          <div className="flex grid-2">
            <label>
              <input className="input" type="datetime-local" placeholder=" " value={form.registrationDeadline} onChange={e=>setForm({ ...form, registrationDeadline: e.target.value })} />
              <span>Registration Deadline</span>
            </label>
            <label>
              <input className="input" type="url" placeholder=" " value={form.website} onChange={e=>setForm({ ...form, website: e.target.value })} />
              <span>Conference Website Link</span>
            </label>
          </div>

          <label>
            <textarea className="input" style={{ minHeight: 90, resize: 'vertical' }} value={form.agenda} onChange={e=>setForm({ ...form, agenda: e.target.value })} />
            <span>Full Agenda</span>
          </label>

          <div className="flex grid-2">
            <label>
              <input className="input" type="number" min="0" placeholder=" " value={form.requiredBudget} onChange={e=>setForm({ ...form, requiredBudget: e.target.value })} />
              <span>Required Budget</span>
            </label>
            <label>
              <select className="input" value={form.fundingSource} onChange={e=>setForm({ ...form, fundingSource: e.target.value })}>
                <option value="GUC">GUC</option>
                <option value="external">External</option>
              </select>
              <span>Source of Funding</span>
            </label>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.extraRequiredResourses}
              onChange={e=>setForm({ ...form, extraRequiredResourses: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <span>Extra Required Resources</span>
          </label>
          <button className="submit" type="submit" disabled={loading} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>
            {loading ? 'Creating...' : 'Create Conference'}
          </button>
          {error && <p className="message" style={{ color: 'red' }}>{error}</p>}
          {success && <p className="message" style={{ color: 'green' }}>{success}</p>}
        </form>

        <h2 style={sectionTitle}>Existing Conferences</h2>
        {listLoading && (
          <div style={{ textAlign: 'center', padding: 24, color: '#003366' }}>Loading conferences…</div>
        )}
        {!listLoading && confs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>No conferences yet.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {confs.map((c) => (
            <div key={c._id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
              {editing === c._id ? (
                <div>
                  <input className="input" style={{ marginBottom: 8 }} value={editData.title} onChange={e=>setEditData({ ...editData, title: e.target.value })} placeholder="Title" />
                  <input className="input" style={{ marginBottom: 8 }} value={editData.shortDescription} onChange={e=>setEditData({ ...editData, shortDescription: e.target.value })} placeholder="Short description" />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.startDate} onChange={e=>setEditData({ ...editData, startDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" value={editData.endDate} onChange={e=>setEditData({ ...editData, endDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.registrationDeadline} onChange={e=>setEditData({ ...editData, registrationDeadline: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="url" placeholder="Website" value={editData.website} onChange={e=>setEditData({ ...editData, website: e.target.value })} />
                  <textarea className="input" style={{ marginBottom: 8, minHeight: 80 }} placeholder="Full agenda" value={editData.agenda} onChange={e=>setEditData({ ...editData, agenda: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="number" min="0" placeholder="Required budget" value={editData.requiredBudget} onChange={e=>setEditData({ ...editData, requiredBudget: e.target.value })} />
                  <select className="input" style={{ marginBottom: 8 }} value={editData.fundingSource} onChange={e=>setEditData({ ...editData, fundingSource: e.target.value })}>
                    <option value="GUC">GUC</option>
                    <option value="external">External</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input type="checkbox" checked={!!editData.extraRequiredResourses} onChange={e=>setEditData({ ...editData, extraRequiredResourses: e.target.checked })} />
                    <span>Extra Required Resources</span>
                  </label>
                  <button className="submit" onClick={() => onSave(c._id)} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700, marginRight: 8 }}>Save</button>
                  <button className="submit" onClick={() => setEditing(null)} style={{ backgroundColor: '#e5e7eb', color: '#111827' }}>Cancel</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, color: '#003366' }}>{c.title}</div>
                  <div style={{ color: '#374151', fontSize: 14 }}>{c.shortDescription || '-'}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>From {c.startDate ? new Date(c.startDate).toLocaleString() : '-'} to {c.endDate ? new Date(c.endDate).toLocaleString() : '-'}</div>
                  {c.website && (
                    <div style={{ color: '#003366', fontSize: 12, marginTop: 6 }}>
                      <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#003366', textDecoration: 'underline' }}>Website</a>
                    </div>
                  )}
                  {(c.requiredBudget || c.fundingSource) && (
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
                      {c.requiredBudget ? `Budget: ${c.requiredBudget}` : ''} {c.fundingSource ? ` | Source: ${c.fundingSource}` : ''}
                    </div>
                  )}
                  {c.extraRequiredResourses && (
                    <div style={{ color: '#6b7280', fontSize: 12 }}>Extra resources required</div>
                  )}
                  <button className="submit" onClick={() => startEdit(c)} style={{ marginTop: 8, backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ConferencesManager;
