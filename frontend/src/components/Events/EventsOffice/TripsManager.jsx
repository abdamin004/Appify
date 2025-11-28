import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import '../../Form.css';
import '../../managerForm.css';
import { createTrip, listTrips, updateEvent, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, buttonStyles, inputStyles, transitions } from '../../../utils/designSystem';

function TripsManager({ editOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const autoEditApplied = useRef(false);
  const editId = editOnly ? params.id : null;
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
  const [allowedRoles, setAllowedRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [editing, setEditing] = useState(null);
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
      try {
        const rows = await listTrips(); 
        setTrips(Array.isArray(rows) ? rows : []); 
      } catch (err) {
        console.error('Error refreshing trips:', err);
        setTrips([]);
      }
    }
  }
  useEffect(() => { 
    refresh(); 
  }, [editOnly]);

  // Load event for editing when in edit-only mode
  useEffect(() => {
    if (editOnly && editId && !editing) {
      loadTripForEdit(editId);
    }
  }, [editOnly, editId]);

  const loadTripForEdit = async (id) => {
    setLoading(true);
    try {
      const trip = await getEventById(id);
      if (trip) {
        setEditData({
          title: trip.title || '',
          shortDescription: trip.shortDescription || '',
          location: trip.location || '',
          price: trip.price || 0,
          capacity: trip.capacity || 0,
          startDate: trip.startDate ? trip.startDate.slice(0,16) : '',
          endDate: trip.endDate ? trip.endDate.slice(0,16) : '',
          registrationDeadline: trip.registrationDeadline ? trip.registrationDeadline.slice(0,16) : '',
          status: trip.status || 'published'
        });
        setAllowedRoles(Array.isArray(trip.allowedRoles) ? trip.allowedRoles : []);
        setEditing(id);
      } else {
        showToast.error('Trip not found');
        navigate('/EventOfficeDashboard');
      }
    } catch (err) {
      showToast.error(err.message || 'Failed to load trip');
      navigate('/EventOfficeDashboard');
    } finally {
      setLoading(false);
    }
  };

  // Legacy support: If opened with ?edit=<id>, auto-start editing that trip once
  useEffect(() => {
    if (editOnly) return; // Skip if in edit-only mode
    try {
      if (autoEditApplied.current) return;
      const urlParams = new URLSearchParams(window.location.search || "");
      const targetFromQuery = urlParams.get('edit');
      const targetFromState = (location && location.state && location.state.edit) || null;
      const targetId = targetFromState || targetFromQuery;
      if (targetId && !editing && Array.isArray(trips) && trips.length) {
        const row = trips.find(t => String(t._id) === String(targetId));
        if (row) {
          startEdit(row);
          autoEditApplied.current = true;
        }
      }
    } catch (_) {
      // ignore
    }
  }, [trips, editing, editOnly]);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        ...form, 
        price: Number(form.price || 0), 
        capacity: Number(form.capacity || 0),
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      const createdTrip = await createTrip(payload);
      showToast.success('Trip created successfully');
      
      // Save user restrictions if any
      const tripEvent = createdTrip?.event || createdTrip;
      
      setForm({ title: '', shortDescription: '', location: '', price: '', capacity: '', startDate: '', endDate: '', registrationDeadline: '', status: 'published' });
      setAllowedRoles([]);
      
      // Create notifications for all users if event is published
      if (tripEvent && (tripEvent.status === 'published' || form.status === 'published')) {
        const { notifyAllUsersAboutNewEvent } = await import('../../../services/eventService');
        notifyAllUsersAboutNewEvent(tripEvent);
      }
      
      await refresh();
      // Redirect to Event Office dashboard
      navigate('/EventOfficeDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to create trip');
    } finally { 
      setLoading(false); 
    }
  };

  const startEdit = (row) => { 
    setEditing(row._id); 
    setEditData({
      title: row.title || '', 
      shortDescription: row.shortDescription || '', 
      location: row.location || '', 
      price: row.price || 0, 
      capacity: row.capacity || 0,
      startDate: row.startDate ? row.startDate.slice(0,16) : '', 
      endDate: row.endDate ? row.endDate.slice(0,16) : '',
      registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0,16) : '', 
      status: row.status || 'published'
    });
    setAllowedRoles(Array.isArray(row.allowedRoles) ? row.allowedRoles : []);
  };
  const onSave = async (id) => {
    setLoading(true);
    try {
      const payload = { 
        ...editData, 
        price: Number(editData.price || 0), 
        capacity: Number(editData.capacity || 0),
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      await updateEvent(id, payload);
      showToast.success('Trip updated successfully');
      setEditing(null); 
      setEditData({});
      setAllowedRoles([]);
      clearEditParam();
      // Redirect to EventOfficeDashboard after saving
      navigate('/EventOfficeDashboard');
    } catch (err) { 
      showToast.error(err.message || 'Failed to update trip');
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
        }}>{editOnly ? 'Edit Trip' : 'Events Office — Trips'}</h1>

        {!editOnly && (
          <>
            <h2 style={{ 
              color: colors.primary, 
              fontWeight: typography.fontWeight.bold, 
              fontSize: typography.fontSize.lg, 
              marginTop: spacing.xl,
              marginBottom: spacing.lg,
            }}>Create Trip</h2>
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
          <label>
            <input className="input" type="number" required value={form.price} onChange={e=>setForm({ ...form, price: e.target.value })} />
            <span>Price</span>
          </label>
          <label>
            <input className="input" type="number" required value={form.capacity} onChange={e=>setForm({ ...form, capacity: e.target.value })} />
            <span>Capacity</span>
          </label>
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
            {loading ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
            )}
          </>
        )}

        {editing && (() => {
          const trip = trips.find(t => t._id === editing);
          if (!trip) return null;
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
                }}>✏️ Edit Trip</h2>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing.md }}>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Price *</span>
                    <input 
                      className="input" 
                      type="number" 
                      required 
                      value={editData.price} 
                      onChange={e=>setEditData({ ...editData, price: e.target.value })} 
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
                    }}>Capacity *</span>
                    <input 
                      className="input" 
                      type="number" 
                      required 
                      value={editData.capacity} 
                      onChange={e=>setEditData({ ...editData, capacity: e.target.value })} 
                      style={{ ...inputStyles.base, width: '100%' }}
                    />
                  </label>
                </div>
                <RoleSelector 
                  selectedRoles={allowedRoles}
                  onChange={setAllowedRoles}
                  label="Restrict Event to Specific Roles"
                />
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
            }}>Existing Trips</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: spacing.lg 
            }}>
              {trips.map((t) => (
            <div key={t._id} style={{ 
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
              {editing !== t._id && (
                <div>
                  <div style={{ 
                    fontWeight: typography.fontWeight.extrabold, 
                    color: colors.primary,
                    fontSize: typography.fontSize.lg,
                    marginBottom: spacing.sm,
                  }}>
                    {t.title}
                  </div>
                  <div style={{ 
                    color: colors.gray700, 
                    fontSize: typography.fontSize.sm,
                    marginBottom: spacing.xs,
                  }}>
                    {t.shortDescription || '—'}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs, 
                    marginTop: spacing.sm,
                    marginBottom: spacing.xs,
                  }}>
                    📍 {t.location} • ${t.price}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs,
                    marginBottom: spacing.xs,
                  }}>
                    👥 Capacity: {t.capacity ?? '-'}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs,
                    marginBottom: spacing.md,
                  }}>
                    From {new Date(t.startDate).toLocaleString()} to {t.endDate ? new Date(t.endDate).toLocaleString() : '—'}
                  </div>
                  <button 
                    className="submit" 
                    onClick={() => navigate(`/events-office/trips/edit/${t._id}`)} 
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

export default TripsManager;
