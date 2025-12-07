import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listAdminNotifications();
      // Handle different response formats
      const notifications = Array.isArray(res) ? res : (res?.notifications || []);
      setNotifs(notifications);
      // Clear any previous errors if we got a valid response
      setError(null);
    } catch (err) {
      // If backend route doesn't exist (404) or not implemented, show empty state gracefully
      const status = err?.status || (err?.response?.status);
      const errorMsg = err?.message || err?.error || 'Failed to load notifications';

      if (status === 404 || errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('No notifications')) {
        // Backend route not implemented yet - show empty state instead of error
        setError(null);
        setNotifs([]);
      } else {
        // Real error - show it
        setError(errorMsg);
        showToast.error(errorMsg);
      }
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await adminService.markNotificationRead(id);
      load();
      showToast.success('Notification marked as read');
    } catch (err) {
      showToast.error(err.message || 'Failed to mark notification as read');
    }
  };

  const markAll = async () => {
    const confirmed = await confirmDialog('Mark ALL notifications as read?', 'Confirm');
    if (!confirmed) return;
    try {
      await adminService.markAllNotificationsRead();
      load();
      showToast.success('All notifications marked as read');
    } catch (err) {
      showToast.error(err.message || 'Failed to mark all notifications as read');
    }
  };

  const deleteAll = async () => {
    const confirmed = await confirmDialog('Delete ALL notifications? This cannot be undone.', 'Confirm Delete All');
    if (!confirmed) return;
    try {
      await adminService.deleteAllNotifications();
      load();
      showToast.success('All notifications deleted');
    } catch (err) {
      showToast.error(err.message || 'Failed to delete all notifications');
    }
  };

  const deleteNotif = async (id) => {
    const confirmed = await confirmDialog('Delete this notification?', 'Confirm');
    if (!confirmed) return;
    try {
      await adminService.deleteNotification(id);
      load();
      showToast.success('Notification deleted');
    } catch (err) {
      showToast.error(err.message || 'Failed to delete notification');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col items-center mb-8 gap-4 text-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Admin Notifications</h2>
            <p className="text-slate-500 mt-1">Stay updated with system alerts</p>
          </div>
          {notifs.length > 0 && (
            <div className="w-full flex justify-end gap-3 mt-4 border-t border-slate-100 pt-4">
              <button
                onClick={markAll}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none btn-sm"
              >
                Mark all as read
              </button>
              <button
                onClick={deleteAll}
                className="btn bg-red-50 hover:bg-red-100 text-red-600 border-none btn-sm"
              >
                Delete All
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-emerald-600 mb-4"></span>
            <p className="text-lg font-medium text-slate-500">Loading notifications...</p>
          </div>
        )}

        {error && !loading && (
          <div className="alert alert-error bg-red-50 border-red-100 text-red-600 shadow-sm mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && notifs.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Notifications</h3>
            <p className="text-slate-500">You don't have any notifications at this time.</p>
          </div>
        )}

        {!loading && notifs.length > 0 && (
          <div className="space-y-4">
            {notifs.map(n => (
              <div
                key={n._id}
                className={`p-5 rounded-xl border transition-all ${n.isRead
                  ? 'bg-white border-slate-200'
                  : 'bg-emerald-50 border-emerald-200 shadow-sm'
                  }`}
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span>}
                      <h4 className={`font-bold ${n.isRead ? 'text-slate-600' : 'text-slate-900'}`}>
                        {n.type}
                      </h4>
                    </div>
                    <p className={`text-sm ${n.isRead ? 'text-slate-500' : 'text-slate-700'} leading-relaxed`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n._id)}
                        className="btn btn-ghost btn-xs text-emerald-600 hover:bg-emerald-100"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotif(n._id)}
                      className="btn btn-ghost btn-xs text-red-500 hover:bg-red-50"
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
