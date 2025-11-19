import React, { useEffect, useMemo, useState } from 'react';
import { createCheckoutSession, getWalletBalance, payWithWallet } from '../../services/paymentService';

function toCurrency(amount, currency = 'EGP') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount || 0));
  } catch (_) {
    return `${Number(amount || 0).toFixed(2)} ${currency}`;
  }
}

export default function PayDialog({ open, onClose, event, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState({ balance: undefined });
  const [error, setError] = useState('');

  const price = useMemo(() => {
    if (!event) return 0;
    // Support both plain event and nested { event }; fall back to requiredBudget for workshops
    const p = (event.event && (event.event.price ?? event.event.amount ?? event.event.requiredBudget))
      ?? (event.price ?? event.amount ?? event.requiredBudget)
      ?? 0;
    return Number(p) || 0;
  }, [event]);

  const currency = useMemo(() => {
    if (!event) return 'EGP';
    return event.currency || (event.event && event.event.currency) || 'EGP';
  }, [event]);

  useEffect(() => {
    let active = true;
    async function load() {
      setError('');
      if (!open) return;
      try {
        const res = await getWalletBalance();
        if (!active) return;
        setWallet(res || { balance: 0 });
      } catch (e) {
        if (!active) return;
        // Keep silent; wallet may be optional
        setWallet({ balance: undefined });
      }
    }
    load();
    return () => { active = false; };
  }, [open]);

  if (!open) return null;

  const canUseWallet = typeof wallet.balance === 'number' && wallet.balance >= price && price > 0;

  async function handleWalletPay() {
    if (!event) return;
    setLoading(true);
    setError('');
    try {
      const id = event?.event?._id || event?._id || event?.id;
      const res = await payWithWallet(id);
      if (res && (res.success || res.paid || res.status === 'paid')) {
        try {
          const detail = { reason: 'wallet-pay', eventId: id, balance: res.balance, amount: price };
          window.dispatchEvent(new CustomEvent('wallet:updated', { detail }));
          window.dispatchEvent(new CustomEvent('payment:success', { detail: { method: 'Wallet', amount: price } }));
        } catch (_) {}
        onSuccess && onSuccess({ method: 'wallet', eventId: id });
        onClose && onClose();
        return;
      }
      // Fallback
      onSuccess && onSuccess({ method: 'wallet', eventId: id, raw: res });
      try { window.dispatchEvent(new CustomEvent('wallet:updated')); } catch (_) {}
      onClose && onClose();
    } catch (e) {
      setError(e.message || 'Wallet payment failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCardPay() {
    if (!event) return;
    setLoading(true);
    setError('');
    try {
      const id = event?.event?._id || event?._id || event?.id;
      const { url, raw } = await createCheckoutSession(id);
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Could not get checkout URL');
      if (raw) console.warn('createCheckoutSession raw payload:', raw);
    } catch (e) {
      setError(e.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        width: '95%', maxWidth: 520, background: '#fff', borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)', color: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Complete Payment</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>Secure checkout for your registration</div>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ marginBottom: 14, color: '#003366', fontWeight: 700 }}>
            Amount due: {toCurrency(price, currency)}
          </div>

          {typeof wallet.balance === 'number' && (
            <div style={{
              marginBottom: 12, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fafafa', color: '#374151'
            }}>
              Wallet balance: <b>{toCurrency(wallet.balance, currency)}</b>
            </div>
          )}

          {error && (
            <div style={{ color: '#b91c1c', marginBottom: 10 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleCardPay}
              disabled={loading}
              style={{
                padding: '12px 16px',
                background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                color: '#003366',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                flex: 1,
                minWidth: 180
              }}
            >
              Pay by card (Stripe)
            </button>

            <button
              type="button"
              onClick={handleWalletPay}
              disabled={loading || !canUseWallet}
              style={{
                padding: '12px 16px',
                background: canUseWallet && !loading ? 'rgba(34,197,94,0.15)' : '#f3f4f6',
                color: canUseWallet && !loading ? '#166534' : '#9ca3af',
                border: canUseWallet ? '1px solid rgba(34,197,94,0.35)' : '1px solid #e5e7eb',
                borderRadius: 10,
                fontWeight: 800,
                cursor: loading || !canUseWallet ? 'not-allowed' : 'pointer',
                flex: 1,
                minWidth: 180
              }}
            >
              Pay from wallet
            </button>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 14px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
