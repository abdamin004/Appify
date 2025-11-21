import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import '../../Form.css';
import '../../managerForm.css';
import { createGymSession, listGymSessions, updateGymSession, cancelGymSession, getEventById } from '../../../services/eventService';
import { showToast, confirmDialog } from '../../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../../utils/designSystem';

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
      };
      const createdSession = await createGymSession(payload);
      showToast.success('Gym session created successfully');
      setForm({ date: '', time: '', duration: 60, sessionType: 'yoga', instructor: '', capacity: '' });
      
      // Create notifications for all users if event is published
      const sessionEvent = createdSession?.event || createdSession;
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
      });
      showToast.success('Gym session updated successfully');
      setEditing(null); 
      setEditData({});
      clearEditParam();
      // Redirect to EventOfficeDashboard after saving
      navigate('/EventOfficeDashboard');
    } catch (err) { 
      showToast.error(err.message || 'Failed to update gym session');
      setLoading(false);
    }
  };

  const onCancelEditClick = () => {
    setEditing(null);
    setEditData({});
    clearEditParam();
    autoEditApplied.current = false;
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
        }}>{editOnly ? 'Edit Gym Session' : 'Events Office – Gym Sessions'}</h1>

        {!editOnly && !editing && (
          <>
            <h2 style={{ 
              color: colors.primary, 
              fontWeight: typography.fontWeight.bold, 
              fontSize: typography.fontSize.lg, 
              marginTop: spacing.xl,
              marginBottom: spacing.lg,
            }}>Create Gym Session</h2>
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
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </form>
          </>
        )}

        {editing && (() => {
          // In edit-only mode, use loadedSession; otherwise find in sessions array
          const session = editOnly ? loadedSession : sessions.find(s => s._id === editing);
          if (!session) {
            if (editOnly && loading) return <div>Loading...</div>;
            return null;
          }
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
                }}>✏️ Edit Gym Session</h2>
              </div>
              <div style={{ display: 'grid', gap: spacing.lg }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.md }}>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Date *</span>
                    <input 
                      className="input" 
                      type="date" 
                      required 
                      value={editData.date} 
                      onChange={e=>setEditData({ ...editData, date: e.target.value })} 
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
                    }}>Time *</span>
                    <input 
                      className="input" 
                      type="time" 
                      required 
                      value={editData.time} 
                      onChange={e=>setEditData({ ...editData, time: e.target.value })} 
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
                    }}>Duration (minutes) *</span>
                    <input 
                      className="input" 
                      type="number" 
                      min="10" 
                      step="5" 
                      required 
                      value={editData.duration} 
                      onChange={e=>setEditData({ ...editData, duration: e.target.value })} 
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
                    }}>Session Type *</span>
                    <select 
                      className="input" 
                      required 
                      value={editData.sessionType} 
                      onChange={e=>setEditData({ ...editData, sessionType: e.target.value })}
                      style={{ ...inputStyles.base, width: '100%' }}
                    >
                      {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'block', marginBottom: spacing.sm }}>
                    <span style={{ 
                      display: 'block', 
                      color: colors.primary, 
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.sm,
                    }}>Max Participants *</span>
                    <input 
                      className="input" 
                      type="number" 
                      min="1" 
                      required 
                      value={editData.capacity} 
                      onChange={e=>setEditData({ ...editData, capacity: e.target.value })} 
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
                    }}>Instructor *</span>
                    <input 
                      className="input" 
                      required 
                      value={editData.instructor} 
                      onChange={e=>setEditData({ ...editData, instructor: e.target.value })} 
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
            }}>Existing Gym Sessions</h2>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: spacing.lg 
            }}>
              {sessions.map((s) => (
            <div key={s._id} style={{ 
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
              {editing !== s._id && (
                <div>
                  <div style={{ 
                    fontWeight: typography.fontWeight.extrabold, 
                    color: colors.primary,
                    fontSize: typography.fontSize.lg,
                    marginBottom: spacing.sm,
                  }}>
                    {s.title || 'Gym Session'}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs,
                    marginBottom: spacing.xs,
                  }}>
                    {(s.sessionType ? s.sessionType : (s.tags && s.tags[0] ? s.tags[0] : '')) || '-'} • Capacity: {s.capacity ?? '-'}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs,
                    marginBottom: spacing.xs,
                  }}>
                    From {s.startDate ? new Date(s.startDate).toLocaleString() : '-'} to {s.endDate ? new Date(s.endDate).toLocaleString() : '-'}
                  </div>
                  <div style={{ 
                    color: s.status === 'cancelled' ? colors.error : colors.gray500, 
                    fontSize: typography.fontSize.xs,
                    marginBottom: spacing.md,
                  }}>
                    Status: {s.status}
                  </div>
                  <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
                    <button 
                      className="submit" 
                      onClick={() => navigate(`/events-office/gym-sessions/edit/${s._id}`)} 
                      disabled={s.status === 'cancelled'} 
                      style={{ 
                        ...buttonStyles.primary,
                        flex: 1,
                        opacity: s.status === 'cancelled' ? 0.5 : 1,
                        cursor: s.status === 'cancelled' ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (s.status !== 'cancelled') {
                          e.target.style.boxShadow = shadows.accentHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (s.status !== 'cancelled') {
                          e.target.style.boxShadow = shadows.accent;
                        }
                      }}
                    >
                      Edit
                    </button>
                    <button 
                      className="submit" 
                      onClick={() => onCancel(s._id)} 
                      disabled={s.status === 'cancelled'} 
                      style={{ 
                        ...buttonStyles.outline,
                        flex: 1,
                        background: colors.errorLight,
                        color: colors.error,
                        borderColor: colors.error,
                        opacity: s.status === 'cancelled' ? 0.5 : 1,
                        cursor: s.status === 'cancelled' ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (s.status !== 'cancelled') {
                          e.target.style.background = colors.error;
                          e.target.style.color = colors.white;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (s.status !== 'cancelled') {
                          e.target.style.background = colors.errorLight;
                          e.target.style.color = colors.error;
                        }
                      }}
                    >
                      Cancel Session
                    </button>
                  </div>
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

export default GymSessionsManager;

