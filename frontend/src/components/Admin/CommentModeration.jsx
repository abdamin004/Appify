import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';

export default function CommentModeration() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listAllComments();
      setComments(res.comments || res);
    } catch (err) {
      const errorMsg = err?.message || 'Failed to load comments';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog('Are you sure you want to delete this comment?', 'Delete Comment');
    if (!confirmed) return;
    try {
      await adminService.deleteComment(id);
      showToast.success('Comment deleted successfully');
      load();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to delete comment';
      setError(errorMsg);
      showToast.error(errorMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Comment Moderation</h2>
          <p className="text-slate-500 mt-2">Manage user comments and feedback</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-emerald-600 mb-4"></span>
            <p className="text-lg font-medium text-slate-600">Loading comments...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error shadow-sm mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && comments.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Comments</h3>
            <p className="text-slate-500">There are no comments to moderate at this time.</p>
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div className="space-y-4">
            {comments.map(c => (
              <div
                key={c._id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <span className="font-bold text-slate-800">
                        {c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Unknown user'}
                      </span>
                      <span>on</span>
                      <span className="font-medium text-emerald-600">
                        {c.event ? c.event.title : 'Unknown event'}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {c.content}
                    </p>
                  </div>

                  <div className="self-start md:self-center">
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="btn btn-error btn-sm text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
