import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../services/eventService';
import { showToast, confirmDialog } from '../../utils/toast';
import Input from '../UI/Input';
import Button from '../UI/Button';

export default function BlackoutDatesManagement() {
    const [dates, setDates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    const [newDate, setNewDate] = useState({
        name: '',
        reason: '',
        startDate: '',
        endDate: ''
    });

    const fetchDates = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/blackout-dates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDates(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to fetch blackout dates', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDates();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newDate.name || !newDate.startDate || !newDate.endDate) {
            showToast.warning('Please fill in all required fields');
            return;
        }

        try {
            setCreating(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/blackout-dates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newDate)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to create blackout date');
            }

            showToast.success('Blackout date created successfully');
            setNewDate({ name: '', reason: '', startDate: '', endDate: '' });
            fetchDates();
        } catch (err) {
            showToast.error(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirmDialog('Are you sure you want to delete this blackout date?', 'Delete Blackout Date');
        if (!confirmed) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/blackout-dates/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error('Failed to delete blackout date');
            }

            showToast.success('Blackout date deleted');
            setDates(prev => prev.filter(d => d._id !== id));
        } catch (err) {
            showToast.error(err.message);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Blackout Dates Management</h2>
                    <p className="text-slate-500">Manage periods where event creation/updates are restricted.</p>
                </div>
            </div>

            {/* Create Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Add New Blackout Period</h3>
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Name/Title *"
                            placeholder="e.g. Winter Break"
                            value={newDate.name}
                            onChange={e => setNewDate({ ...newDate, name: e.target.value })}
                            required
                        />
                        <Input
                            label="Reason (Optional)"
                            placeholder="Internal maintenance, University holiday..."
                            value={newDate.reason}
                            onChange={e => setNewDate({ ...newDate, reason: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Start Date *"
                            type="datetime-local"
                            value={newDate.startDate}
                            onChange={e => setNewDate({ ...newDate, startDate: e.target.value })}
                            required
                        />
                        <Input
                            label="End Date *"
                            type="datetime-local"
                            value={newDate.endDate}
                            onChange={e => setNewDate({ ...newDate, endDate: e.target.value })}
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" loading={creating}>
                            Create Blackout Date
                        </Button>
                    </div>
                </form>
            </div>

            {/* Dates List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Active Blackout Dates</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : dates.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">No blackout dates found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold text-sm uppercase">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Period</th>
                                    <th className="px-6 py-4">Reason</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {dates.map(date => (
                                    <tr key={date._id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{date.name}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="flex flex-col text-sm">
                                                <span>From: {new Date(date.startDate).toLocaleString()}</span>
                                                <span>To: {new Date(date.endDate).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{date.reason || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(date._id)}
                                                className="text-red-500 hover:text-red-700 font-medium text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
