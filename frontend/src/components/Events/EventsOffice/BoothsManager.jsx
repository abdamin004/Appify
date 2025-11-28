import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import '../../Form.css';
import '../../managerForm.css';
import { createBooth, listBooths, updateEvent, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, buttonStyles, inputStyles } from '../../../utils/designSystem';

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
  const [allowedRoles, setAllowedRoles] = useState([]);
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
      const payload = {
        ...form,
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      const createdBooth = await createBooth(payload);
      showToast.success('Booth created successfully');
      
      const boothEvent = createdBooth?.event || createdBooth;
      
      setForm({ title: '', shortDescription: '', location: '', startDate: '', endDate: '', registrationDeadline: '', status: 'published' });
      setAllowedRoles([]);
      
      // Create notifications for all users if event is published
      if (boothEvent && (boothEvent.status === 'published' || form.status === 'published')) {
        const { notifyAllUsersAboutNewEvent } = await import('../../../services/eventService');
        notifyAllUsersAboutNewEvent(boothEvent);
      }
      
      await refresh();
      navigate('/EventOfficeDashboard');
    } catch (err) {
      const errorMsg = err.message || 'Failed to create booth';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally { setLoading(false); }
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      await updateEvent(editing, editData);
      showToast.success('Booth updated successfully');
      setEditing(null);
      setEditData({});
      await refresh();
    } catch (err) {
      const errorMsg = err.message || 'Failed to update booth';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally { setLoading(false); }
  };

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgPrimary,
      padding: `${spacing['8xl']} ${spacing.xl} ${spacing['6xl']}`,
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{ 
          position: 'absolute', 
          top: -40, 
          right: -40, 
          width: 260, 
          height: 260, 
          background: 'rgba(212,175,55,0.12)', 
          borderRadius: '50%', 
          filter: 'blur(60px)' 
        }} />
      </div>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)',
        borderRadius: borderRadius['2xl'],
        padding: spacing['3xl'],
        boxShadow: '0 10px 40px rgba(0,51,102,0.15), 0 2px 8px rgba(0,0,0,0.1)',
        border: `1px solid rgba(0,51,102,0.1)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.md }}>
          <button
            onClick={() => navigate('/EventOfficeDashboard')}
            style={{
              ...buttonStyles.back,
              background: colors.bgCard,
              color: colors.primary,
              borderColor: colors.primary
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.accent;
              e.target.style.color = colors.primary;
              e.target.style.borderColor = colors.accent;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.bgCard;
              e.target.style.color = colors.primary;
              e.target.style.borderColor = colors.primary;
            }}
          >
            ← Back
          </button>
        </div>
        <h1 style={{
          margin: 0,
          color: colors.primary,
          fontWeight: typography.fontWeight.extrabold,
          fontSize: typography.fontSize['2xl'],
          textAlign: 'center',
          marginBottom: spacing['2xl']
        }}>Events Office — Booths</h1>

        <h2 style={{ 
          color: colors.primary, 
          fontWeight: typography.fontWeight.bold, 
          fontSize: typography.fontSize.lg, 
          marginTop: spacing.xl,
          marginBottom: spacing.lg,
        }}>Create Booth</h2>
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
          <RoleSelector 
            selectedRoles={allowedRoles}
            onChange={setAllowedRoles}
            label="Restrict Event to Specific Roles"
          />
          <button 
            className="submit" 
            type="submit" 
            disabled={loading} 
            style={{ 
              ...buttonStyles.primary,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.boxShadow = shadows.accentHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.boxShadow = shadows.accent;
              }
            }}
          >
            {loading ? 'Creating...' : 'Create Booth'}
          </button>
        </form>


        <h2 style={{ 
          color: colors.primary, 
          fontWeight: typography.fontWeight.bold, 
          fontSize: typography.fontSize.lg, 
          marginTop: spacing['2xl'],
          marginBottom: spacing.lg,
        }}>Existing Booths</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {booths.map(b => (
            <div key={b._id || b.id} style={{ 
              padding: spacing.xl, 
              background: colors.white, 
              borderRadius: borderRadius.xl, 
              border: `1px solid ${colors.gray200}`,
              boxShadow: shadows.md,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#003366' }}>{b.title}</h3>
                  {b.shortDescription && <p style={{ margin: '4px 0', color: '#6b7280' }}>{b.shortDescription}</p>}
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 8 }}>
                    <div>📍 {b.location}</div>
                    <div>📅 {b.startDate ? new Date(b.startDate).toLocaleString() : 'N/A'} - {b.endDate ? new Date(b.endDate).toLocaleString() : 'N/A'}</div>
                    <div>Status: <strong>{b.status || 'published'}</strong></div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditing(b._id || b.id);
                    setEditData({ title: b.title, shortDescription: b.shortDescription, location: b.location, startDate: b.startDate ? new Date(b.startDate).toISOString().slice(0, 16) : '', endDate: b.endDate ? new Date(b.endDate).toISOString().slice(0, 16) : '', registrationDeadline: b.registrationDeadline ? new Date(b.registrationDeadline).toISOString().slice(0, 16) : '', status: b.status || 'published' });
                  }}
                  style={{ 
                    ...buttonStyles.primary,
                    padding: `${spacing.xs} ${spacing.md}`,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {editing && (
          <div style={{ marginTop: 24, padding: 20, background: '#fef3c7', borderRadius: 8, border: '2px solid #f59e0b' }}>
            <h3 style={{ marginTop: 0, color: '#003366' }}>Edit Booth</h3>
            <form className="form managerForm" onSubmit={onUpdate}>
              <label>
                <input className="input" required value={editData.title || ''} onChange={e=>setEditData({ ...editData, title: e.target.value })} />
                <span>Title</span>
              </label>
              <label>
                <input className="input" value={editData.shortDescription || ''} onChange={e=>setEditData({ ...editData, shortDescription: e.target.value })} />
                <span>Short Description</span>
              </label>
              <div className="flex grid-2">
                <label>
                  <input className="input" type="datetime-local" required value={editData.startDate || ''} onChange={e=>setEditData({ ...editData, startDate: e.target.value })} />
                  <span>Start Date/Time</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" required value={editData.endDate || ''} onChange={e=>setEditData({ ...editData, endDate: e.target.value })} />
                  <span>End Date/Time</span>
                </label>
              </div>
              <div className="flex grid-2">
                <label>
                  <input className="input" required value={editData.location || ''} onChange={e=>setEditData({ ...editData, location: e.target.value })} />
                  <span>Location</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" value={editData.registrationDeadline || ''} onChange={e=>setEditData({ ...editData, registrationDeadline: e.target.value })} />
                  <span>Registration Deadline</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className="submit" 
                  type="submit" 
                  disabled={loading} 
                  style={{ 
                    ...buttonStyles.primary,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.boxShadow = shadows.accentHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.boxShadow = shadows.accent;
                    }
                  }}
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setEditing(null); setEditData({}); }} 
                  style={{ 
                    ...buttonStyles.secondary,
                    padding: `${spacing.sm} ${spacing.md}`,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default BoothsManager;

