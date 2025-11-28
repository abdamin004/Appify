import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import '../../Form.css';
import '../../managerForm.css';
import { createWorkshop, listWorkshopsByProfessor, updateEvent, getEventById } from '../../../services/eventService';
import { createEventOfficeNotification } from '../../../services/notificationService';
import { showToast } from '../../../utils/toast';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../../utils/designSystem';

function WorkshopsManager({ editOnly = false }) {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = editOnly ? params.id : searchParams.get('edit');

  // Get logged-in professor info for auto-fill
  const getProfessorInfo = () => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return null;
      const user = JSON.parse(raw);
      return {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || '',
        department: user.department || user.faculty || '',
      };
    } catch {
      return null;
    }
  };

  const professorInfo = getProfessorInfo();

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
    professors: professorInfo ? [{ name: professorInfo.name, department: professorInfo.department }] : [{ name: '', department: '' }],
    status: 'published',
  });

  const [loading, setLoading] = useState(false);
  const [professorFilter, setProfessorFilter] = useState('');
  const [workshops, setWorkshops] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [loadingWorkshop, setLoadingWorkshop] = useState(false);

  const refresh = useCallback(async () => {
    if (!professorFilter) { setWorkshops([]); return; }
    const rows = await listWorkshopsByProfessor(professorFilter.trim());
    setWorkshops(rows);
  }, [professorFilter]);

  // Auto-search as the user types in the search bar
  useEffect(() => { refresh(); }, [refresh]);

  // Load workshop for editing when edit parameter is in URL or route param
  useEffect(() => {
    if (editId && !editing && !loadingWorkshop) {
      loadWorkshopForEdit(editId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, editOnly]);

  const loadWorkshopForEdit = async (id) => {
    setLoadingWorkshop(true);
    try {
      const workshop = await getEventById(id);
      if (workshop) {
        // Pre-fill the form with workshop data
        setForm({
          title: workshop.title || '',
          shortDescription: workshop.shortDescription || '',
          location: workshop.location || 'GUC Cairo',
          startDate: workshop.startDate ? new Date(workshop.startDate).toISOString().slice(0, 16) : '',
          endDate: workshop.endDate ? new Date(workshop.endDate).toISOString().slice(0, 16) : '',
          registrationDeadline: workshop.registrationDeadline ? new Date(workshop.registrationDeadline).toISOString().slice(0, 16) : '',
          facultyName: workshop.facultyName || '',
          requiredBudget: workshop.requiredBudget || '',
          fundingSource: workshop.fundingSource || 'Grant',
          extraRequiredResourses: !!workshop.extraRequiredResourses,
          agenda: workshop.description || '',
          capacity: workshop.capacity || '',
          professors: (Array.isArray(workshop.professors) && workshop.professors.length > 0)
            ? workshop.professors.map(p => ({ name: p.name || '', department: p.department || '' }))
            : [{ name: '', department: '' }],
          status: workshop.status || 'pending',
        });
        // Set editing mode
        setEditing(id);
        setEditData({
          title: workshop.title || '',
          shortDescription: workshop.shortDescription || '',
          location: workshop.location || 'GUC Cairo',
          startDate: workshop.startDate ? new Date(workshop.startDate).toISOString().slice(0, 16) : '',
          endDate: workshop.endDate ? new Date(workshop.endDate).toISOString().slice(0, 16) : '',
          registrationDeadline: workshop.registrationDeadline ? new Date(workshop.registrationDeadline).toISOString().slice(0, 16) : '',
          facultyName: workshop.facultyName || '',
          requiredBudget: workshop.requiredBudget || 0,
          fundingSource: workshop.fundingSource || 'Grant',
          extraRequiredResourses: !!workshop.extraRequiredResourses,
          capacity: workshop.capacity ?? 0,
          agenda: workshop.description || '',
          professors: (Array.isArray(workshop.professors) && workshop.professors.length > 0)
            ? workshop.professors.map(p => ({ name: p.name || '', department: p.department || '' }))
            : [{ name: '', department: '' }],
        });
        showToast.success('Workshop loaded for editing');
        // Remove edit parameter from URL only if not in edit-only mode
        if (!editOnly) {
          setSearchParams({});
        }
      } else {
        showToast.error('Workshop not found');
        if (editOnly) {
          navigate('/ProfessorDashboard');
        }
      }
    } catch (err) {
      console.error('Error loading workshop:', err);
      showToast.error('Failed to load workshop for editing: ' + (err.message || 'Unknown error'));
      if (editOnly) {
        navigate('/ProfessorDashboard');
      }
    } finally {
      setLoadingWorkshop(false);
    }
  };



  const onCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let createdBy;
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const obj = JSON.parse(raw);
          createdBy = (obj && (obj._id || obj.id)) || undefined;
        }
      } catch (_) { }
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
        status: 'pending',
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
      const createdWorkshop = await createWorkshop(payload);

      // Create notification for Events Office
      createEventOfficeNotification({
        type: 'WorkshopSubmitted',
        message: `A new workshop "${payload.title}" has been submitted by a professor and is pending approval.`,
        workshopId: createdWorkshop?._id || createdWorkshop?.id,
        workshopTitle: payload.title,
        professorId: createdBy,
      });

      showToast.success('Workshop created successfully');
      setForm({
        title: '', shortDescription: '', location: 'GUC Cairo', startDate: '', endDate: '', registrationDeadline: '',
        facultyName: '', requiredBudget: '', fundingSource: 'Grant', extraRequiredResourses: false,
        agenda: '', capacity: '', professors: [{ name: '', department: '' }], status: 'published'
      });
      await refresh();
      // Redirect to professor dashboard
      navigate('/ProfessorDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to create workshop');
    }
    finally { setLoading(false); }
  };

  const startEdit = (row) => {
    setEditing(row._id); setEditData({
      title: row.title || '', shortDescription: row.shortDescription || '', location: row.location || 'GUC Cairo',
      startDate: row.startDate ? row.startDate.slice(0, 16) : '', endDate: row.endDate ? row.endDate.slice(0, 16) : '',
      registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0, 16) : '',
      facultyName: row.facultyName || '', requiredBudget: row.requiredBudget || 0, fundingSource: row.fundingSource || 'Grant',
      extraRequiredResourses: !!row.extraRequiredResourses,
      capacity: row.capacity ?? 0,
      agenda: row.description || '',
      professors: (Array.isArray(row.professors) && row.professors.length > 0) ? row.professors.map(p => ({ name: p.name || '', department: p.department || '' })) : [{ name: '', department: '' }],
    });
  };
  // Remove edit requests from description
  const removeEditRequests = (description) => {
    if (!description) return '';
    // Remove all edit request blocks
    return description.replace(
      /--- EDIT REQUEST FROM EVENTS OFFICE \([^)]+\) ---[\s\S]*?--- END EDIT REQUEST ---/g,
      ''
    ).trim();
  };

  const onSave = async (id) => {
    setLoading(true);
    try {
      // Remove edit requests from the description when saving
      const cleanedAgenda = removeEditRequests(editData.agenda || '');

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
        description: cleanedAgenda,
        professors: (editData.professors || [])
          .filter(p => (p?.name || '').trim().length > 0)
          .map(p => ({ name: p.name.trim(), department: (p.department || '').trim() })),
      };
      await updateEvent(id, payload);
      showToast.success('Workshop updated successfully! Edit requests have been removed.');
      setEditing(null);
      setEditData({});
      // Reset form
      setForm({
        title: '', shortDescription: '', location: 'GUC Cairo', startDate: '', endDate: '', registrationDeadline: '',
        facultyName: '', requiredBudget: '', fundingSource: 'Grant', extraRequiredResourses: false,
        agenda: '', capacity: '', professors: [{ name: '', department: '' }], status: 'pending'
      });
      await refresh();
      // Redirect to professor dashboard
      navigate('/ProfessorDashboard');
    } catch (err) {
      showToast.error(err.message || 'Failed to update workshop');
    }
    finally { setLoading(false); }
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
        <button
          onClick={() => navigate('/ProfessorDashboard')}
          style={{
            ...buttonStyles.back,
            marginBottom: spacing.xl,
          }}
          onMouseEnter={(e) => {
            e.target.style.background = colors.accent;
            e.target.style.color = colors.primary;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = colors.primary;
          }}
        >
          ← Back
        </button>
        <h1 style={{
          margin: 0,
          color: colors.primary,
          fontWeight: typography.fontWeight.extrabold,
          fontSize: typography.fontSize['2xl'],
          textAlign: 'center',
          marginBottom: spacing['2xl'],
        }}>{editOnly ? 'Edit Workshop' : 'Professor — Workshops'}</h1>

        {loadingWorkshop && (
          <div style={{
            padding: spacing.xl,
            textAlign: 'center',
            color: colors.primary,
            fontSize: typography.fontSize.base,
          }}>
            Loading workshop for editing...
          </div>
        )}

        {editOnly && !editing && (loadingWorkshop ? (
          <div style={{
            padding: spacing.xl,
            textAlign: 'center',
            color: colors.primary,
            fontSize: typography.fontSize.base,
          }}>
            Loading workshop for editing...
          </div>
        ) : (
          <div style={{
            padding: spacing.xl,
            textAlign: 'center',
            color: colors.error,
            fontSize: typography.fontSize.base,
          }}>
            Failed to load workshop. Please try again.
          </div>
        ))}

        {editing ? (
          <div>
            <h2 style={{
              color: colors.primary,
              fontWeight: typography.fontWeight.bold,
              fontSize: typography.fontSize.lg,
              marginTop: spacing.xl,
              marginBottom: spacing.lg,
            }}>Edit Workshop</h2>
            <div style={{
              marginBottom: spacing.xl,
              padding: spacing.lg,
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: borderRadius.lg,
              border: `1px solid rgba(245, 158, 11, 0.3)`
            }}>
              <p style={{
                margin: 0,
                color: colors.primary,
                fontWeight: typography.fontWeight.semibold,
                fontSize: typography.fontSize.base,
              }}>
                ✏️ Editing Workshop: {editData.title || 'Untitled'}
              </p>
            </div>
            <div className="form managerForm">
              <label>
                <input className="input" required value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} />
                <span>Workshop Title</span>
              </label>
              <label>
                <input className="input" value={editData.shortDescription} onChange={e => setEditData({ ...editData, shortDescription: e.target.value })} />
                <span>Short Description</span>
              </label>
              <div className="flex grid-4">
                <label>
                  <select className="input" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })}>
                    <option>GUC Cairo</option>
                    <option>GUC Berlin</option>
                  </select>
                  <span>Location</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" placeholder=" " required value={editData.startDate} onChange={e => setEditData({ ...editData, startDate: e.target.value })} />
                  <span>Start Date/Time</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" placeholder=" " required value={editData.endDate} onChange={e => setEditData({ ...editData, endDate: e.target.value })} />
                  <span>End Date/Time</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" placeholder=" " value={editData.registrationDeadline} onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value })} />
                  <span>Registration Deadline</span>
                </label>
              </div>
              <div className="flex grid-3">
                <label>
                  <input className="input" required value={editData.facultyName} onChange={e => setEditData({ ...editData, facultyName: e.target.value })} />
                  <span>Faculty Name</span>
                </label>
                <label>
                  <input className="input" type="number" required value={editData.requiredBudget} onChange={e => setEditData({ ...editData, requiredBudget: e.target.value })} />
                  <span>Required Budget</span>
                </label>
                <label>
                  <input className="input" type="number" min="0" value={editData.capacity} onChange={e => setEditData({ ...editData, capacity: e.target.value })} />
                  <span>CAPACITY</span>
                </label>
              </div>
              <label>
                <textarea className="input" style={{ minHeight: 90, resize: 'vertical' }} value={editData.agenda} onChange={e => setEditData({ ...editData, agenda: e.target.value })} />
                <span>Full Agenda</span>
              </label>
              <div className="flex">
                <label>
                  <select className="input" value={editData.fundingSource} onChange={e => setEditData({ ...editData, fundingSource: e.target.value })}>
                    <option value="Grant">Grant</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="External">External</option>
                    <option value="Internal">Internal</option>
                  </select>
                  <span>Funding Source</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={!!editData.extraRequiredResourses} onChange={e => setEditData({ ...editData, extraRequiredResourses: e.target.checked })} />
                  <span>Extra Resources Required</span>
                </label>
              </div>
              <div>
                <div style={{
                  color: colors.primary,
                  fontWeight: typography.fontWeight.bold,
                  margin: `${spacing.sm} 0`,
                  fontSize: typography.fontSize.base,
                }}>Professor(s) Participating</div>
                {(editData.professors || []).map((p, idx) => (
                  <div key={idx} className="flex" style={{ gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm }}>
                    <label style={{ flex: 1 }}>
                      <input
                        className="input"
                        style={{ ...inputStyles.base }}
                        value={p.name}
                        onChange={e => {
                          const arr = [...(editData.professors || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setEditData({ ...editData, professors: arr });
                        }}
                      />
                      <span>Professor Name</span>
                    </label>
                    <label style={{ flex: 1 }}>
                      <input
                        className="input"
                        style={{ ...inputStyles.base }}
                        value={p.department}
                        onChange={e => {
                          const arr = [...(editData.professors || [])]; arr[idx] = { ...arr[idx], department: e.target.value }; setEditData({ ...editData, professors: arr });
                        }}
                      />
                      <span>Department</span>
                    </label>
                    <button
                      type="button"
                      className="submit"
                      style={{
                        ...buttonStyles.outline,
                        padding: `${spacing.sm} ${spacing.md}`,
                      }}
                      onClick={() => {
                        const arr = [...(editData.professors || [])]; if (arr.length > 1) { arr.splice(idx, 1); setEditData({ ...editData, professors: arr }); }
                      }}
                      disabled={(editData.professors || []).length <= 1}
                      onMouseEnter={(e) => {
                        if ((editData.professors || []).length > 1) {
                          e.target.style.background = colors.gray100;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if ((editData.professors || []).length > 1) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="submit"
                  style={{
                    ...buttonStyles.primary,
                    marginBottom: spacing.md,
                  }}
                  onClick={() => setEditData({ ...editData, professors: [...(editData.professors || []), { name: '', department: '' }] })}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = shadows.accentHover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = shadows.accent;
                  }}
                >
                  Add Professor
                </button>
              </div>
              <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.lg }}>
                <button
                  className="submit"
                  onClick={() => onSave(editing)}
                  disabled={loading}
                  style={{
                    ...buttonStyles.primary,
                    flex: 1,
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
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="submit"
                  onClick={() => { setEditing(null); setEditData({}); setSearchParams({}); }}
                  style={{
                    ...buttonStyles.outline,
                    flex: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = colors.gray100;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{
              color: colors.primary,
              fontWeight: typography.fontWeight.bold,
              fontSize: typography.fontSize.lg,
              marginTop: spacing.xl,
              marginBottom: spacing.lg,
            }}>Create Workshop</h2>
            <form className="form managerForm" onSubmit={onCreate}>
              <label>
                <input className="input" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                <span>Workshop Title</span>
              </label>
              <label>
                <input className="input" value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} />
                <span>Short Description</span>
              </label>
              <div className="flex grid-4">
                <label>
                  <select className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
                    <option>GUC Cairo</option>
                    <option>GUC Berlin</option>
                  </select>
                  <span>Location</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" placeholder=" " required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  <span>Start Date/Time</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" placeholder=" " required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                  <span>End Date/Time</span>
                </label>
                <label>
                  <input className="input" type="datetime-local" placeholder=" " value={form.registrationDeadline} onChange={e => setForm({ ...form, registrationDeadline: e.target.value })} />
                  <span>Registration Deadline</span>
                </label>
              </div>
              <div className="flex grid-3">
                <label>
                  <input className="input" required value={form.facultyName} onChange={e => setForm({ ...form, facultyName: e.target.value })} />
                  <span>Faculty Name</span>
                </label>
                <label>
                  <input className="input" type="number" required value={form.requiredBudget} onChange={e => setForm({ ...form, requiredBudget: e.target.value })} />
                  <span>Required Budget</span>
                </label>
                <label>
                  <input className="input" type="number" min="0" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
                  <span>CAPACITY</span>
                </label>
              </div>
              <label>
                <textarea className="input" style={{ minHeight: 90, resize: 'vertical' }} value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} />
                <span>Full Agenda</span>
              </label>
              <div className="flex">
                <label>
                  <select className="input" value={form.fundingSource} onChange={e => setForm({ ...form, fundingSource: e.target.value })}>
                    <option value="Grant">Grant</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="External">External</option>
                    <option value="Internal">Internal</option>
                  </select>
                  <span>Funding Source</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={form.extraRequiredResourses} onChange={e => setForm({ ...form, extraRequiredResourses: e.target.checked })} />
                  <span>Extra Resources Required</span>
                </label>
              </div>
              <div>
                <div style={{
                  color: colors.primary,
                  fontWeight: typography.fontWeight.bold,
                  margin: `${spacing.sm} 0`,
                  fontSize: typography.fontSize.base,
                }}>Professor(s) Participating</div>
                {professorInfo && form.professors?.[0]?.name && (
                  <div style={{
                    padding: `${spacing.md} ${spacing.lg}`,
                    background: 'linear-gradient(135deg, rgba(184, 148, 31, 0.12) 0%, rgba(184, 148, 31, 0.08) 100%)',
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.sm,
                    fontSize: typography.fontSize.sm,
                    color: colors.primary,
                    border: '2px solid rgba(184, 148, 31, 0.3)',
                    boxShadow: '0 2px 8px rgba(184, 148, 31, 0.15)',
                  }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>✓</span>
                      First professor auto-filled with your account info
                    </strong>
                  </div>
                )}
                {(form.professors || []).map((p, idx) => (
                  <div key={idx} className="flex" style={{ gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm }}>
                    <label style={{ flex: 1 }}>
                      <input
                        className="input"
                        style={{ ...inputStyles.base }}
                        value={p.name}
                        onChange={e => {
                          const arr = [...(form.professors || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setForm({ ...form, professors: arr });
                        }}
                      />
                      <span>Professor Name</span>
                    </label>
                    <label style={{ flex: 1 }}>
                      <input
                        className="input"
                        style={{ ...inputStyles.base }}
                        value={p.department}
                        onChange={e => {
                          const arr = [...(form.professors || [])]; arr[idx] = { ...arr[idx], department: e.target.value }; setForm({ ...form, professors: arr });
                        }}
                      />
                      <span>Department</span>
                    </label>
                    <button
                      type="button"
                      className="submit"
                      style={{
                        ...buttonStyles.outline,
                        padding: `${spacing.sm} ${spacing.md}`,
                      }}
                      onClick={() => {
                        const arr = [...(form.professors || [])]; if (arr.length > 1) { arr.splice(idx, 1); setForm({ ...form, professors: arr }); }
                      }}
                      disabled={(form.professors || []).length <= 1}
                      onMouseEnter={(e) => {
                        if ((form.professors || []).length > 1) {
                          e.target.style.background = colors.gray100;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if ((form.professors || []).length > 1) {
                          e.target.style.background = 'transparent';
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="submit"
                  style={{
                    ...buttonStyles.primary,
                    marginBottom: spacing.md,
                  }}
                  onClick={() => setForm({ ...form, professors: [...(form.professors || []), { name: '', department: '' }] })}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = shadows.accentHover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = shadows.accent;
                  }}
                >
                  Add Professor
                </button>
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
                {loading ? 'Creating...' : 'Submit Workshop'}
              </button>
            </form>
          </div>
        )}

        {!editOnly && (
          <>
            <h2 style={{
              color: colors.primary,
              fontWeight: typography.fontWeight.bold,
              fontSize: typography.fontSize.lg,
              marginTop: spacing['3xl'],
              marginBottom: spacing.lg,
            }}>My Workshops</h2>
            <div style={{
              display: 'flex',
              gap: spacing.sm,
              alignItems: 'center',
              marginBottom: spacing.lg
            }}>
              <input
                className="input"
                placeholder="Filter by professor name"
                value={professorFilter}
                onChange={e => setProfessorFilter(e.target.value)}
                style={{
                  ...inputStyles.base,
                  flex: 1
                }}
              />
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: spacing.lg
            }}>
              {workshops.map((w) => (
                <div key={w._id} style={{
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
                  {editing === w._id ? (
                    <div>
                      <input
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        value={editData.title}
                        onChange={e => setEditData({ ...editData, title: e.target.value })}
                        placeholder="Title"
                      />
                      <select
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        value={editData.location}
                        onChange={e => setEditData({ ...editData, location: e.target.value })}
                      >
                        <option>GUC Cairo</option>
                        <option>GUC Berlin</option>
                      </select>
                      <input
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        type="datetime-local"
                        placeholder=" "
                        value={editData.startDate}
                        onChange={e => setEditData({ ...editData, startDate: e.target.value })}
                      />
                      <input
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        type="datetime-local"
                        value={editData.endDate}
                        onChange={e => setEditData({ ...editData, endDate: e.target.value })}
                      />
                      <input
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        type="datetime-local"
                        placeholder=" "
                        value={editData.registrationDeadline}
                        onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value })}
                      />
                      <input
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        value={editData.facultyName}
                        onChange={e => setEditData({ ...editData, facultyName: e.target.value })}
                        placeholder="Faculty Name"
                      />
                      <input
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        type="number"
                        value={editData.requiredBudget}
                        onChange={e => setEditData({ ...editData, requiredBudget: e.target.value })}
                        placeholder="Required Budget"
                      />
                      <input
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        type="number"
                        min="0"
                        value={editData.capacity}
                        onChange={e => setEditData({ ...editData, capacity: e.target.value })}
                        placeholder="CAPACITY"
                      />
                      <select
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm
                        }}
                        value={editData.fundingSource}
                        onChange={e => setEditData({ ...editData, fundingSource: e.target.value })}
                      >
                        <option value="Grant">Grant</option>
                        <option value="Sponsor">Sponsor</option>
                        <option value="External">External</option>
                        <option value="Internal">Internal</option>
                      </select>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing.sm,
                        marginBottom: spacing.sm
                      }}>
                        <input
                          type="checkbox"
                          checked={!!editData.extraRequiredResourses}
                          onChange={e => setEditData({ ...editData, extraRequiredResourses: e.target.checked })}
                        />
                        <span style={{ fontSize: typography.fontSize.sm }}>Extra Resources Required</span>
                      </label>
                      <textarea
                        className="input"
                        style={{
                          ...inputStyles.base,
                          marginBottom: spacing.sm,
                          minHeight: 80
                        }}
                        placeholder="Full Agenda"
                        value={editData.agenda}
                        onChange={e => setEditData({ ...editData, agenda: e.target.value })}
                      />
                      <div style={{
                        color: colors.primary,
                        fontWeight: typography.fontWeight.bold,
                        margin: `${spacing.sm} 0`,
                        fontSize: typography.fontSize.base,
                      }}>Professor(s) Participating</div>
                      {(editData.professors || []).map((p, idx) => (
                        <div key={idx} className="flex" style={{ gap: spacing.sm, alignItems: 'center', marginBottom: spacing.sm }}>
                          <label style={{ flex: 1 }}>
                            <input
                              className="input"
                              style={{ ...inputStyles.base }}
                              value={p.name}
                              onChange={e => {
                                const arr = [...(editData.professors || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setEditData({ ...editData, professors: arr });
                              }}
                            />
                            <span>Professor Name</span>
                          </label>
                          <label style={{ flex: 1 }}>
                            <input
                              className="input"
                              style={{ ...inputStyles.base }}
                              value={p.department}
                              onChange={e => {
                                const arr = [...(editData.professors || [])]; arr[idx] = { ...arr[idx], department: e.target.value }; setEditData({ ...editData, professors: arr });
                              }}
                            />
                            <span>Department</span>
                          </label>
                          <button
                            type="button"
                            className="submit"
                            style={{
                              ...buttonStyles.outline,
                              padding: `${spacing.sm} ${spacing.md}`,
                            }}
                            onClick={() => {
                              const arr = [...(editData.professors || [])]; if (arr.length > 1) { arr.splice(idx, 1); setEditData({ ...editData, professors: arr }); }
                            }}
                            disabled={(editData.professors || []).length <= 1}
                            onMouseEnter={(e) => {
                              if ((editData.professors || []).length > 1) {
                                e.target.style.background = colors.gray100;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if ((editData.professors || []).length > 1) {
                                e.target.style.background = 'transparent';
                              }
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="submit"
                        style={{
                          ...buttonStyles.primary,
                          marginBottom: spacing.md,
                        }}
                        onClick={() => setEditData({ ...editData, professors: [...(editData.professors || []), { name: '', department: '' }] })}
                        onMouseEnter={(e) => {
                          e.target.style.boxShadow = shadows.accentHover;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.boxShadow = shadows.accent;
                        }}
                      >
                        Add Professor
                      </button>
                      <div style={{ display: 'flex', gap: spacing.sm }}>
                        <button
                          className="submit"
                          onClick={() => onSave(w._id)}
                          style={{
                            ...buttonStyles.primary,
                            flex: 1,
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.boxShadow = shadows.accentHover;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.boxShadow = shadows.accent;
                          }}
                        >
                          Save
                        </button>
                        <button
                          className="submit"
                          onClick={() => setEditing(null)}
                          style={{
                            ...buttonStyles.outline,
                            flex: 1,
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = colors.gray100;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        fontWeight: typography.fontWeight.extrabold,
                        color: colors.primary,
                        fontSize: typography.fontSize.lg,
                        marginBottom: spacing.sm,
                      }}>
                        {w.title}
                      </div>
                      <div style={{
                        color: colors.gray500,
                        fontSize: typography.fontSize.xs,
                        marginBottom: spacing.xs,
                      }}>
                        📍 {w.location} • {w.facultyName}
                      </div>
                      <div style={{
                        color: colors.gray500,
                        fontSize: typography.fontSize.xs,
                        marginBottom: spacing.md,
                      }}>
                        From {new Date(w.startDate).toLocaleString()} to {w.endDate ? new Date(w.endDate).toLocaleString() : '—'}
                      </div>
                      <button
                        className="submit"
                        onClick={() => navigate(`/professor/workshops/edit/${w._id}`)}
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

export default WorkshopsManager;