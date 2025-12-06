import React from "react";

export default function PaymentActions({
  disabled = false,
  walletDisabled = false,
  onPayCard,
  onPayWallet,
  paying = false,
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        type="button"
        onClick={onPayCard}
        disabled={paying || disabled}
        className={`btn btn-sm w-full border-none shadow-md text-slate-900 font-bold ${disabled
            ? "bg-slate-200 cursor-not-allowed opacity-70"
            : "bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700"
          }`}
      >
        {paying ? "Processing..." : "💳 Pay by Card"}
      </button>
      <button
        type="button"
        onClick={onPayWallet}
        disabled={paying || walletDisabled}
        className={`btn btn-sm w-full font-bold ${walletDisabled
            ? "btn-disabled bg-slate-100 text-slate-400 border-slate-200"
            : "btn-outline btn-info hover:bg-info hover:text-white"
          }`}
      >
        {paying ? "Processing..." : "💼 Pay from Wallet"}
      </button>
    </div>
  );
}
