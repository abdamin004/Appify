import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { createConference, listConferences, updateEvent, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import Input from '../../UI/Input';
import Select from '../../UI/Select';
import Button from '../../UI/Button';
import FormLayout from '../../UI/FormLayout';

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
    fundingSource: 'internal',
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
    } catch (_) { }
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
          startDate: conf.startDate ? conf.startDate.slice(0, 16) : '',
          endDate: conf.endDate ? conf.endDate.slice(0, 16) : '',
          registrationDeadline: conf.registrationDeadline ? conf.registrationDeadline.slice(0, 16) : '',
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
        fundingSource: 'internal',
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
      startDate: row.startDate ? row.startDate.slice(0, 16) : '',
      endDate: row.endDate ? row.endDate.slice(0, 16) : '',
      registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0, 16) : '',
      status: row.status || 'published',
      agenda: row.agenda || '',
      websiteLink: row.websiteLink || '',
      requiredBudget: row.requiredBudget ?? '',
      fundingSource: row.fundingSource || 'internal',
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

  if (editing || (editOnly && editId)) {
    return (
      <FormLayout
        title="Edit Conference"
        subtitle="Update conference details and settings"
        backLink="/EventOfficeDashboard"
      >
        <div className="space-y-6">
          <Input
            label="Title *"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Registration Deadline"
              type="datetime-local"
              value={editData.registrationDeadline}
              onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value })}
            />
            <Input
              label="Conference Website Link *"
              type="url"
              value={editData.websiteLink}
              onChange={e => setEditData({ ...editData, websiteLink: e.target.value })}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold text-slate-300">Full Agenda</span>
            </label>
            <textarea
              className="textarea w-full bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all h-32"
              value={editData.agenda}
              onChange={e => setEditData({ ...editData, agenda: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Required Budget"
              type="number"
              min="0"
              value={editData.requiredBudget}
              onChange={e => setEditData({ ...editData, requiredBudget: e.target.value })}
            />
            <Select
              label="Source of Funding"
              value={editData.fundingSource}
              onChange={e => setEditData({ ...editData, fundingSource: e.target.value })}
              options={[
                { value: 'internal', label: 'Internal' },
                { value: 'external', label: 'External' }
              ]}
            />
          </div>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={editData.extraRequiredResourses}
                onChange={e => setEditData({ ...editData, extraRequiredResourses: e.target.checked })}
              />
              <span className="label-text font-medium">Extra Required Resources</span>
            </label>
          </div>

          <RoleSelector
            selectedRoles={allowedRoles}
            onChange={setAllowedRoles}
            label="Restrict Event to Specific Roles"
          />

          <div className="pt-6 border-t border-slate-100 flex gap-4">
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
                if (editOnly) navigate('/EventOfficeDashboard');
              }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </FormLayout>
    );
  }

  return (
    <FormLayout
      title="Create Conference"
      subtitle="Organize academic or professional conferences"
      backLink="/EventOfficeDashboard"
    >
      <form onSubmit={onCreate} className="space-y-6">
        <Input
          label="Title *"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          placeholder="e.g. Annual Tech Summit"
        />

        <Input
          label="Short Description"
          value={form.shortDescription}
          onChange={e => setForm({ ...form, shortDescription: e.target.value })}
          placeholder="Brief overview of the conference..."
        />

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Registration Deadline"
            type="datetime-local"
            value={form.registrationDeadline}
            onChange={e => setForm({ ...form, registrationDeadline: e.target.value })}
          />
          <Input
            label="Conference Website Link *"
            type="url"
            value={form.websiteLink}
            onChange={e => setForm({ ...form, websiteLink: e.target.value })}
            required
            placeholder="https://"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-bold text-slate-700">Full Agenda</span>
          </label>
          <textarea
            className="textarea w-full bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all h-32"
            value={form.agenda}
            onChange={e => setForm({ ...form, agenda: e.target.value })}
            placeholder="Detailed schedule..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Required Budget"
            type="number"
            min="0"
            value={form.requiredBudget}
            onChange={e => setForm({ ...form, requiredBudget: e.target.value })}
            placeholder="0.00"
          />
          <Select
            label="Source of Funding"
            value={form.fundingSource}
            onChange={e => setForm({ ...form, fundingSource: e.target.value })}
            options={[
              { value: 'internal', label: 'Internal' },
              { value: 'external', label: 'External' }
            ]}
          />
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              checked={form.extraRequiredResourses}
              onChange={e => setForm({ ...form, extraRequiredResourses: e.target.checked })}
            />
            <span className="label-text font-medium">Extra Required Resources</span>
          </label>
        </div>

        <RoleSelector
          selectedRoles={allowedRoles}
          onChange={setAllowedRoles}
          label="Restrict Event to Specific Roles"
        />

        <div className="pt-6">
          <Button
            type="submit"
            loading={loading}
            className="w-full text-lg"
          >
            Create Conference
          </Button>
        </div>
      </form>

      {!editOnly && (
        <div className="mt-16 pt-10 border-t border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">Existing Conferences</h2>

          {listLoading ? (
            <div className="text-center py-10">
              <span className="loading loading-spinner loading-lg text-emerald-500"></span>
            </div>
          ) : confs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-800/30 rounded-xl border border-slate-700">
              No conferences found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {confs.map((c) => (
                <div
                  key={c._id}
                  className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 shadow-lg hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                      {c.title}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.status === 'published' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}>
                      {c.status || 'published'}
                    </span>
                  </div>

                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {c.shortDescription || 'No description provided.'}
                  </p>

                  <div className="space-y-2 text-sm text-slate-400 mb-6">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'TBA'} - {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'TBA'}
                    </div>
                    {c.websiteLink && (
                      <div className="flex items-center gap-2">
                        <span>🔗</span>
                        <a href={c.websiteLink} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                    {(c.requiredBudget || c.fundingSource) && (
                      <div className="flex items-center gap-2 text-xs">
                        <span>💰</span>
                        {c.requiredBudget ? `$${c.requiredBudget}` : ''}
                        {c.requiredBudget && c.fundingSource ? ' • ' : ''}
                        {c.fundingSource ? c.fundingSource : ''}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/events-office/conferences/edit/${c._id}`)}
                  >
                    Edit Details
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

export default ConferencesManager;