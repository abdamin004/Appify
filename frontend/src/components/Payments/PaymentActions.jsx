import React from "react";
import { colors, spacing, borderRadius, typography, shadows } from "../../utils/designSystem";

export default function PaymentActions({
  disabled = false,
  walletDisabled = false,
  onPayCard,
  onPayWallet,
  paying = false,
}) {
  return (
    <div style={{ display: "flex", gap: spacing.sm, flexDirection: "column", width: "100%" }}>
      <button
        type="button"
        onClick={onPayCard}
        disabled={paying || disabled}
        style={{
          width: "100%",
          background: disabled ? colors.gray200 : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
          color: colors.primary,
          border: "none",
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
          cursor: paying || disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          opacity: paying || disabled ? 0.7 : 1,
          boxShadow: shadows.md,
        }}
      >
        {paying ? "Processing..." : "💳 Pay by Card"}
      </button>
      <button
        type="button"
        onClick={onPayWallet}
        disabled={paying || walletDisabled}
        style={{
          width: "100%",
          background: walletDisabled ? colors.gray100 : colors.infoLight,
          color: walletDisabled ? colors.gray500 : colors.info,
          border: walletDisabled ? `1px solid ${colors.gray200}` : `1px solid ${colors.info}`,
          padding: `${spacing.sm} ${spacing.md}`,
          borderRadius: borderRadius.md,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
          cursor: paying || walletDisabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {paying ? "Processing..." : "💼 Pay from Wallet"}
      </button>
    </div>
  );
}

