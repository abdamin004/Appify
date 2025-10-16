import React, { useState } from 'react';
import adminService from '../../services/adminService';

export default function CommentModeration() {
  const [commentId, setCommentId] = useState('');
  const [message, setMessage] = useState(null);

  const handleDelete = async () => {
    if (!commentId) return setMessage({ type: 'error', text: 'Enter comment id' });
    if (!window.confirm('Delete comment ' + commentId + '?')) return;
    try {
      await adminService.deleteComment(commentId);
      setMessage({ type: 'success', text: 'Deleted' });
      setCommentId('');
    } catch (err) { setMessage({ type: 'error', text: err.message || JSON.stringify(err) }); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#003366' }}>Comment Moderation</h2>
      {message && <div style={{ color: message.type==='error' ? '#dc2626' : '#065f46' }}>{message.text}</div>}
      <div style={{ marginTop: 12 }}>
        <input placeholder="Comment ID" value={commentId} onChange={e=>setCommentId(e.target.value)} style={{ padding: 8 }} />
        <button onClick={handleDelete} style={{ marginLeft: 8 }}>Delete</button>
      </div>
      <p style={{ marginTop: 12, color: '#6b7280' }}>Note: no list endpoint provided for comments; enter comment id to delete.</p>
    </div>
  );
}
