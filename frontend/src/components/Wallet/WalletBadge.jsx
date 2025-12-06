import React from "react";

export default function WalletBadge({
  balance,
  onTopUp,
  currency = "EGP",
  label = "Wallet Balance",
  className = "",
}) {
  const display = typeof balance === "number" ? balance.toFixed(2) : "—";

  return (
    <div className={`bg-white py-2 px-4 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm ${className}`}>
      <div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">
          {label}
        </div>
        <div className="text-lg font-bold text-slate-800 leading-none">
          {display} <span className="text-xs text-slate-500 font-normal">{currency}</span>
        </div>
      </div>
      <button
        onClick={onTopUp}
        className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg text-xs font-bold hover:shadow-md hover:-translate-y-0.5 transition-all active:translate-y-0"
      >
        + Top Up
      </button>
    </div>
  );
}
