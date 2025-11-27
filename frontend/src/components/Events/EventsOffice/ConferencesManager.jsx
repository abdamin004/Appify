import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import '../../Form.css';
import '../../managerForm.css';
import { createConference, listConferences, updateEvent, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../../utils/designSystem';

function ConferencesManager({ editOnly = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const autoEditApplied = useRef(false);
  const editId = editOnly ? params.id : null;
  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    status: 'published',
    agenda: '',
    websiteLink: '',
    requiredBudget: '',
    fundingSource: 'internal', // Changed from 'GUC' to 'internal'
    extraRequiredResourses: false,
  });
  const [allowedRoles, setAllowedRoles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [confs, setConfs] = useState([]);
  const [listLoading, setListLoading] = useState(false);
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
        setListLoading(true);
        const rows = await listConferences();
        setConfs(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error('Failed to load conferences', e);
        showToast.error('Failed to load conferences');
        setConfs([]);
      } finally {
        setListLoading(false);
      }
    }
  }

  useEffect(() => { refresh(); }, [editOnly]);

  // Load event for editing when in edit-only mode
  useEffect(() => {
    if (editOnly && editId && !editing) {
      loadConferenceForEdit(editId);
    }
  }, [editOnly, editId]);

  const loadConferenceForEdit = async (id) => {
    setLoading(true);
    try {
      const conf = await getEventById(id);
      if (conf) {
        setEditData({
          title: conf.title || '',
          shortDescription: conf.shortDescription || '',
          startDate: conf.startDate ? conf.startDate.slice(0,16) : '',
          endDate: conf.endDate ? conf.endDate.slice(0,16) : '',
          registrationDeadline: conf.registrationDeadline ? conf.registrationDeadline.slice(0,16) : '',
          status: conf.status || 'published',
          agenda: conf.description || '',
          websiteLink: conf.websiteLink || '',
          requiredBudget: conf.requiredBudget || '',
          fundingSource: conf.fundingSource || 'internal',
          extraRequiredResourses: !!conf.extraRequiredResourses,
        });
        setAllowedRoles(Array.isArray(conf.allowedRoles) ? conf.allowedRoles : []);
        setEditing(id);
      } else {
        showToast.error('Conference not found');
        navigate('/EventOfficeDashboard');
      }
    } catch (err) {
      showToast.error(err.message || 'Failed to load conference');
      navigate('/EventOfficeDashboard');
    } finally {
      setLoading(false);
    }
  };

  // Legacy support: If opened with ?edit=<id>, auto-start editing that conference once
  useEffect(() => {
    if (editOnly) return; // Skip if in edit-only mode
    try {
      if (autoEditApplied.current) return;
      const urlParams = new URLSearchParams(window.location.search || "");
      const targetFromQuery = urlParams.get('edit');
      const targetFromState = (location && location.state && location.state.edit) || null;
      const targetId = targetFromState || targetFromQuery;
      if (targetId && !editing && Array.isArray(confs) && confs.length) {
        const row = confs.find(c => String(c._id) === String(targetId));
        if (row) {
          startEdit(row);
          autoEditApplied.current = true;
        }
      }
    } catch (_) {
      // ignore
    }
  }, [confs, editing, editOnly]);

  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        ...form, 
        location: 'N/A',
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      const createdConference = await createConference(payload);
      showToast.success('Conference created successfully');
      
      const conferenceEvent = createdConference?.event || createdConference;
      
      setForm({
        title: '',
        shortDescription: '',
        startDate: '',
        endDate: '',
        registrationDeadline: '',
        status: 'published',
        agenda: '',
        websiteLink: '',
        requiredBudget: '',
        fundingSource: 'internal', // Changed from 'GUC' to 'internal'
        extraRequiredResourses: false,
      });
      setAllowedRoles([]);
      
      // Create notifications for all users if event is published
      if (conferenceEvent && (conferenceEvent.status === 'published' || payload.status === 'published')) {
        const { notifyAllUsersAboutNewEvent } = await import('../../../services/eventService');
        notifyAllUsersAboutNewEvent(conferenceEvent);
      }
      
      await refresh();
      // Redirect to Event Office dashboard
      navigate('/EventOfficeDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to create conference');
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
      agenda: row.agenda || '',
      websiteLink: row.websiteLink || '',
      requiredBudget: row.requiredBudget ?? '',
      fundingSource: row.fundingSource || 'internal', // Changed from 'GUC' to 'internal'
      extraRequiredResourses: !!row.extraRequiredResourses,
    });
    setAllowedRoles(Array.isArray(row.allowedRoles) ? row.allowedRoles : []);
  };

  const onSave = async (id) => {
    setLoading(true);
    try {
      const payload = { 
        ...editData,
        allowedRoles: allowedRoles.length > 0 ? allowedRoles : undefined
      };
      await updateEvent(id, payload);
      showToast.success('Conference updated successfully');
      setEditing(null); 
      setEditData({});
      setAllowedRoles([]);
      clearEditParam();
      // Redirect to EventOfficeDashboard after saving
      navigate('/EventOfficeDashboard');
    } catch (err) { 
      showToast.error(err.message || 'Failed to update conference');
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
        }}>{editOnly ? 'Edit Conference' : 'Events Office — Conferences'}</h1>
        {!editOnly && !editing && (
          <>
            <h2 style={{ 
              color: colors.primary, 
              fontWeight: typography.fontWeight.bold, 
              fontSize: typography.fontSize.lg, 
              marginTop: spacing.xl,
              marginBottom: spacing.lg,
            }}>Create Conference</h2>
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
              <input className="input" type="url" placeholder=" " required value={form.websiteLink} onChange={e=>setForm({ ...form, websiteLink: e.target.value })} />
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
                <option value="internal">Internal</option>
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
            {loading ? 'Creating...' : 'Create Conference'}
          </button>
        </form>
          </>
        )}

        {editing && (() => {
          const conf = confs.find(c => c._id === editing);
          if (!conf) return null;
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
                }}>✏️ Edit Conference</h2>
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
                    }}>Registration Deadline</span>
                    <input 
                      className="input" 
                      type="datetime-local" 
                      value={editData.registrationDeadline} 
                      onChange={e=>setEditData({ ...editData, registrationDeadline: e.target.value })} 
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
                    }}>Conference Website Link *</span>
                    <input 
                      className="input" 
                      type="url" 
                      required 
                      value={editData.websiteLink} 
                      onChange={e=>setEditData({ ...editData, websiteLink: e.target.value })} 
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
                    }}>Full Agenda</span>
                    <textarea 
                      className="input" 
                      value={editData.agenda} 
                      onChange={e=>setEditData({ ...editData, agenda: e.target.value })} 
                      style={{ 
                        ...inputStyles.base, 
                        width: '100%',
                        minHeight: 120, 
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
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
                    }}>Required Budget</span>
                    <input 
                      className="input" 
                      type="number" 
                      min="0" 
                      value={editData.requiredBudget} 
                      onChange={e=>setEditData({ ...editData, requiredBudget: e.target.value })} 
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
                    }}>Source of Funding</span>
                    <select 
                      className="input" 
                      value={editData.fundingSource} 
                      onChange={e=>setEditData({ ...editData, fundingSource: e.target.value })}
                      style={{ ...inputStyles.base, width: '100%' }}
                    >
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </label>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  background: colors.gray50,
                  borderRadius: borderRadius.md,
                }}>
                  <input
                    type="checkbox"
                    checked={editData.extraRequiredResourses}
                    onChange={e=>setEditData({ ...editData, extraRequiredResourses: e.target.checked })}
                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                  />
                  <span style={{ 
                    color: colors.primary, 
                    fontWeight: typography.fontWeight.medium,
                    fontSize: typography.fontSize.base,
                  }}>Extra Required Resources</span>
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
            }}>Existing Conferences</h2>
            {listLoading && (
          <div style={{ 
            textAlign: 'center', 
            padding: spacing['3xl'], 
            color: colors.primary,
            fontSize: typography.fontSize.base,
          }}>
            Loading conferences…
          </div>
        )}
        {!listLoading && confs.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: spacing['3xl'], 
            color: colors.gray500,
            fontSize: typography.fontSize.base,
          }}>
            No conferences yet.
          </div>
        )}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: spacing.lg 
        }}>
          {confs.map((c) => (
            <div key={c._id} style={{ 
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
              {editing !== c._id && (
                <div>
                  <div style={{ 
                    fontWeight: typography.fontWeight.extrabold, 
                    color: colors.primary,
                    fontSize: typography.fontSize.lg,
                    marginBottom: spacing.sm,
                  }}>
                    {c.title}
                  </div>
                  <div style={{ 
                    color: colors.gray700, 
                    fontSize: typography.fontSize.sm,
                    marginBottom: spacing.xs,
                  }}>
                    {c.shortDescription || '-'}
                  </div>
                  <div style={{ 
                    color: colors.gray500, 
                    fontSize: typography.fontSize.xs,
                    marginBottom: spacing.xs,
                  }}>
                    From {c.startDate ? new Date(c.startDate).toLocaleString() : '-'} to {c.endDate ? new Date(c.endDate).toLocaleString() : '-'}
                  </div>
                  {c.websiteLink && (
                    <div style={{ 
                      color: colors.primary, 
                      fontSize: typography.fontSize.xs, 
                      marginTop: spacing.sm,
                      marginBottom: spacing.xs,
                    }}>
                      <a 
                        href={c.websiteLink} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ 
                          color: colors.primary, 
                          textDecoration: 'underline',
                          transition: transitions.fast,
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.color = colors.primaryLight;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = colors.primary;
                        }}
                      >
                        Website
                      </a>
                    </div>
                  )}
                  {(c.requiredBudget || c.fundingSource) && (
                    <div style={{ 
                      color: colors.gray500, 
                      fontSize: typography.fontSize.xs, 
                      marginTop: spacing.sm,
                      marginBottom: spacing.xs,
                    }}>
                      {c.requiredBudget ? `Budget: $${c.requiredBudget}` : ''} {c.fundingSource ? ` | Source: ${c.fundingSource}` : ''}
                    </div>
                  )}
                  {c.extraRequiredResourses && (
                    <div style={{ 
                      color: colors.gray500, 
                      fontSize: typography.fontSize.xs,
                      marginBottom: spacing.md,
                    }}>
                      Extra resources required
                    </div>
                  )}
                  <button 
                    className="submit" 
                    onClick={() => navigate(`/events-office/conferences/edit/${c._id}`)} 
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

export default ConferencesManager;