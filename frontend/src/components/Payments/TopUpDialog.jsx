import React, { useState } from 'react';
import { topupWallet } from '../../services/paymentService';

export default function TopUpDialog({ open, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleTopUp(e) {
    e?.preventDefault?.();
    setError('');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a positive amount');
      return;
    }
    setLoading(true);
    try {
      const res = await topupWallet(value, 'EGP');
      try {
        const detail = { reason: 'topup', amount: value, balance: res?.balance };
        window.dispatchEvent(new CustomEvent('wallet:updated', { detail }));
      } catch (_) {}
      onSuccess && onSuccess(res);
      onClose && onClose();
    } catch (e2) {
      setError(e2?.message || 'Top-up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ width: '95%', maxWidth: 420, background: '#fff', borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', color: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Add Funds to Wallet</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>Enter an amount in EGP</div>
        </div>
        <form onSubmit={handleTopUp} style={{ padding: 20 }}>
          <label style={{ display: 'block', color: '#374151', fontWeight: 700, marginBottom: 8 }}>Payment Method</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { value: 'card', label: '💳 Credit/Debit Card', icon: '💳' },
              { value: 'bank', label: '🏦 Bank Transfer', icon: '🏦' },
              { value: 'wallet', label: '📱 Mobile Wallet', icon: '📱' }
            ].map(method => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `2px solid ${paymentMethod === method.value ? '#d4af37' : '#e5e7eb'}`,
                  background: paymentMethod === method.value ? 'rgba(212, 175, 55, 0.1)' : '#fff',
                  color: '#374151',
                  fontWeight: paymentMethod === method.value ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: 14
                }}
                onMouseEnter={(e) => {
                  if (paymentMethod !== method.value) {
                    e.target.style.borderColor = '#d4af37';
                    e.target.style.background = 'rgba(212, 175, 55, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (paymentMethod !== method.value) {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.background = '#fff';
                  }
                }}
              >
                {method.label}
              </button>
            ))}
          </div>

          <label style={{ display: 'block', color: '#374151', fontWeight: 700, marginBottom: 8 }}>Amount (EGP)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 12 }}
          />
          {error && <div style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '10px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 10, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '10px 14px', background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)', color: '#003366', border: 'none', borderRadius: 10, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>Add Funds</button>
          </div>
        </form>
      </div>
    </div>
  );
}
