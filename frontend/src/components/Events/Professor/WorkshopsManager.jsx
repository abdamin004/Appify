import React, { useEffect, useState, useCallback } from 'react';
import '../../Form.css';
import '../../managerForm.css';
import { createWorkshop, listWorkshopsByProfessor, updateEvent } from '../../../services/eventService';

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

function WorkshopsManager() {
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    location: 'GUC Cairo',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    facultyName: '',
    requiredBudget: '',
    fundingSource: 'Grant',
    extraRequiredResourses: false,
    // New fields
    agenda: '',
    capacity: '',
    professors: [{ name: '', department: '' }],
    status: 'draft',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [professorFilter, setProfessorFilter] = useState('');
  const [workshops, setWorkshops] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const refresh = useCallback(async () => {
    if (!professorFilter) { setWorkshops([]); return; }
    const rows = await listWorkshopsByProfessor(professorFilter.trim());
    setWorkshops(rows);
  }, [professorFilter]);

  // Auto-search as the user types in the search bar
  useEffect(() => { refresh(); }, [refresh]);

  

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      let createdBy;
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const obj = JSON.parse(raw);
          createdBy = (obj && (obj._id || obj.id)) || undefined;
        }
      } catch (_) {}
      if (!createdBy) {
        throw new Error('Please login first. Creator not found.');
      }
      const payload = {
        title: form.title,
        shortDescription: form.shortDescription,
        location: form.location,
        startDate: form.startDate,
        endDate: form.endDate,
        registrationDeadline: form.registrationDeadline,
        status: 'draft',
        facultyName: form.facultyName,
        requiredBudget: Number(form.requiredBudget || 0),
        fundingSource: form.fundingSource,
        extraRequiredResourses: !!form.extraRequiredResourses,
        capacity: Number(form.capacity || 0),
        description: form.agenda || '',
        professors: (form.professors || [])
          .filter(p => (p?.name || '').trim().length > 0)
          .map(p => ({ name: p.name.trim(), department: (p.department || '').trim() })),
        createdBy,
      };
      await createWorkshop(payload);
      setSuccess('Workshop created (awaiting Events Office publish)');
      setForm({
        title: '', shortDescription: '', location: 'GUC Cairo', startDate: '', endDate: '', registrationDeadline: '',
        facultyName: '', requiredBudget: '', fundingSource: 'Grant', extraRequiredResourses: false,
        agenda: '', capacity: '', professors: [{ name: '', department: '' }], status: 'draft'
      });
      await refresh();
    } catch (err) { setError(err.message || 'Failed to create'); }
    finally { setLoading(false); }
  };

  const startEdit = (row) => { setEditing(row._id); setEditData({
    title: row.title || '', shortDescription: row.shortDescription || '', location: row.location || 'GUC Cairo',
    startDate: row.startDate ? row.startDate.slice(0,16) : '', endDate: row.endDate ? row.endDate.slice(0,16) : '',
    registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0,16) : '',
    facultyName: row.facultyName || '', requiredBudget: row.requiredBudget || 0, fundingSource: row.fundingSource || 'Grant',
    extraRequiredResourses: !!row.extraRequiredResourses,
    capacity: row.capacity ?? 0,
    agenda: row.description || '',
    professors: (Array.isArray(row.professors) && row.professors.length > 0) ? row.professors.map(p => ({ name: p.name || '', department: p.department || '' })) : [{ name: '', department: '' }],
  }); };
  const onSave = async (id) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = {
        title: editData.title,
        shortDescription: editData.shortDescription,
        location: editData.location,
        startDate: editData.startDate,
        endDate: editData.endDate,
        registrationDeadline: editData.registrationDeadline,
        facultyName: editData.facultyName,
        requiredBudget: Number(editData.requiredBudget || 0),
        fundingSource: editData.fundingSource,
        extraRequiredResourses: !!editData.extraRequiredResourses,
        capacity: Number(editData.capacity || 0),
        description: editData.agenda || '',
        professors: (editData.professors || [])
          .filter(p => (p?.name || '').trim().length > 0)
          .map(p => ({ name: p.name.trim(), department: (p.department || '').trim() })),
      };
      await updateEvent(id, payload);
      setSuccess('Workshop updated');
      setEditing(null); setEditData({});
      await refresh();
    } catch (err) { setError(err.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  return (
    <div style={pageWrap}>
      <div style={panel}>
        <h1 style={h1Style}>Professor — Workshops</h1>

        <h2 style={sectionTitle}>Create Workshop</h2>
        <form className="form managerForm" onSubmit={onCreate}>
          <label>
            <input className="input" required value={form.title} onChange={e=>setForm({ ...form, title: e.target.value })} />
            <span>Workshop Title</span>
          </label>
          <label>
            <input className="input" value={form.shortDescription} onChange={e=>setForm({ ...form, shortDescription: e.target.value })} />
            <span>Short Description</span>
          </label>
          <div className="flex grid-4">
            <label>
              <select className="input" value={form.location} onChange={e=>setForm({ ...form, location: e.target.value })}>
                <option>GUC Cairo</option>
                <option>GUC Berlin</option>
              </select>
              <span>Location</span>
            </label>
            <label>
              <input className="input" type="datetime-local" placeholder=" " required value={form.startDate} onChange={e=>setForm({ ...form, startDate: e.target.value })} />
              <span>Start Date/Time</span>
            </label>
            <label>
              <input className="input" type="datetime-local" placeholder=" " required value={form.endDate} onChange={e=>setForm({ ...form, endDate: e.target.value })} />
              <span>End Date/Time</span>
            </label>
            <label>
              <input className="input" type="datetime-local" placeholder=" " value={form.registrationDeadline} onChange={e=>setForm({ ...form, registrationDeadline: e.target.value })} />
              <span>Registration Deadline</span>
            </label>
          </div>
          <div className="flex grid-3">
            <label>
              <input className="input" required value={form.facultyName} onChange={e=>setForm({ ...form, facultyName: e.target.value })} />
              <span>Faculty Name</span>
            </label>
            <label>
              <input className="input" type="number" required value={form.requiredBudget} onChange={e=>setForm({ ...form, requiredBudget: e.target.value })} />
              <span>Required Budget</span>
            </label>
            <label>
              <input className="input" type="number" min="0" value={form.capacity} onChange={e=>setForm({ ...form, capacity: e.target.value })} />
              <span>CAPACITY</span>
            </label>
          </div>
          <label>
            <textarea className="input" style={{ minHeight: 90, resize: 'vertical' }} value={form.agenda} onChange={e=>setForm({ ...form, agenda: e.target.value })} />
            <span>Full Agenda</span>
          </label>
          <div className="flex">
            <label>
              <select className="input" value={form.fundingSource} onChange={e=>setForm({ ...form, fundingSource: e.target.value })}>
                <option value="Grant">Grant</option>
                <option value="Sponsor">Sponsor</option>
                <option value="External">External</option>
                <option value="Internal">Internal</option>
              </select>
              <span>Funding Source</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.extraRequiredResourses} onChange={e=>setForm({ ...form, extraRequiredResourses: e.target.checked })} />
              <span>Extra Resources Required</span>
            </label>
          </div>
          <div>
            <div style={{ color: '#003366', fontWeight: 700, margin: '8px 0' }}>Professor(s) Participating</div>
            {(form.professors || []).map((p, idx) => (
              <div key={idx} className="flex" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <label style={{ flex: 1 }}>
                  <input className="input" value={p.name} onChange={e=>{
                    const arr = [...(form.professors || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setForm({ ...form, professors: arr });
                  }} />
                  <span>Professor Name</span>
                </label>
                <label style={{ flex: 1 }}>
                  <input className="input" value={p.department} onChange={e=>{
                    const arr = [...(form.professors || [])]; arr[idx] = { ...arr[idx], department: e.target.value }; setForm({ ...form, professors: arr });
                  }} />
                  <span>Department</span>
                </label>
                <button type="button" className="submit" style={{ background: '#e5e7eb', color: '#111827' }}
                  onClick={()=>{
                    const arr = [...(form.professors || [])]; if (arr.length > 1) { arr.splice(idx,1); setForm({ ...form, professors: arr }); }
                  }}
                  disabled={(form.professors || []).length <= 1}
                >Remove</button>
              </div>
            ))}
            <button type="button" className="submit" style={{ background: yellow, color: '#003366', fontWeight: 700 }}
              onClick={()=> setForm({ ...form, professors: [...(form.professors || []), { name: '', department: '' }] })}
            >Add Professor</button>
          </div>
          <button className="submit" type="submit" disabled={loading} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>
            {loading ? 'Creating...' : 'Submit Workshop'}
          </button>
          {error && <p className="message" style={{ color: 'red' }}>{error}</p>}
          {success && <p className="message" style={{ color: 'green' }}>{success}</p>}
        </form>

        <h2 style={sectionTitle}>My Workshops</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Filter by professor name"
            value={professorFilter}
            onChange={e=>setProfessorFilter(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {workshops.map((w) => (
            <div key={w._id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
              {editing === w._id ? (
                <div>
                  <input className="input" style={{ marginBottom: 8 }} value={editData.title} onChange={e=>setEditData({ ...editData, title: e.target.value })} placeholder="Title" />
                  <select className="input" style={{ marginBottom: 8 }} value={editData.location} onChange={e=>setEditData({ ...editData, location: e.target.value })}>
                    <option>GUC Cairo</option>
                    <option>GUC Berlin</option>
                  </select>
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.startDate} onChange={e=>setEditData({ ...editData, startDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" value={editData.endDate} onChange={e=>setEditData({ ...editData, endDate: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} type="datetime-local" placeholder=" " value={editData.registrationDeadline} onChange={e=>setEditData({ ...editData, registrationDeadline: e.target.value })} />
                  <input className="input" style={{ marginBottom: 8 }} value={editData.facultyName} onChange={e=>setEditData({ ...editData, facultyName: e.target.value })} placeholder="Faculty Name" />
                  <input className="input" style={{ marginBottom: 8 }} type="number" value={editData.requiredBudget} onChange={e=>setEditData({ ...editData, requiredBudget: e.target.value })} placeholder="Required Budget" />
                  <input className="input" style={{ marginBottom: 8 }} type="number" min="0" value={editData.capacity} onChange={e=>setEditData({ ...editData, capacity: e.target.value })} placeholder="CAPACITY" />
                  <select className="input" style={{ marginBottom: 8 }} value={editData.fundingSource} onChange={e=>setEditData({ ...editData, fundingSource: e.target.value })}>
                    <option value="Grant">Grant</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="External">External</option>
                    <option value="Internal">Internal</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input type="checkbox" checked={!!editData.extraRequiredResourses} onChange={e=>setEditData({ ...editData, extraRequiredResourses: e.target.checked })} />
                    <span>Extra Resources Required</span>
                  </label>
                  <textarea className="input" style={{ marginBottom: 8, minHeight: 80 }} placeholder="Full Agenda" value={editData.agenda} onChange={e=>setEditData({ ...editData, agenda: e.target.value })} />
                  <div style={{ color: '#003366', fontWeight: 700, margin: '8px 0' }}>Professor(s) Participating</div>
                  {(editData.professors || []).map((p, idx) => (
                    <div key={idx} className="flex" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ flex: 1 }}>
                        <input className="input" value={p.name} onChange={e=>{
                          const arr = [...(editData.professors || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setEditData({ ...editData, professors: arr });
                        }} />
                        <span>Professor Name</span>
                      </label>
                      <label style={{ flex: 1 }}>
                        <input className="input" value={p.department} onChange={e=>{
                          const arr = [...(editData.professors || [])]; arr[idx] = { ...arr[idx], department: e.target.value }; setEditData({ ...editData, professors: arr });
                        }} />
                        <span>Department</span>
                      </label>
                      <button type="button" className="submit" style={{ background: '#e5e7eb', color: '#111827' }}
                        onClick={()=>{
                          const arr = [...(editData.professors || [])]; if (arr.length > 1) { arr.splice(idx,1); setEditData({ ...editData, professors: arr }); }
                        }}
                        disabled={(editData.professors || []).length <= 1}
                      >Remove</button>
                    </div>
                  ))}
                  <button type="button" className="submit" style={{ background: yellow, color: '#003366', fontWeight: 700, marginBottom: 8 }}
                    onClick={()=> setEditData({ ...editData, professors: [...(editData.professors || []), { name: '', department: '' }] })}
                  >Add Professor</button>
                  <button className="submit" onClick={() => onSave(w._id)} style={{ backgroundColor: yellow, color: '#003366', fontWeight: 700, marginRight: 8 }}>Save</button>
                  <button className="submit" onClick={() => setEditing(null)} style={{ backgroundColor: '#e5e7eb', color: '#111827' }}>Cancel</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, color: '#003366' }}>{w.title}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{w.location} • {w.facultyName}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>From {new Date(w.startDate).toLocaleString()} to {w.endDate ? new Date(w.endDate).toLocaleString() : '—'}</div>
                  <button className="submit" onClick={() => startEdit(w)} style={{ marginTop: 8, backgroundColor: yellow, color: '#003366', fontWeight: 700 }}>Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkshopsManager;