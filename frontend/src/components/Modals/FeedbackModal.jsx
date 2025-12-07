import React, { useState } from 'react';
import { rateEvent } from '../../services/eventService';

export default function FeedbackModal({ eventId, isOpen, onClose, onSuccess, existingRating }) {
    const [ratings, setRatings] = useState({
        overall: existingRating?.overall || existingRating?.rating || 5, // Default 5
        content: existingRating?.content || 5,
        speaker: existingRating?.speaker || 5,
        organization: existingRating?.organization || 5
    });
    const [comment, setComment] = useState(existingRating?.comment || '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSliderChange = (category, value) => {
        setRatings(prev => ({ ...prev, [category]: parseInt(value) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await rateEvent(eventId, { ratings, comment });
            onSuccess && onSuccess(ratings.overall);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal modal-open">
            <div className="modal-box bg-white text-slate-800">
                <h3 className="font-bold text-lg mb-4">Give Feedback</h3>

                {error && <div className="alert alert-error mb-4"><span>{error}</span></div>}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {['Overall', 'Content', 'Speaker', 'Organization'].map((cat) => {
                        const key = cat.toLowerCase();
                        const val = ratings[key];
                        return (
                            <div key={cat}>
                                <div className="flex justify-between mb-1">
                                    <label className="text-sm font-semibold text-slate-700">{cat}</label>
                                    <span className="text-sm font-bold text-amber-500">{val} Stars</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={val}
                                    onChange={(e) => handleSliderChange(key, e.target.value)}
                                    className="range range-warning range-sm"
                                    step="1"
                                />
                                <div className="w-full flex justify-between text-xs px-2 text-slate-400">
                                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                </div>
                            </div>
                        );
                    })}

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text text-slate-700 font-semibold">Comment (Optional)</span>
                        </label>
                        <textarea
                            className="textarea textarea-bordered h-24 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="Share your thoughts..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="modal-action">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className={`btn btn-warning text-white ${submitting ? 'loading' : ''}`}>
                            Submit Feedback
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" className="modal-backdrop" onClick={onClose}>
                <button>close</button>
            </form>
        </div>
    );
}
