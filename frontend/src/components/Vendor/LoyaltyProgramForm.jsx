import React, { useState, useEffect } from 'react';
import vendorService from '../../services/vendorService';
import adminService from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
  createStudentNotification,
  createStaffNotification,
  createTaNotification,
  createProfessorNotification
} from '../../services/notificationService';
import { colors, spacing, borderRadius, shadows, typography, transitions, buttonStyles, inputStyles } from '../../utils/designSystem';

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
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Apply to GUC Loyalty Program
        </h2>
        <p className="text-slate-500">
          Fill out the form below to apply for the GUC loyalty program. Your application will be reviewed by administrators.
        </p>
      </div>

      {vendorInfo?.companyName && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6 text-sm text-emerald-700 flex items-center gap-2">
          <span>✓</span>
          <strong>Organization name auto-filled with your account info</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block mb-2 text-slate-700 font-bold">
            Organization Name *
          </label>
          <input
            type="text"
            name="organization"
            value={formData.organization}
            onChange={handleChange}
            required
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            placeholder="Enter organization name"
          />
        </div>

        <div>
          <label className="block mb-2 text-slate-700 font-bold">
            Discount Rate (%) *
          </label>
          <input
            type="number"
            name="discountRate"
            value={formData.discountRate}
            onChange={handleChange}
            required
            min="0"
            max="100"
            step="0.1"
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            placeholder="e.g., 10, 15, 20"
          />
          <small className="block mt-1 text-slate-500 text-sm">
            Enter a percentage between 0 and 100
          </small>
        </div>

        <div>
          <label className="block mb-2 text-slate-700 font-bold">
            Promo Code *
          </label>
          <input
            type="text"
            name="promoCode"
            value={formData.promoCode}
            onChange={handleChange}
            required
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
            placeholder="e.g., GUC2024, STUDENT10"
          />
        </div>

        <div>
          <label className="block mb-2 text-slate-700 font-bold">
            Terms and Conditions *
          </label>
          <textarea
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onChange={handleChange}
            required
            rows="6"
            className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-y font-sans"
            placeholder="Enter the terms and conditions for your loyalty program offer..."
          />
        </div>

        <div className="flex gap-4 justify-end pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-slate-900 text-white border-none rounded-xl font-bold shadow-lg hover:bg-emerald-600 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoyaltyProgramForm;

