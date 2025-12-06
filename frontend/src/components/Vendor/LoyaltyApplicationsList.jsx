import React, { useState, useEffect } from 'react';
import vendorService from '../../services/vendorService';
import adminService from '../../services/adminService';
import { showToast, confirmDialog } from '../../utils/toast';
import {
  createStudentNotification,
  createStaffNotification,
  createTaNotification,
  createProfessorNotification
} from '../../services/notificationService';

const LoyaltyApplicationsList = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await vendorService.listMyLoyaltyApplications();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch loyalty applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (applicationId) => {
    const app = applications.find(a => a._id === applicationId);
    const isApproved = app?.status === 'approved';
    const message = isApproved
      ? 'Are you sure you want to cancel this approved loyalty program? This will remove it from the loyalty program list and notify all users. This action cannot be undone.'
      : 'Are you sure you want to cancel this loyalty application? This action cannot be undone.';
    const title = isApproved ? 'Cancel Loyalty Program' : 'Cancel Application';

    const confirmed = await confirmDialog(message, title);
    if (!confirmed) {
      return;
    }

    try {
      await vendorService.cancelLoyaltyApplication(applicationId);

      // If it was an approved program, create frontend notifications for all users
      if (isApproved && app) {
        const orgName = app.organization || 'A vendor';
        const notification = {
          type: 'LoyaltyPartnerAdded',
          message: `${orgName} has been removed from the GUC loyalty program.`,
          organization: orgName,
          date: new Date().toISOString(),
        };

        try {
          // Create notifications for all user roles
          createStudentNotification(notification);
          createStaffNotification(notification);
          createTaNotification(notification);

          // Create notifications for all professors
          try {
            const professors = await adminService.listAllUsers('Professor');
            const professorList = Array.isArray(professors?.users) ? professors.users : (Array.isArray(professors) ? professors : []);

            professorList.forEach(professor => {
              const professorId = String(professor._id || professor.id);
              if (professorId) {
                createProfessorNotification(professorId, notification);
              }
            });
          } catch (profErr) {
            console.error('Could not create professor cancellation notifications:', profErr);
            // Fall back to localStorage method
            try {
              const allKeys = Object.keys(localStorage);
              const professorKeys = allKeys.filter(key => key.startsWith('professorNotifications_'));
              professorKeys.forEach(key => {
                const professorId = key.replace('professorNotifications_', '');
                if (professorId) {
                  createProfessorNotification(professorId, notification);
                }
              });
            } catch (localStorageErr) {
              console.error('Could not create professor notifications from localStorage:', localStorageErr);
            }
          }

          // Dispatch event to refresh notifications in all dashboards
          window.dispatchEvent(new CustomEvent('loyaltyPartnerAdded', { detail: { notification } }));
        } catch (notifErr) {
          console.error('Error creating cancellation notifications:', notifErr);
        }
      }

      showToast.success(isApproved
        ? 'Loyalty program cancelled successfully. Users have been notified.'
        : 'Loyalty application cancelled successfully');
      fetchApplications();
    } catch (err) {
      showToast.error(err.message || 'Failed to cancel application');
    }
  };

  const handleDelete = async (applicationId) => {
    const confirmed = await confirmDialog('Are you sure you want to permanently delete this cancelled loyalty application? This action cannot be undone.', 'Delete Application');
    if (!confirmed) {
      return;
    }

    try {
      await vendorService.deleteLoyaltyApplication(applicationId);
      showToast.success('Loyalty application deleted successfully');
      fetchApplications();
    } catch (err) {
      showToast.error(err.message || 'Failed to delete application. Only cancelled applications can be deleted.');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 p-20 rounded-2xl text-center shadow-lg border border-slate-700 backdrop-blur-sm">
        <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
        <h3 className="text-xl font-bold text-white mb-2">Loading...</h3>
        <p className="text-slate-400">Please wait while we fetch your loyalty applications.</p>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="bg-slate-900/50 p-20 rounded-2xl text-center shadow-lg border border-slate-700 backdrop-blur-sm">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-white mb-2">Unable to Load Applications</h3>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={fetchApplications}
          className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-slate-900/50 p-20 rounded-2xl text-center shadow-lg border border-slate-700 backdrop-blur-sm">
        <div className="text-6xl mb-6 opacity-50">📭</div>
        <h3 className="text-xl font-bold text-white mb-2">No Loyalty Applications</h3>
        <p className="text-slate-400">You haven't submitted any loyalty program applications yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 p-8 rounded-2xl shadow-lg border border-slate-700 backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span>📋</span> My Loyalty Applications
      </h3>
      <div className="flex flex-col gap-6">
        {applications.map((app) => (
          <div
            key={app._id}
            className="p-6 border border-slate-700 rounded-xl bg-slate-800/40 hover:border-emerald-500/50 transition-all group"
          >
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
              <div className="flex-1">
                <h4 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                  {app.organization}
                </h4>
                <div className="flex gap-3 flex-wrap mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    app.status === 'rejected' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      app.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                    {app.status}
                  </span>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                    <span>🏷️</span> {app.discountRate}% Discount
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold border border-blue-500/30 font-mono">
                    {app.promoCode}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {(app.status === 'pending' || app.status === 'approved') && (
                  <button
                    onClick={() => handleCancel(app._id)}
                    className="px-4 py-2 bg-slate-800 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold hover:bg-red-500/10 hover:border-red-400 transition-colors shadow-sm"
                  >
                    {app.status === 'approved' ? 'Cancel Program' : 'Cancel'}
                  </button>
                )}
                {app.status === 'cancelled' && (
                  <button
                    onClick={() => handleDelete(app._id)}
                    className="px-4 py-2 bg-slate-800 text-slate-400 border border-slate-600 rounded-lg text-sm font-bold hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors shadow-sm"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">
                Terms and Conditions
              </p>
              <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                {app.termsAndConditions}
              </p>
            </div>
            {app.createdAt && (
              <p className="text-slate-500 text-xs mt-4 font-medium flex items-center gap-1">
                <span>🕒</span> Submitted: {new Date(app.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoyaltyApplicationsList;
