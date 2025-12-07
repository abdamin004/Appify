import React from 'react';
import { toast } from 'react-toastify';
import { formatEventDateTime } from '../../utils/overlapDetection';

/**
 * Show a warning dialog when there's a time overlap with existing registrations
 * @param {Array} conflicts - Array of conflicting events
 * @param {string} newItemName - Name of the item being registered
 * @param {Date|string} newItemStart - Start time of the new item
 * @returns {Promise<boolean>} - True if user wants to proceed, false if cancelled
 */
export function showOverlapWarning(conflicts, newItemName, newItemStart) {
  return new Promise((resolve) => {
    if (!conflicts || conflicts.length === 0) {
      resolve(true);
      return;
    }

    const conflictList = conflicts.map((conflict, index) => {
      const conflictType = conflict.type === 'GymSession' ? 'Gym Session' : conflict.type || 'Event';
      const conflictTitle = conflict.title || conflict.name || 'Untitled Event';
      const conflictStart = formatEventDateTime(conflict.conflictStart || conflict.startDate);

      return (
        <div key={index} style={{
          padding: '12px',
          marginBottom: '8px',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fbbf24'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', color: '#92400e' }}>
            {conflictType}: {conflictTitle}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
            📅 {conflictStart}
          </div>
        </div>
      );
    });

    const newItemStartFormatted = formatEventDateTime(newItemStart);

    const toastId = toast(
      <div style={{ padding: '8px 0', maxWidth: '500px' }}>
        <div style={{ fontWeight: '700', marginBottom: '12px', fontSize: '1.1rem', color: '#dc2626' }}>
          ⚠️ Time Conflict Detected
        </div>
        <div style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#1f2937' }}>
          You're trying to register for <strong>{newItemName}</strong> at <strong>{newItemStartFormatted}</strong>,
          but you already have {conflicts.length === 1 ? 'an event' : `${conflicts.length} events`} scheduled at that time:
        </div>
        <div style={{ marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
          {conflictList}
        </div>
        <div style={{
          padding: '10px',
          background: '#fef2f2',
          borderRadius: '6px',
          marginBottom: '12px',
          border: '1px solid #fecaca'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: '500' }}>
            ⚠️ You cannot attend multiple events at the same time. Please choose one.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>

          <button
            onClick={() => {
              toast.dismiss(toastId);
              resolve(false);
            }}
            style={{
              padding: '8px 20px',
              background: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            Close
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
          border: '2px solid #fbbf24',
          borderRadius: '12px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
          maxWidth: '550px',
        },
      }
    );
  });
}

