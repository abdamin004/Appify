import React, { useEffect, useState } from 'react';
import { getEventAnalytics } from '../../services/eventService';

export default function EventAnalytics({ eventId, isOpen, onClose }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && eventId) {
            loadAnalytics();
        }
    }, [isOpen, eventId]);

    // Listen for refresh events
    useEffect(() => {
        const handleRatingAdded = (e) => {
            // Check if the event matches
            if (e.detail && String(e.detail.eventId) === String(eventId) && isOpen) {
                console.log('EventAnalytics: Received rating:added event, reloading...');
                loadAnalytics();
            }
        };

        const handleCommentAdded = (e) => {
            if (e.detail && String(e.detail.eventId) === String(eventId) && isOpen) {
                console.log('EventAnalytics: Received comment:added event, reloading...');
                loadAnalytics();
            }
        };

        window.addEventListener('rating:added', handleRatingAdded);
        window.addEventListener('comment:added', handleCommentAdded);
        return () => {
            window.removeEventListener('rating:added', handleRatingAdded);
            window.removeEventListener('comment:added', handleCommentAdded);
        };
    }, [eventId, isOpen]);

    const loadAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getEventAnalytics(eventId);
            setData(res);
        } catch (err) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-4xl bg-white text-slate-800 p-0 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-100 p-6 flex justify-between items-center border-b border-slate-200">
                    <h3 className="font-bold text-2xl text-slate-700">Event Feedback Analytics</h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-slate-500 hover:bg-slate-200">✕</button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[70vh]">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    ) : error ? (
                        <div className="alert alert-error">
                            <span>{error}</span>
                        </div>
                    ) : !data || data.total === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <div className="text-6xl mb-4">📊</div>
                            <p className="text-lg">No feedback collected yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <StatCard label="Total Responses" value={data.total} icon="📝" />
                                <StatCard label="Overall Score" value={data.averages.overall} max={5} color="text-yellow-500" />
                                <StatCard label="Recommendation" value={Math.round(data.averages.overall * 20) + '%'} icon="👍" />
                            </div>

                            {/* Detailed Metrics */}
                            <div>
                                <h4 className="text-xl font-bold mb-4 text-slate-700">Category Breakdown</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    <ProgressBar label="Overall Satisfaction" value={data.averages.overall} color="progress-warning" />
                                    <ProgressBar label="Content Quality" value={data.averages.content} color="progress-info" />
                                    <ProgressBar label="Speaker / Instructor" value={data.averages.speaker} color="progress-success" />
                                    <ProgressBar label="Organization & Venue" value={data.averages.organization} color="progress-primary" />
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div>
                                <h4 className="text-xl font-bold mb-4 text-slate-700">Comments ({data.comments.length})</h4>
                                <div className="space-y-4">
                                    {data.comments.map((comment, idx) => (
                                        <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="font-semibold text-slate-900">{comment.user}</div>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(comment.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="rating rating-xs disabled">
                                                    {[1, 2, 3, 4, 5].map(v => (
                                                        <input key={v} type="radio" className="mask mask-star-2 bg-orange-400" checked={Math.round(comment.rating) === v} readOnly />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-slate-600 text-sm">{comment.text}</p>
                                        </div>
                                    ))}
                                    {data.comments.length === 0 && (
                                        <p className="text-slate-400 italic">No text comments provided.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={onClose}>
                <button>close</button>
            </form>
        </div>
    );
}

function StatCard({ label, value, max, icon, color }) {
    return (
        <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
            <div className="text-sm text-slate-500 mb-1">{label}</div>
            <div className={`text-3xl font-bold ${color || 'text-slate-800'}`}>
                {value}
                {max && <span className="text-lg text-slate-400 font-normal">/{max}</span>}
            </div>
            {icon && <div className="text-2xl mt-2">{icon}</div>}
        </div>
    );
}

function ProgressBar({ label, value, color }) {
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <span className="text-sm font-bold text-slate-900">{value} / 5.0</span>
            </div>
            <progress className={`progress ${color} w-full h-3`} value={value} max="5"></progress>
        </div>
    );
}
