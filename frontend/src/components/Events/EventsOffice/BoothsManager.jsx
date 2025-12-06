import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooth, listBooths, updateEvent } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import FormLayout from '../../UI/FormLayout';

function BoothsManager() {
  const navigate = useNavigate();
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
    setLoading(true);
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
      showToast.error(err.message || 'Failed to create booth');
    } finally { setLoading(false); }
  };

  const onUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    try {
      await updateEvent(editing, editData);
      showToast.success('Booth updated successfully');
      setEditing(null);
      setEditData({});
      await refresh();
    } catch (err) {
      showToast.error(err.message || 'Failed to update booth');
    } finally { setLoading(false); }
  };

  if (editing) {
    return (
      <FormLayout
        title="Edit Booth"
        subtitle="Update booth details and settings"
        backLink="/EventOfficeDashboard"
      >
        <div className="space-y-6">
          <Input
            label="Title *"
            value={editData.title || ''}
            onChange={e => setEditData({ ...editData, title: e.target.value })}
            required
          />

          <Input
            label="Short Description"
            value={editData.shortDescription || ''}
            onChange={e => setEditData({ ...editData, shortDescription: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Start Date/Time *"
              type="datetime-local"
              value={editData.startDate || ''}
              onChange={e => setEditData({ ...editData, startDate: e.target.value })}
              required
            />
            <Input
              label="End Date/Time *"
              type="datetime-local"
              value={editData.endDate || ''}
              onChange={e => setEditData({ ...editData, endDate: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Location *"
              value={editData.location || ''}
              onChange={e => setEditData({ ...editData, location: e.target.value })}
              required
            />
            <Input
              label="Registration Deadline"
              type="datetime-local"
              value={editData.registrationDeadline || ''}
              onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value })}
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex gap-4">
            <Button
              onClick={onUpdate}
              loading={loading}
              className="flex-1"
            >
              Update Booth
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setEditData({});
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
      title="Create Booth"
      subtitle="Set up a new booth for vendors"
      backLink="/EventOfficeDashboard"
    >
      <form onSubmit={onCreate} className="space-y-6">
        <Input
          label="Title *"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          required
          placeholder="e.g. Tech Showcase Booth"
        />

        <Input
          label="Short Description"
          value={form.shortDescription}
          onChange={e => setForm({ ...form, shortDescription: e.target.value })}
          placeholder="Brief summary of the booth..."
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
            label="Location *"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            required
            placeholder="e.g. Hall A, Booth 12"
          />
          <Input
            label="Registration Deadline"
            type="datetime-local"
            value={form.registrationDeadline}
            onChange={e => setForm({ ...form, registrationDeadline: e.target.value })}
          />
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
            Create Booth
          </Button>
        </div>
      </form>

      {booths.length > 0 && (
        <div className="mt-16 pt-10 border-t border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Existing Booths</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {booths.map((b) => (
              <div
                key={b._id || b.id}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group hover:border-emerald-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {b.title}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${b.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {b.status || 'published'}
                  </span>
                </div>

                <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                  {b.shortDescription || 'No description provided.'}
                </p>

                <div className="space-y-2 text-sm text-slate-500 mb-6">
                  <div className="flex items-center gap-2">
                    <span>📍</span> {b.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📅</span> {b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setEditing(b._id || b.id);
                    setEditData({
                      title: b.title,
                      shortDescription: b.shortDescription,
                      location: b.location,
                      startDate: b.startDate ? new Date(b.startDate).toISOString().slice(0, 16) : '',
                      endDate: b.endDate ? new Date(b.endDate).toISOString().slice(0, 16) : '',
                      registrationDeadline: b.registrationDeadline ? new Date(b.registrationDeadline).toISOString().slice(0, 16) : '',
                      status: b.status || 'published'
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Edit Details
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </FormLayout>
  );
}

export default BoothsManager;

