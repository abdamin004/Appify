import React, { useState } from 'react';
import vendorService from '../../services/vendorService';
import adminService from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
  createStudentNotification,
  createStaffNotification,
  createTaNotification,
  createProfessorNotification
} from '../../services/notificationService';

const LoyaltyProgramForm = ({ onSuccess, onCancel }) => {
  // Get logged-in vendor info to auto-fill organization
  const getVendorInfo = () => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return null;
      const vendor = JSON.parse(raw);
      return {
        companyName: vendor.companyName || vendor.companyname || vendor.company || ''
      };
    } catch {
      return null;
    }
  };

  const vendorInfo = getVendorInfo();

  const [formData, setFormData] = useState({
    organization: vendorInfo?.companyName || '',
    discountRate: '',
    promoCode: '',
    termsAndConditions: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate discount rate
      const discountRate = parseFloat(formData.discountRate);
      if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
        showToast.error('Discount rate must be between 0 and 100');
        setError('Discount rate must be between 0 and 100');
        return;
      }

      const payload = {
        organization: formData.organization,
        discountRate: discountRate,
        promoCode: formData.promoCode.trim(),
        termsAndConditions: formData.termsAndConditions.trim()
      };

      const result = await vendorService.applyToLoyaltyProgram(payload);

      // Check if application was instantly approved (status: 'approved' in response)
      const app = result?.application || result;
      const isInstantlyApproved = app?.status === 'approved' || result?.message?.includes('live and visible');

      if (isInstantlyApproved) {
        // Application was instantly approved - create frontend notifications
        const orgName = app?.organization || formData.organization || 'A vendor';
        const discountInfo = typeof app?.discountRate === 'number'
          ? `${app.discountRate}%`
          : typeof formData.discountRate === 'number'
            ? `${formData.discountRate}%`
            : 'a special';
        const promoInfo = (app?.promoCode || formData.promoCode) ? ` Use code ${app?.promoCode || formData.promoCode}.` : '';

        const notification = {
          type: 'LoyaltyPartnerAdded',
          message: `${orgName} has joined the GUC loyalty program offering ${discountInfo} off.${promoInfo}`,
          organization: orgName,
          discountRate: app?.discountRate || formData.discountRate,
          promoCode: app?.promoCode || formData.promoCode,
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

          showToast.success('Loyalty program application approved instantly! Notifications sent to all users.');
        } catch (notifErr) {
          console.error('Error creating loyalty notifications:', notifErr);
          showToast.success('Loyalty program application approved instantly!');
        }
      } else {
        showToast.success('Loyalty program application submitted successfully!');
      }

      if (onSuccess) {
        onSuccess();
      }

      // Reset form (but keep organization if vendor info exists)
      setFormData({
        organization: vendorInfo?.companyName || '',
        discountRate: '',
        promoCode: '',
        termsAndConditions: ''
      });
      setError('');
    } catch (err) {
      const errorMsg = err.message || err.error || 'Failed to submit loyalty program application';
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="bg-slate-900/50 p-8 rounded-2xl shadow-lg max-w-2xl mx-auto border border-slate-700 backdrop-blur-sm">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Apply to GUC Loyalty Program
        </h2>
        <p className="text-slate-400">
          Join our loyalty program to offer exclusive discounts to the GUC community.
        </p>
      </div>

      {vendorInfo?.companyName && (
        <div className="p-4 bg-emerald-900/20 rounded-xl mb-8 text-sm text-emerald-300 border border-emerald-500/30 flex items-center gap-3">
          <span className="text-xl">✓</span>
          <strong>Organization name auto-filled with your account info</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 text-slate-300 font-bold text-sm uppercase tracking-wide">
            Organization Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
            className="input input-bordered w-full bg-slate-800/50 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
            placeholder="Enter organization name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 text-slate-300 font-bold text-sm uppercase tracking-wide">
              Discount Rate (%) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="discountRate"
                value={formData.discountRate}
                onChange={handleChange}
                required
                min="0"
                max="100"
                step="0.1"
                className="input input-bordered w-full bg-slate-800/50 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all pr-8"
                placeholder="e.g., 15"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
            </div>
            <small className="text-slate-500 text-xs mt-1 block">
              Enter a percentage between 0 and 100
            </small>
          </div>

          <div>
            <label className="block mb-2 text-slate-300 font-bold text-sm uppercase tracking-wide">
              Promo Code <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="promoCode"
              value={formData.promoCode}
              onChange={handleChange}
              required
              className="input input-bordered w-full bg-slate-800/50 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
              placeholder="e.g., GUC2024"
            />
          </div>
        </div>

        <div>
          <label className="block mb-2 text-slate-300 font-bold text-sm uppercase tracking-wide">
            Terms and Conditions <span className="text-red-400">*</span>
          </label>
          <textarea
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onChange={handleChange}
            required
            rows="5"
            className="textarea textarea-bordered w-full bg-slate-800/50 border-slate-600 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all text-base"
            placeholder="Enter the terms and conditions for your loyalty program offer..."
          />
        </div>

        <div className="flex gap-4 justify-end pt-4 border-t border-slate-700 mt-8">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="loading loading-spinner loading-sm"></span>
                Submitting...
              </span>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoyaltyProgramForm;
