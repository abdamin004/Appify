import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';

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
      setError(err.message || JSON.stringify(err));
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete comment ' + id + '?')) return;
    try {
      await adminService.deleteComment(id);
      // refresh
      load();
    } catch (err) {
      setError(err.message || JSON.stringify(err));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#003366' }}>Comment Moderation</h2>
      {loading && <div>Loading comments...</div>}
      {error && <div style={{ color: '#dc2626' }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        {comments.length === 0 && !loading && <div style={{ color: '#6b7280' }}>No comments found.</div>}
        {comments.map(c => (
          <div key={c._id} style={{ border: '1px solid #e5e7eb', padding: 12, marginBottom: 8, borderRadius: 6 }}>
            <div style={{ fontSize: 14, color: '#374151' }}><strong>{c.user ? `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim() : 'Unknown user'}</strong> on <em style={{ color: '#6b7280' }}>{c.event ? c.event.title : 'Unknown event'}</em></div>
            <div style={{ marginTop: 8, color: '#111827' }}>{c.content}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={()=>handleDelete(c._id)} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4 }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
