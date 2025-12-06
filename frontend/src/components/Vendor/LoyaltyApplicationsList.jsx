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
// import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles } from '../../utils/designSystem';

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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="loading loading-spinner loading-lg text-emerald-500 mb-4"></span>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Loading...</h3>
        <p className="text-slate-500">Please wait while we fetch your loyalty applications.</p>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Applications</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button
          onClick={fetchApplications}
          className="px-6 py-2.5 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900 font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-6 opacity-50">📭</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Loyalty Applications</h3>
        <p className="text-slate-500">You haven't submitted any loyalty program applications yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {applications.map((app) => {
        const isApproved = app.status === 'approved';
        const isPending = app.status === 'pending';
        const isCancelled = app.status === 'cancelled';

        return (
          <div
            key={app._id}
            className="p-6 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <h4 className="text-xl font-bold text-slate-900 mb-3">
                  {app.organization}
                </h4>
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isApproved ? 'bg-emerald-100 text-emerald-700' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      isPending ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                    }`}>
                    {app.status}
                  </span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
                    {app.discountRate}% Discount
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                    Code: {app.promoCode}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {(isPending || isApproved) && (
                  <button
                    onClick={() => handleCancel(app._id)}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                  >
                    {isApproved ? 'Cancel Program' : 'Cancel'}
                  </button>
                )}
                {isCancelled && (
                  <button
                    onClick={() => handleDelete(app._id)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200/60 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Terms and Conditions
              </p>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {app.termsAndConditions}
              </p>
            </div>

            {app.createdAt && (
              <p className="text-xs text-slate-400">
                Submitted: {new Date(app.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LoyaltyApplicationsList;
