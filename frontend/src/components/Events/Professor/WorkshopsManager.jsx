import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { createWorkshop, listWorkshopsByProfessor, updateEvent, getEventById } from '../../../services/eventService';
import { createEventOfficeNotification } from '../../../services/notificationService';
import { showToast } from '../../../utils/toast';
import Input from '../../UI/Input';
import Select from '../../UI/Select';
import Button from '../../UI/Button';
import FormLayout from '../../UI/FormLayout';

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

  if (editing || (editOnly && editId)) {
    return (
      <FormLayout
        title="Edit Workshop"
        subtitle="Update workshop details"
        backLink="/ProfessorDashboard"
      >
        {loadingWorkshop ? (
          <div className="text-center py-10 text-slate-500">Loading workshop for editing...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 font-medium flex items-center gap-2">
                <span>✏️</span> Editing Workshop: {editData.title || 'Untitled'}
              </p>
            </div>

            <Input
              label="Workshop Title *"
              value={editData.title}
              onChange={e => setEditData({ ...editData, title: e.target.value })}
              required
            />

            <Input
              label="Short Description"
              value={editData.shortDescription}
              onChange={e => setEditData({ ...editData, shortDescription: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Location *"
                value={editData.location}
                onChange={e => setEditData({ ...editData, location: e.target.value })}
                options={[
                  { label: 'GUC Cairo', value: 'GUC Cairo' },
                  { label: 'GUC Berlin', value: 'GUC Berlin' }
                ]}
              />
              <Input
                label="Registration Deadline"
                type="datetime-local"
                value={editData.registrationDeadline}
                onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Start Date/Time *"
                type="datetime-local"
                value={editData.startDate}
                onChange={e => setEditData({ ...editData, startDate: e.target.value })}
                required
              />
              <Input
                label="End Date/Time *"
                type="datetime-local"
                value={editData.endDate}
                onChange={e => setEditData({ ...editData, endDate: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Faculty Name *"
                value={editData.facultyName}
                onChange={e => setEditData({ ...editData, facultyName: e.target.value })}
                required
              />
              <Input
                label="Required Budget *"
                type="number"
                value={editData.requiredBudget}
                onChange={e => setEditData({ ...editData, requiredBudget: e.target.value })}
                required
              />
              <Input
                label="Capacity"
                type="number"
                min="0"
                value={editData.capacity}
                onChange={e => setEditData({ ...editData, capacity: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Funding Source"
                value={editData.fundingSource}
                onChange={e => setEditData({ ...editData, fundingSource: e.target.value })}
                options={[
                  { label: 'Grant', value: 'Grant' },
                  { label: 'Sponsor', value: 'Sponsor' },
                  { label: 'External', value: 'External' },
                  { label: 'Internal', value: 'Internal' }
                ]}
              />
              <div className="flex items-center h-full pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={!!editData.extraRequiredResourses}
                    onChange={e => setEditData({ ...editData, extraRequiredResourses: e.target.checked })}
                  />
                  <span className="text-slate-700 font-medium">Extra Resources Required</span>
                </label>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-slate-700">Full Agenda</span>
              </label>
              <textarea
                className="textarea w-full bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all h-32"
                value={editData.agenda}
                onChange={e => setEditData({ ...editData, agenda: e.target.value })}
                placeholder="Enter the full agenda here..."
              />
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Professor(s) Participating</h3>

              {(editData.professors || []).map((p, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                  <div className="flex-1 w-full">
                    <Input
                      label="Professor Name"
                      value={p.name}
                      onChange={e => {
                        const arr = [...(editData.professors || [])];
                        arr[idx] = { ...arr[idx], name: e.target.value };
                        setEditData({ ...editData, professors: arr });
                      }}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <Input
                      label="Department"
                      value={p.department}
                      onChange={e => {
                        const arr = [...(editData.professors || [])];
                        arr[idx] = { ...arr[idx], department: e.target.value };
                        setEditData({ ...editData, professors: arr });
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 mb-[2px]"
                    onClick={() => {
                      const arr = [...(editData.professors || [])];
                      if (arr.length > 1) {
                        arr.splice(idx, 1);
                        setEditData({ ...editData, professors: arr });
                      }
                    }}
                    disabled={(editData.professors || []).length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <Button
                variant="secondary"
                onClick={() => setEditData({ ...editData, professors: [...(editData.professors || []), { name: '', department: '' }] })}
                className="mt-2"
              >
                + Add Professor
              </Button>
            </div>

            <div className="pt-6 border-t border-slate-700 flex gap-4">
              <Button
                onClick={() => onSave(editOnly ? editId : editing)}
                loading={loading}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  if (editOnly) navigate('/ProfessorDashboard');
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </FormLayout>
    );
  }

  return (
    <FormLayout
      title="Create Workshop"
      subtitle="Submit a new workshop proposal"
      backLink="/ProfessorDashboard"
    >
      <form onSubmit={onCreate} className="space-y-6">
        <Input
          label="Workshop Title *"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
        />

        <Input
          label="Short Description"
          value={form.shortDescription}
          onChange={e => setForm({ ...form, shortDescription: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Location *"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            options={[
              { label: 'GUC Cairo', value: 'GUC Cairo' },
              { label: 'GUC Berlin', value: 'GUC Berlin' }
            ]}
          />
          <Input
            label="Registration Deadline"
            type="datetime-local"
            value={form.registrationDeadline}
            onChange={e => setForm({ ...form, registrationDeadline: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Start Date/Time *"
            type="datetime-local"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
            required
          />
          <Input
            label="End Date/Time *"
            type="datetime-local"
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Faculty Name *"
            value={form.facultyName}
            onChange={e => setForm({ ...form, facultyName: e.target.value })}
            required
          />
          <Input
            label="Required Budget *"
            type="number"
            value={form.requiredBudget}
            onChange={e => setForm({ ...form, requiredBudget: e.target.value })}
            required
          />
          <Input
            label="Capacity"
            type="number"
            min="0"
            value={form.capacity}
            onChange={e => setForm({ ...form, capacity: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Funding Source"
            value={form.fundingSource}
            onChange={e => setForm({ ...form, fundingSource: e.target.value })}
            options={[
              { label: 'Grant', value: 'Grant' },
              { label: 'Sponsor', value: 'Sponsor' },
              { label: 'External', value: 'External' },
              { label: 'Internal', value: 'Internal' }
            ]}
          />
          <div className="flex items-center h-full pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={form.extraRequiredResourses}
                onChange={e => setForm({ ...form, extraRequiredResourses: e.target.checked })}
              />
              <span className="text-slate-700 font-medium">Extra Resources Required</span>
            </label>
          </div>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-semibold text-slate-700">Full Agenda</span>
          </label>
          <textarea
            className="textarea w-full bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all h-32"
            value={form.agenda}
            onChange={e => setForm({ ...form, agenda: e.target.value })}
            placeholder="Enter the full agenda here..."
          />
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h3 className="text-lg font-bold text-white mb-4">Professor(s) Participating</h3>

          {professorInfo && form.professors?.[0]?.name && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3 mb-4 text-sm text-emerald-300 flex items-center gap-2">
              <span>✓</span> First professor auto-filled with your account info
            </div>
          )}

          {(form.professors || []).map((p, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-4 mb-4 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="Professor Name"
                  value={p.name}
                  onChange={e => {
                    const arr = [...(form.professors || [])];
                    arr[idx] = { ...arr[idx], name: e.target.value };
                    setForm({ ...form, professors: arr });
                  }}
                />
              </div>
              <div className="flex-1 w-full">
                <Input
                  label="Department"
                  value={p.department}
                  onChange={e => {
                    const arr = [...(form.professors || [])];
                    arr[idx] = { ...arr[idx], department: e.target.value };
                    setForm({ ...form, professors: arr });
                  }}
                />
              </div>
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 mb-[2px]"
                onClick={() => {
                  const arr = [...(form.professors || [])];
                  if (arr.length > 1) {
                    arr.splice(idx, 1);
                    setForm({ ...form, professors: arr });
                  }
                }}
                disabled={(form.professors || []).length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() => setForm({ ...form, professors: [...(form.professors || []), { name: '', department: '' }] })}
            className="mt-2"
          >
            + Add Professor
          </Button>
        </div>

        <div className="pt-6">
          <Button
            type="submit"
            loading={loading}
            className="w-full text-lg"
          >
            Submit Workshop
          </Button>
        </div>
      </form>

      {!editOnly && (
        <div className="mt-16 pt-10 border-t border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">My Workshops</h2>

          <div className="mb-6">
            <Input
              placeholder="Filter by professor name..."
              value={professorFilter}
              onChange={e => setProfessorFilter(e.target.value)}
              className="max-w-md"
            />
          </div>

          {workshops.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-800/30 rounded-xl border border-slate-700">
              {professorFilter ? 'No workshops found matching filter.' : 'Enter a professor name to see workshops.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workshops.map((w) => (
                <div
                  key={w._id}
                  className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 shadow-lg hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                      {w.title}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${w.status === 'published' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      w.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}>
                      {w.status || 'pending'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-400 mb-6">
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      {w.location} • {w.facultyName}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      {new Date(w.startDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⏰</span>
                      {new Date(w.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {w.endDate ? new Date(w.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/professor/workshops/edit/${w._id}`)}
                  >
                    Edit Workshop
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </FormLayout>
  );
}

export default WorkshopsManager;