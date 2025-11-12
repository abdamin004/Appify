import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { getEventById, getEventComments, getEventRatings, addEventComment, deleteEventComment } from '../services/eventService';
import { getAttendedIds, toggleAttended } from '../services/attendanceService';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [comments, setComments] = useState([]);
  const [ratings, setRatings] = useState({ average: 0, count: 0, ratings: [], histogram: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attended, setAttended] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [e, cs, rs] = await Promise.all([
          getEventById(id),
          getEventComments(id),
          getEventRatings(id)
        ]);
        setEvent(e);
        setComments(Array.isArray(cs) ? cs : []);
        setRatings(rs && typeof rs === 'object' ? rs : { average: 0, count: 0, ratings: [], histogram: {} });
      } catch (err) {
        setError(err?.message || 'Failed to load event');
      } finally { setLoading(false); }
    }
    load();
    try {
      const ids = getAttendedIds().map(String);
      if (ids.includes(String(id))) setAttended(true);
    } catch(_) {}
  }, [id]);

  const tokenPresent = (() => {
    try { return !!(typeof localStorage !== 'undefined' && localStorage.getItem('token')); } catch { return false; }
  })();

  const currentUserId = (() => {
    try { const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null; const u = raw ? JSON.parse(raw) : null; return u && (u._id || u.id) ? String(u._id || u.id) : null; } catch { return null; }
  })();

  const isRegistered = !!(event && Array.isArray(event.registeredUsers) && currentUserId && event.registeredUsers.map(String).includes(String(currentUserId)));

  function toggleAttendedHere() {
    setAttended(prev => {
      const next = !prev;
      toggleAttended(id);
      return next;
    });
  }

  async function submitComment(e) {
    e && e.preventDefault && e.preventDefault();
    setError('');
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await addEventComment(id, newComment.trim());
      setNewComment('');
      const cs = await getEventComments(id);
      setComments(Array.isArray(cs) ? cs : []);
    } catch (err) {
      setError(err?.message || 'Failed to add comment');
    } finally { setSubmitting(false); }
  }

  async function handleDeleteComment(cid) {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteEventComment(cid);
      setComments(prev => prev.filter(c => c._id !== cid));
    } catch (err) {
      alert(err?.message || 'Failed to delete comment');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)' }}>
      <Navbar />
      <div style={{ paddingTop: 120, padding: '120px 24px 60px', maxWidth: 1000, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 16, background: 'transparent', color: '#d4af37', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{'< Back'}</button>
        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.25)', padding: 20 }}>
          {loading && <div style={{ color: '#6b7280' }}>Loading…</div>}
          {error && <div style={{ color: '#dc2626' }}>{error}</div>}
          {!loading && !error && event && (
            <>
              <h1 style={{ margin: 0, color: '#003366' }}>{event.title}</h1>
              <div style={{ color: '#6b7280', marginBottom: 8 }}>{event.type} • {event.location}</div>
              <div style={{ color: '#6b7280', marginBottom: 16 }}>
                {event.startDate ? new Date(event.startDate).toLocaleString() : ''}
                {event.endDate ? ` – ${new Date(event.endDate).toLocaleString()}` : ''}
              </div>
              {event.shortDescription && (
                <p style={{ color: '#374151' }}>{event.shortDescription}</p>
              )}

              {/* Ratings summary */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: '0 0 8px', color: '#003366' }}>Ratings</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#d4af37' }}>{ratings.average?.toFixed(1) || '0.0'}</div>
                  <div style={{ color: '#6b7280' }}>{ratings.count || 0} ratings</div>
                </div>
                {/* Optional histogram */}
                {ratings.histogram && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, color: '#6b7280' }}>
                    {[5,4,3,2,1].map(v => (
                      <div key={v}>{v}★: {ratings.histogram[v] || 0}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: '0 0 8px', color: '#003366' }}>Comments</h2>
                {/* Read-only on details page: no attendance toggle or posting form */}
                {comments.length === 0 ? (
                  <div style={{ color: '#6b7280' }}>No comments yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {comments.map(c => (
                      <div key={c._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 700, color: '#003366' }}>
                          {(c.user && (c.user.firstName || c.user.lastName)) ? `${c.user.firstName||''} ${c.user.lastName||''}`.trim() : (c.user?.email || 'User')}
                          <span style={{ marginLeft: 8, color: '#9ca3af', fontWeight: 400, fontSize: 12 }}>{new Date(c.createdAt).toLocaleString()}</span>

                        </div>
                        <div style={{ color: '#374151' }}>{c.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
