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
      } catch (_) { }
      onSuccess && onSuccess(value);
      onClose && onClose();
    } catch (e2) {
      setError(e2?.message || 'Top-up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 transition-all">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all scale-100">
        <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-xl text-slate-900">Add Funds</h3>
            <p className="text-slate-500 text-sm mt-1">Top up your wallet balance</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleTopUp} className="p-6">
          <label className="block text-slate-700 font-bold mb-3 text-sm uppercase tracking-wide">Payment Method</label>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: 'card', label: 'Card', icon: '💳' },
              { value: 'bank', label: 'Bank', icon: '🏦' },
              { value: 'wallet', label: 'Wallet', icon: '📱' }
            ].map(method => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border-2 font-bold text-sm transition-all ${paymentMethod === method.value
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <span className="text-2xl">{method.icon}</span>
                <span>{method.label}</span>
              </button>
            ))}
          </div>

          <label className="block text-slate-700 font-bold mb-3 text-sm uppercase tracking-wide">Amount (EGP)</label>
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">EGP</span>
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-14 pr-4 py-4 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-emerald-600 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  Processing...
                </span>
              ) : (
                'Confirm Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
