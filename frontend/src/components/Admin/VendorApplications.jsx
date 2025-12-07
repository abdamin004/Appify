import React, { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { showToast } from '../../utils/toast';

export default function VendorApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminService.listPendingVendorApplications();
      setApps(res.applications || []);
    } catch (err) {
      const errorMsg = err?.message || 'Failed to load vendor applications';
      setError(errorMsg);
      showToast.error(errorMsg);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleReview = async (id, action) => {
    const notes = window.prompt('Optional notes (enter to skip)');
    try {
      await adminService.reviewVendorApplication(id, action, notes);
      showToast.success(`Vendor application ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      load();
    } catch (err) {
      const errorMsg = err?.message || 'Failed to review application';
      showToast.error(errorMsg);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Pending Vendor Applications</h2>
          <p className="text-slate-500 mt-2">Review and manage vendor requests</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-emerald-600 mb-4"></span>
            <p className="text-lg font-medium text-slate-500">Loading applications...</p>
          </div>
        )}

        {error && !loading && (
          <div className="alert alert-error bg-red-50 border-red-100 text-red-600 shadow-sm mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && apps.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Pending Applications</h3>
            <p className="text-slate-500">There are no pending vendor applications at this time.</p>
          </div>
        )}

        {!loading && apps.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {apps.map(a => (
              <div key={a._id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                      {a.event?.title} <span className="text-sm font-normal text-emerald-600">({a.event?.type})</span>
                    </h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-700">Organization:</span> {a.organization?.name || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Vendor Email:</span> {a.vendorUser?.email || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-center">
                    <button
                      onClick={() => handleReview(a._id, 'approve')}
                      className="btn bg-emerald-600 hover:bg-emerald-700 text-white border-none btn-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(a._id, 'reject')}
                      className="btn bg-red-600 hover:bg-red-700 text-white border-none btn-sm"
                    >
                      Reject
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
