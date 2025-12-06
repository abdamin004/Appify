import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { createTrip, listTrips, updateEvent, getEventById } from '../../../services/eventService';
import RoleSelector from '../RoleSelector';
import { showToast } from '../../../utils/toast';
import Input from '../../UI/Input';
import Button from '../../UI/Button';
import FormLayout from '../../UI/FormLayout';

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
    } catch (_) { }
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
          startDate: trip.startDate ? trip.startDate.slice(0, 16) : '',
          endDate: trip.endDate ? trip.endDate.slice(0, 16) : '',
          registrationDeadline: trip.registrationDeadline ? trip.registrationDeadline.slice(0, 16) : '',
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
      startDate: row.startDate ? row.startDate.slice(0, 16) : '',
      endDate: row.endDate ? row.endDate.slice(0, 16) : '',
      registrationDeadline: row.registrationDeadline ? row.registrationDeadline.slice(0, 16) : '',
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

  if (editing || (editOnly && editId)) {
    return (
      <FormLayout
        title="Edit Trip"
        subtitle="Update trip details"
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
              label="Location *"
              value={editData.location}
              onChange={e => setEditData({ ...editData, location: e.target.value })}
              required
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
              label="Price *"
              type="number"
              value={editData.price}
              onChange={e => setEditData({ ...editData, price: e.target.value })}
              required
            />
            <Input
              label="Capacity *"
              type="number"
              value={editData.capacity}
              onChange={e => setEditData({ ...editData, capacity: e.target.value })}
              required
            />
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
      title="Create Trip"
      subtitle="Organize new trips and excursions"
      backLink="/EventOfficeDashboard"
    >
      <form onSubmit={onCreate} className="space-y-6">
        <Input
          label="Title *"
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
            label="Price *"
            type="number"
            value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
            required
          />
          <Input
            label="Capacity *"
            type="number"
            value={form.capacity}
            onChange={e => setForm({ ...form, capacity: e.target.value })}
            required
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
            Create Trip
          </Button>
        </div>
      </form>

      {!editOnly && (
        <div className="mt-16 pt-10 border-t border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">Existing Trips</h2>

          {trips.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-800/30 rounded-xl border border-slate-700">
              No trips created yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trips.map((t) => (
                <div
                  key={t._id}
                  className="bg-slate-800/40 border border-slate-700 rounded-xl p-6 shadow-lg hover:border-emerald-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">
                      {t.title}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${t.status === 'published' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}>
                      {t.status || 'published'}
                    </span>
                  </div>

                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                    {t.shortDescription || 'No description provided.'}
                  </p>

                  <div className="space-y-2 text-sm text-slate-400 mb-6">
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      {t.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>💰</span>
                      {t.price} EGP
                    </div>
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      Capacity: {t.capacity ?? '-'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      {new Date(t.startDate).toLocaleDateString()}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/events-office/trips/edit/${t._id}`)}
                  >
                    Edit Trip
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

export default TripsManager;
