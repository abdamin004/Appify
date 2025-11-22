import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import '../../Form.css';
import '../../managerForm.css';
import { createBazaar, listBazaars, updateEvent, getEventById } from '../../../services/eventService';
import UserSelector from '../UserSelector';
import { setRestrictedUsers } from '../../../services/eventRestrictionService';
import { showToast } from '../../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../../utils/designSystem';

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
  const [restrictedUserIds, setRestrictedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bazaars, setBazaars] = useState([]);
  const [editing, setEditing] = useState(null); // id being edited
  const [editData, setEditData] = useState({});

  const clearEditParam = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
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
          startDate: bazaar.startDate ? bazaar.startDate.slice(0,16) : '',
          endDate: bazaar.endDate ? bazaar.endDate.slice(0,16) : '',
          registrationDeadline: bazaar.registrationDeadline ? bazaar.registrationDeadline.slice(0,16) : '',
          status: bazaar.status || 'published'
        });
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
      const createdBazaar = await createBazaar(form);
      setSuccess('Bazaar created');
      
      // Save user restrictions if any
      const bazaarEvent = createdBazaar?.event || createdBazaar;
      const eventId = bazaarEvent?._id || bazaarEvent?.id;
      if (eventId && restrictedUserIds.length > 0) {
        setRestrictedUsers(eventId, restrictedUserIds);
      }
      
      setForm({ title: '', shortDescription: '', location: '', startDate: '', endDate: '', registrationDeadline: '', status: 'published' });
      setRestrictedUserIds([]);
      
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

  const startEdit = (row) => { setEditing(row._id); setEditData({
    title: row.title || '', shortDescription: row.shortDescription || '', location: row.location || '',
    startDate: row.startDate ? row.startDate.slice(0,16) : '', endDate: row.endDate ? row.endDate.slice(0,16) : '',
    registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0,16) : '', status: row.status || 'published'
  }); };
  const onSave = async (id) => {
    setLoading(true);
    try {
      const payload = { ...editData };
      await updateEvent(id, payload);
      showToast.success('Bazaar updated successfully');
      setEditing(null); 
      setEditData({});
      clearEditParam();
      // Redirect to EventOfficeDashboard after saving
      navigate('/EventOfficeDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to update bazaar');
    } finally {
      setLoading(false);
    }
  };

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
        }}>{editOnly ? 'Edit Bazaar' : 'Events Office — Bazaars'}</h1>

        {!editOnly && (
          <>
            <h2 style={{ 
              color: colors.primary, 
              fontWeight: typography.fontWeight.bold, 
              fontSize: typography.fontSize.lg, 
              marginTop: spacing.xl,
              marginBottom: spacing.lg,
            }}>Create Bazaar</h2>
            {!editing && (
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
          <UserSelector 
            selectedUserIds={restrictedUserIds}
            onChange={setRestrictedUserIds}
            label="Restrict Event to Specific Users"
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
            {loading ? 'Creating...' : 'Create Bazaar'}
          </button>
        </form>
            )}
          </>
        )}

        {editing && (() => {
          const bz = bazaars.find(b => b._id === editing);
          if (!bz) return null;
          return (
            <div style={{
              background: colors.white,
              borderRadius: borderRadius.xl,
              padding: spacing['2xl'],
              marginTop: spacing.xl,
              marginBottom: spacing['2xl'],
              boxShadow: shadows.lg,
              border: `1px solid ${colors.gray200}`,
            }}>
              <div style={{
                marginBottom: spacing.xl,
                paddingBottom: spacing.lg,
                borderBottom: `2px solid ${colors.gray200}`,
              }}>
                <h2 style={{ 
                  color: colors.primary, 
                  fontWeight: typography.fontWeight.bold, 
                  fontSize: typography.fontSize.xl,
                  margin: 0,
                }}>✏️ Edit Bazaar</h2>
              </div>
              <div style={{ display: 'grid', gap: spacing.lg }}>
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Title *</span>
                    <input 
                      className="input" 
                      required 
                      value={editData.title} 
                      onChange={e=>setEditData({ ...editData, title: e.target.value })} 
                      style={{ ...inputStyles.base, width: '100%' }}
                    />
                  </label>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Short Description</span>
                    <input 
                      className="input" 
                      value={editData.shortDescription} 
                      onChange={e=>setEditData({ ...editData, shortDescription: e.target.value })} 
                      style={{ ...inputStyles.base, width: '100%' }}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Start Date/Time *</span>
                    <input 
                      className="input" 
                      type="datetime-local" 
                      required 
                      value={editData.startDate} 
                      onChange={e=>setEditData({ ...editData, startDate: e.target.value })} 
                      style={{ ...inputStyles.base, width: '100%' }}
                    />
                  </label>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>End Date/Time *</span>
                    <input 
                      className="input" 
                      type="datetime-local" 
                      required 
                      value={editData.endDate} 
                      onChange={e=>setEditData({ ...editData, endDate: e.target.value })} 
                      style={{ ...inputStyles.base, width: '100%' }}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Location *</span>
                    <input 
                      className="input" 
                      required 
                      value={editData.location} 
                      onChange={e=>setEditData({ ...editData, location: e.target.value })} 
                      style={{ ...inputStyles.base, width: '100%' }}
                    />
                  </label>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Registration Deadline</span>
                    <input 
                      className="input" 
                      type="datetime-local" 
                      value={editData.registrationDeadline} 
                      onChange={e=>setEditData({ ...editData, registrationDeadline: e.target.value })} 
                      style={{ ...inputStyles.base, width: '100%' }}
                    />
                  </label>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: spacing.md, 
                  marginTop: spacing.lg,
                  paddingTop: spacing.lg,
                  borderTop: `1px solid ${colors.gray200}`,
                }}>
                  <button 
                    type="button" 
                    onClick={() => onSave(editing)} 
                    disabled={loading}
                    style={{ 
                      ...buttonStyles.primary,
                      flex: 1,
                      padding: `${spacing.md} ${spacing.xl}`,
                      fontSize: typography.fontSize.base,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.boxShadow = shadows.accentHover;
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.boxShadow = shadows.accent;
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {loading ? '💾 Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {!editOnly && (
          <>
            <h2 style={{ 
              color: colors.primary, 
              fontWeight: typography.fontWeight.bold, 
              fontSize: typography.fontSize.lg, 
              marginTop: spacing['3xl'],
              marginBottom: spacing.lg,
            }}>Existing Bazaars</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: spacing.lg 
            }}>
              {bazaars.map((bz) => (
            <div key={bz._id} style={{ 
              border: `1px solid ${colors.gray200}`, 
              borderRadius: borderRadius.xl, 
              padding: spacing.lg, 
              background: colors.white,
              boxShadow: shadows.md,
              transition: transitions.normal,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = shadows.lg;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = shadows.md;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              {editing !== bz._id && (
                <div>
                  <div style={{ 
                    fontWeight: typography.fontWeight.extrabold, 
                    color: colors.primary,
                    fontSize: typography.fontSize.lg,
                    marginBottom: spacing.sm,
                  }}>
                    {bz.title}
                  </div>
                  <div style={{ 
                    color: colors.gray700, 
                    fontSize: typography.fontSize.sm,
                    marginBottom: spacing.xs,
                  }}>
                    {bz.shortDescription || '—'}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs, 
                    marginTop: spacing.sm,
                    marginBottom: spacing.xs,
                  }}>
                    📍 {bz.location}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs,
                    marginBottom: spacing.md,
                  }}>
                    From {new Date(bz.startDate).toLocaleString()} to {bz.endDate ? new Date(bz.endDate).toLocaleString() : '—'}
                  </div>
                  <button 
                    className="submit" 
                    onClick={() => navigate(`/events-office/bazaars/edit/${bz._id}`)} 
                    style={{ 
                      ...buttonStyles.primary,
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.boxShadow = shadows.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = shadows.accent;
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BazaarsManager;
