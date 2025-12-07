import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBooth, listBooths, updateEvent } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import Input from '../../UI/Input';
import DateTimePicker from '../../UI/DateTimePicker';
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
            <DateTimePicker
              label="Start Date/Time *"
              value={editData.startDate || ''}
              onChange={e => setEditData({ ...editData, startDate: e.target.value?.target?.value || e.target.value })}
              required
            />
            <DateTimePicker
              label="End Date/Time *"
              value={editData.endDate || ''}
              onChange={e => setEditData({ ...editData, endDate: e.target.value?.target?.value || e.target.value })}
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
            <DateTimePicker
              label="Registration Deadline"
              value={editData.registrationDeadline || ''}
              onChange={e => setEditData({ ...editData, registrationDeadline: e.target.value?.target?.value || e.target.value })}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Location *"
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            required
            placeholder="e.g. Hall A, Booth 12"
          />
          <DateTimePicker
            label="Registration Deadline"
            value={form.registrationDeadline}
            onChange={e => setForm({ ...form, registrationDeadline: e.target.value?.target?.value || e.target.value })}
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
    </FormLayout>
  );
}

export default BoothsManager;

