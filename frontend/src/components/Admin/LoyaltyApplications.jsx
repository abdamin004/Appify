import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
  createStudentNotification,
  createStaffNotification,
  createTaNotification,
  createProfessorNotification
} from '../../services/notificationService';

export default function LoyaltyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listLoyaltyApplications(filter === 'all' ? null : filter);
      setApps(res.applications || []);
    } catch (err) {
      setError(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleReview = async (id, action) => {
    const notes = window.prompt('Optional notes/reason (press Enter to skip):');
    try {
      // Find the application in the current list to get full details
      const currentApp = apps.find(a => String(a._id) === String(id));

      const result = await adminService.reviewLoyaltyApplication(id, action, notes || '');
      showToast.success(`Application ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);

      // If approved, create frontend notifications for all user roles
      if (action === 'approve') {
        // Use the application from result, or fall back to currentApp, or reload to get fresh data
        let app = result?.application || currentApp;

        // If we still don't have the app, reload the list to get fresh data
        if (!app) {
          try {
            const freshRes = await adminService.listLoyaltyApplications('approved');
            app = freshRes.applications?.find(a => String(a._id) === String(id));
          } catch (reloadErr) {
            console.error('Error reloading application:', reloadErr);
          }
        }

        // If we still don't have app data, use currentApp or form data from the UI
        if (!app && currentApp) {
          app = currentApp;
        }

        if (app) {
          const orgName = app.organization || app.vendorUser?.companyName || 'A vendor';
          const discountRate = app.discountRate;
          const promoCode = app.promoCode;
          const discountInfo = typeof discountRate === 'number'
            ? `${discountRate}%`
            : 'a special';
          const promoInfo = promoCode ? ` Use code ${promoCode}.` : '';

          const notification = {
            type: 'LoyaltyPartnerAdded',
            message: `${orgName} has joined the GUC loyalty program offering ${discountInfo} off.${promoInfo}`,
            organization: orgName,
            discountRate: discountRate,
            promoCode: promoCode,
            date: new Date().toISOString(),
          };

          // Create notifications for all user roles
          try {
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
              console.error('Could not create professor loyalty notifications:', profErr);
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
            console.error('Error creating loyalty notifications:', notifErr);
            showToast.error('Notifications created but some may have failed');
          }
        } else {
          showToast.warning('Application approved but notifications may not have been created');
        }
      }

      load();
    } catch (err) {
      console.error('Error reviewing loyalty application:', err);
      showToast.error(err.message || 'Failed to review application');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Loyalty Program Applications</h2>
          <p className="text-slate-500 mt-2">Manage loyalty partner requests</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {['pending', 'approved', 'rejected', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm capitalize transition-all ${filter === f
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-emerald-600 mb-4"></span>
            <p className="text-lg font-medium text-slate-600">Loading applications...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error shadow-sm mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && apps.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Applications Found</h3>
            <p className="text-slate-500">No {filter === 'all' ? '' : filter} loyalty applications found.</p>
          </div>
        )}

        {!loading && !error && apps.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {apps.map((app) => (
              <div
                key={app._id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold text-slate-900">
                        {app.vendorUser?.companyName || app.organization || 'Vendor'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${app.status === 'approved' ? 'bg-green-100 text-green-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                        }`}>
                        {app.status || 'PENDING'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                      <div>
                        <p><span className="font-semibold">Organization:</span> {app.organization}</p>
                        <p className="mt-1"><span className="font-semibold">Vendor Email:</span> {app.vendorUser?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p>
                          <span className="font-semibold">Discount Rate:</span>{' '}
                          <span className="text-emerald-600 font-bold text-lg">{app.discountRate}%</span>
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold">Promo Code:</span>{' '}
                          <code className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-800">
                            {app.promoCode}
                          </code>
                        </p>
                      </div>
                    </div>

                    {app.termsAndConditions && (
                      <details className="group">
                        <summary className="cursor-pointer text-emerald-600 font-semibold hover:text-emerald-700 transition-colors list-none flex items-center gap-2">
                          <span className="group-open:rotate-90 transition-transform">▶</span> Terms & Conditions
                        </summary>
                        <div className="mt-2 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 whitespace-pre-wrap border border-slate-100">
                          {app.termsAndConditions}
                        </div>
                      </details>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
                      {app.createdAt && (
                        <span>Applied: {new Date(app.createdAt).toLocaleString()}</span>
                      )}
                      {app.reviewedAt && (
                        <span>Reviewed: {new Date(app.reviewedAt).toLocaleString()}</span>
                      )}
                    </div>

                    {app.notes && (
                      <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-800">
                        <span className="font-bold">Review Notes:</span> {app.notes}
                      </div>
                    )}
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex flex-row md:flex-col gap-3 self-start md:self-center min-w-[120px]">
                      <button
                        onClick={() => handleReview(app._id, 'approve')}
                        className="btn btn-success btn-sm text-white w-full"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReview(app._id, 'reject')}
                        className="btn btn-error btn-sm text-white w-full"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

