import React from "react";
import { colors, spacing, borderRadius, shadows, typography } from "../../utils/designSystem";

export default function WalletBadge({
  balance,
  onTopUp,
  currency = "EGP",
  label = "Wallet Balance",
  style,
}) {
  const display = typeof balance === "number" ? balance.toFixed(2) : "—";

  return (
    <div
      style={{
        background: colors.bgCard,
        padding: `${spacing.md} ${spacing.xl}`,
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.gray200}`,
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        boxShadow: shadows.sm,
        ...style,
      }}
    >
      <div>
        <div style={{ fontSize: typography.fontSize.xs, color: colors.gray500, marginBottom: spacing.xs }}>
          {label}
        </div>
        <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.primary }}>
          {display} {currency}
        </div>
      </div>
      <button
        onClick={onTopUp}
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          background: colors.accent,
          color: colors.primary,
          border: 'none',
          borderRadius: borderRadius.md,
          fontWeight: typography.fontWeight.bold,
          fontSize: typography.fontSize.sm,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        + Top Up
      </button>
    </div>
  );
}

