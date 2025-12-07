import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { createWorkshop, listWorkshopsByProfessor, updateEvent, getEventById, uploadWorkshopResource, getWorkshopResources } from '../../../services/eventService';
import { createEventOfficeNotification } from '../../../services/notificationService';
import { showToast } from '../../../utils/toast';
import Input from '../../UI/Input';
import DateTimePicker from '../../UI/DateTimePicker';
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
  const [resources, setResources] = useState([]);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState([]); // For create mode

  console.log('RENDER: Current filesToUpload:', filesToUpload);

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
      const [workshop, resourceList] = await Promise.all([
        getEventById(id),
        getWorkshopResources(id).catch((err) => {
          console.warn('Failed to fetch resources:', err);
          return [];
        })
      ]);

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

        const resourcesArray = (resourceList && resourceList.data && Array.isArray(resourceList.data)) ? resourceList.data : (Array.isArray(resourceList) ? resourceList : []);
        setResources(resourcesArray);

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
      const newWorkshopId = createdWorkshop.event?._id || createdWorkshop.event?.id || createdWorkshop._id || createdWorkshop.id;

      if (filesToUpload.length > 0) {
        await handleUploadsForNewWorkshop(newWorkshopId, filesToUpload);
      }

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

  // Helper to handle uploads after creation
  const handleUploadsForNewWorkshop = async (workshopId, files) => {
    if (!files || files.length === 0) return;

    // Upload files one by one or all at once? Backend supports array 'files'
    // Let's send them all in one request if backend supports it, or iterate
    // Current backend implementation expects 'files' field.
    try {
      setUploadingResource(true);
      const formData = new FormData();
      // Append all selected files
      Array.from(files).forEach(fileObj => {
        // Handle both raw File objects (legacy/fallback) and wrapped objects
        const actualFile = fileObj.file || fileObj;
        formData.append('files', actualFile);
      });

      await uploadWorkshopResource(workshopId, formData);
      showToast.success('Workshop resources uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      showToast.error('Workshop created, but failed to upload resources: ' + err.message);
    } finally {
      setUploadingResource(false);
    }
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

      // Handle pending file uploads if any
      if (filesToUpload.length > 0) {
        await handleUploadsForNewWorkshop(id, filesToUpload);
        setFilesToUpload([]);
      }

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
              <DateTimePicker
                label="Registration Deadline"
                value={editData.registrationDeadline}
                onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value?.target?.value || e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateTimePicker
                label="Start Date/Time *"
                value={editData.startDate}
                onChange={e => setEditData({ ...editData, startDate: e.target.value?.target?.value || e.target.value })}
                required
              />
              <DateTimePicker
                label="End Date/Time *"
                value={editData.endDate}
                onChange={e => setEditData({ ...editData, endDate: e.target.value?.target?.value || e.target.value })}
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
                className="textarea w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all h-32"
                value={editData.agenda}
                onChange={e => setEditData({ ...editData, agenda: e.target.value })}
                placeholder="Enter the full agenda here..."
              />
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Workshop Resources</h3>

              {/* Resource List */}
              {resources.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {resources.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-2xl">📄</span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-slate-700 truncate">{res.name}</span>
                          <a
                            href={res.url && res.url.startsWith('http') ? res.url : `http://localhost:5001${res.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View File
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mb-4 italic">No resources uploaded yet.</p>
              )}

              {/* Upload Button */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  id="resource-upload"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    console.log('Edit Mode: File selection:', files);
                    if (files && files.length > 0) {
                      const newFiles = Array.from(files).map(f => ({
                        name: f.name,
                        size: f.size,
                        type: f.type,
                        file: f
                      }));
                      console.log('Edit Mode: Adding mapped files', newFiles.length);
                      setFilesToUpload(prev => [...prev, ...newFiles]);
                    }
                    e.target.value = ''; // Reset input to allow re-selecting same files
                  }}
                />
                <label
                  htmlFor="resource-upload"
                  className="btn btn-sm btn-outline gap-2"
                >
                  📤 Select New Resources
                </label>
                {filesToUpload.length > 0 && (
                  <span className="text-sm text-emerald-600 ml-2">
                    {filesToUpload.length} file(s) pending save
                  </span>
                )}
              </div>

              {/* Preview of Pending Uploads */}
              {filesToUpload.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700">Pending Uploads:</h4>
                  {filesToUpload.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 text-emerald-800 rounded text-sm border border-emerald-100">
                      <span>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFilesToUpload(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                onClick={() => setEditData({ ...editData, professors: [...(editData.professors || []), { name: '', department: '' }] })}
                className="mt-2 bg-slate-900 text-white hover:bg-slate-800 border-none"
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
    )
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
          <DateTimePicker
            label="Registration Deadline"
            value={form.registrationDeadline}
            onChange={e => setForm({ ...form, registrationDeadline: e.target.value?.target?.value || e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DateTimePicker
            label="Start Date/Time *"
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value?.target?.value || e.target.value })}
            required
          />
          <DateTimePicker
            label="End Date/Time *"
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value?.target?.value || e.target.value })}
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
            className="textarea w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all h-32"
            value={form.agenda}
            onChange={e => setForm({ ...form, agenda: e.target.value })}
            placeholder="Enter the full agenda here..."
          />
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Workshop Resources</h3>

          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-2">Upload resources now (optional) or later via Edit.</p>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="create-resource-upload"
                className="hidden"
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  console.log('Create Mode: File selection:', files);
                  if (files && files.length > 0) {
                    const newFiles = Array.from(files).map(f => ({
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      file: f
                    }));
                    console.log('Create Mode: Adding mapped files', newFiles.length);
                    setFilesToUpload(prev => [...prev, ...newFiles]);
                  }
                  e.target.value = '';
                }}
              />
              <label htmlFor="create-resource-upload" className="btn btn-sm btn-outline gap-2">
                📤 Select Files
              </label>
            </div>

            {/* Pending List for Create Mode */}
            {filesToUpload.length > 0 && (
              <div className="mt-3 space-y-2">
                {filesToUpload.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 text-emerald-800 rounded text-sm border border-emerald-100">
                    <span>{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFilesToUpload(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Professor(s) Participating</h3>

          {professorInfo && form.professors?.[0]?.name && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 text-sm text-emerald-700 flex items-center gap-2">
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
            onClick={() => setForm({ ...form, professors: [...(form.professors || []), { name: '', department: '' }] })}
            className="mt-2 bg-slate-900 text-white hover:bg-slate-800 border-none"
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
    </FormLayout>
  );
}

export default WorkshopsManager;