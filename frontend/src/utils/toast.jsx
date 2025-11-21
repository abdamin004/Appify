import React from 'react';
import { toast } from 'react-toastify';

// Toast utility functions with improved styling
export const showToast = {
  success: (message, options = {}) => {
    return toast.success(message, {
      position: 'top-center',
      autoClose: 2500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: '#10b981',
        color: '#fff',
        fontWeight: '500',
        fontSize: '14px',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        minWidth: '280px',
        maxWidth: '400px',
      },
      ...options,
    });
  },

  error: (message, options = {}) => {
    return toast.error(message, {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: '500',
        fontSize: '14px',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
        minWidth: '280px',
        maxWidth: '400px',
      },
      ...options,
    });
  },

  info: (message, options = {}) => {
    return toast.info(message, {
      position: 'top-center',
      autoClose: 2500,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: '#3b82f6',
        color: '#fff',
        fontWeight: '500',
        fontSize: '14px',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        minWidth: '280px',
        maxWidth: '400px',
      },
      ...options,
    });
  },

  warning: (message, options = {}) => {
    return toast.warning(message, {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      style: {
        background: '#f59e0b',
        color: '#fff',
        fontWeight: '500',
        fontSize: '14px',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
        minWidth: '280px',
        maxWidth: '400px',
      },
      ...options,
    });
  },
};

// Custom confirmation dialog using toast with promise
export const confirmDialog = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
    const toastId = toast(
      <div style={{ padding: '8px 0' }}>
        <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '1rem' }}>{title}</div>
        <div style={{ marginBottom: '12px', fontSize: '0.9rem' }}>{message}</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(false);
            }}
            style={{
              padding: '6px 16px',
              background: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(true);
            }}
            style={{
              padding: '6px 16px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Confirm
          </button>
        </div>
      </div>,
      {
        position: 'top-center',
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: true,
        style: {
          background: '#fff',
          color: '#1f2937',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
        },
      }
    );
  });
};

