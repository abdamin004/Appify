import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { showToast } from '../utils/toast';
import { applyToEvent, listMyApplications } from '../services/vendorService';

export function useVendorRequest(event) {
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [vendorForm, setVendorForm] = useState({
        boothSize: '2x2',
        notes: '',
        setupLocation: '',
        setupDurationWeeks: 1,
        attendees: []
    });
    const [vendorSubmitting, setVendorSubmitting] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null); // 'pending', 'approved', 'rejected'
    const [applicationId, setApplicationId] = useState(null);
    const [isPaid, setIsPaid] = useState(false);

    // Role & Type Check
    const isVendor = (() => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user && user.role && (user.role.toLowerCase() === 'vendor');
        } catch { return false; }
    })();

    const canRequest = isVendor && event && event.type && ['bazaar', 'booth'].includes(event.type.toLowerCase()) && !requestStatus;

    // Check for existing application
    React.useEffect(() => {
        if (isVendor && event && (event._id || event.id)) {
            listMyApplications().then(res => {
                const apps = res.applications || res.data || [];
                if (res.success && Array.isArray(apps)) {
                    const evtId = String(event._id || event.id);
                    const app = apps.find(a => {
                        const aEvtId = a.event ? String(a.event._id || a.event.id || a.event) : '';
                        return aEvtId === evtId;
                    });
                    if (app) {
                        setRequestStatus(app.status);
                        setApplicationId(app._id || app.id);
                        setIsPaid(!!app.paid);
                    }
                }
            }).catch(() => { });
        }
    }, [isVendor, event]);

    // Pre-fill initial attendee if empty
    React.useEffect(() => {
        if (showVendorModal && vendorForm.attendees.length === 0) {
            try {
                const user = JSON.parse(localStorage.getItem('user'));
                const userName = (user.firstName && user.lastName)
                    ? `${user.firstName} ${user.lastName}`
                    : (user.companyName || 'Vendor');

                setVendorForm(prev => ({
                    ...prev,
                    attendees: [{
                        name: userName,
                        email: user.email,
                        idNumber: ''
                    }]
                }));
            } catch (err) { /* ignore */ }
        }
    }, [showVendorModal]);

    const handleAttendeeChange = (index, field, value) => {
        const updated = [...vendorForm.attendees];
        updated[index] = { ...updated[index], [field]: value };
        setVendorForm(prev => ({ ...prev, attendees: updated }));
    };

    const addAttendee = () => {
        if (vendorForm.attendees.length >= 5) {
            showToast.error("Maximum 5 attendees allowed");
            return;
        }
        setVendorForm(prev => ({
            ...prev,
            attendees: [...prev.attendees, { name: '', email: '', idNumber: '' }]
        }));
    };

    const removeAttendee = (index) => {
        if (vendorForm.attendees.length <= 1) {
            showToast.error("At least one attendee is required");
            return;
        }
        setVendorForm(prev => ({
            ...prev,
            attendees: prev.attendees.filter((_, i) => i !== index)
        }));
    };

    const handleVendorSubmit = async () => {
        setVendorSubmitting(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const payload = {
                organization: user.companyName || user.company || user.firstName + ' ' + user.lastName,
                attendees: vendorForm.attendees,
                notes: vendorForm.notes,
                boothSize: vendorForm.boothSize, // Send for both
                ...(event.type === 'Booth' ? {
                    setupDurationWeeks: Number(vendorForm.setupDurationWeeks),
                    setupLocation: vendorForm.setupLocation || 'General Area'
                } : {})
            };

            await applyToEvent(event._id || event.id, payload);
            showToast.success('Request submitted successfully!');
            setShowVendorModal(false);
        } catch (err) {
            showToast.error(err.message || 'Failed to submit request');
        } finally {
            setVendorSubmitting(false);
        }
    };

    // Render the modal via Portal
    const RequestModal = showVendorModal ? ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Request to Join {event.type}</h2>
                        <p className="text-slate-500 text-sm mt-1">{event.title}</p>
                    </div>
                    <button
                        onClick={() => setShowVendorModal(false)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Auto-filled Info */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase">Event</label>
                            <div className="font-medium text-slate-900">{event.title}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase">Vendor</label>
                            <div className="font-medium text-slate-900">
                                {(() => {
                                    try {
                                        const u = JSON.parse(localStorage.getItem('user'));
                                        return u.companyName || u.firstName || 'My Company';
                                    } catch { return 'My Company'; }
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Booth Size */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Booth Size Selection</label>
                        <div className="grid grid-cols-2 gap-4">
                            {['2x2', '4x4'].map(size => (
                                <button
                                    key={size}
                                    onClick={() => setVendorForm(prev => ({ ...prev, boothSize: size }))}
                                    className={`p-3 rounded-xl border-2 transition-all ${vendorForm.boothSize === size
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                        }`}
                                >
                                    {size} meters
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conditional Fields for Booth Events */}
                    {event.type === 'Booth' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Duration (Weeks)</label>
                                <select
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                                    value={vendorForm.setupDurationWeeks}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, setupDurationWeeks: Number(e.target.value) }))}
                                >
                                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Week{n > 1 ? 's' : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Location</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Near entrance"
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                                    value={vendorForm.setupLocation}
                                    onChange={(e) => setVendorForm(prev => ({ ...prev, setupLocation: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    {/* Attendees Section */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-bold text-slate-700">Attendees / Staff</label>
                            <span className="text-xs text-slate-400">Max 5 people</span>
                        </div>
                        <div className="space-y-3">
                            {vendorForm.attendees.map((att, index) => (
                                <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 border border-slate-100 rounded-xl relative group">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 text-slate-900"
                                            value={att.name}
                                            onChange={(e) => handleAttendeeChange(index, 'name', e.target.value)}
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 text-slate-900"
                                            value={att.email}
                                            onChange={(e) => handleAttendeeChange(index, 'email', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="National ID / ID"
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 text-slate-900"
                                            value={att.idNumber}
                                            onChange={(e) => handleAttendeeChange(index, 'idNumber', e.target.value)}
                                        />
                                    </div>
                                    {vendorForm.attendees.length > 1 && (
                                        <button
                                            onClick={() => removeAttendee(index)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Attendee"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {vendorForm.attendees.length < 5 && (
                            <button
                                onClick={addAttendee}
                                className="mt-3 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg transition-all flex items-center gap-1"
                            >
                                + Add Another Attendee
                            </button>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Additional Notes</label>
                        <textarea
                            rows="3"
                            placeholder="Any special requirements or questions..."
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-slate-900"
                            value={vendorForm.notes}
                            onChange={(e) => setVendorForm(prev => ({ ...prev, notes: e.target.value }))}
                        ></textarea>
                    </div>

                    {/* Apply Button */}
                    <button
                        onClick={handleVendorSubmit}
                        disabled={vendorSubmitting}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {vendorSubmitting ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Submitting...
                            </>
                        ) : 'Submit Application'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return {
        canRequest,
        requestStatus, // Expose status
        paymentStatus: requestStatus === 'approved' && !isPaid ? 'unpaid' : (isPaid ? 'paid' : null),
        applicationId,
        isPaid,
        openRequestModal: () => setShowVendorModal(true),
        RequestModal
    };
}
