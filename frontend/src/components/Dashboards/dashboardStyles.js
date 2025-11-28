import { colors, spacing, borderRadius, typography, shadows, transitions } from "../../utils/designSystem";

export const headerContainerStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.lg,
  justifyContent: "space-between",
  alignItems: "stretch",
};

export const statCardBase = {
  padding: `${spacing.md} ${spacing.lg}`,
  background: `linear-gradient(135deg, rgba(51, 102, 153, 0.75) 0%, rgba(26, 51, 77, 0.85) 100%)`,
  borderRadius: borderRadius.xl,
  textAlign: "center",
  border: `1px solid ${colors.primary}`,
  boxShadow: shadows.md,
  width: "100px",
  flex: "0 0 auto",
};

export const statValueStyle = {
  fontSize: typography.fontSize['2xl'],
  fontWeight: typography.fontWeight.extrabold,
  color: colors.white,
  margin: 0,
};

export const statLabelStyle = {
  fontSize: typography.fontSize.sm,
  color: colors.accent,
  marginTop: spacing.xs,
  marginBottom: 0,
  fontWeight: typography.fontWeight.semibold,
};

export const pillButtonStyles = {
  neutral: {
    padding: `${spacing.xs} ${spacing.md}`,
    background: colors.gray100,
    color: colors.primary,
    border: `1px solid ${colors.gray200}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: "pointer",
    transition: transitions.fast,
    boxShadow: shadows.sm,
  },
  success: {
    padding: `${spacing.xs} ${spacing.md}`,
    background: colors.successLight,
    color: colors.success,
    border: `1px solid ${colors.success}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: "pointer",
    transition: transitions.fast,
    boxShadow: shadows.sm,
  },
};

export const getTabButtonStyle = (isActive, variant = "default") => {
  const activeGradient =
    variant === "gold"
      ? `linear-gradient(135deg, #d4af37 0%, #b8941f 100%)`
      : `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`;

  return {
    flex: 1,
    padding: `${spacing.md} ${spacing['2xl']}`,
    background: isActive ? activeGradient : "transparent",
    color: isActive ? colors.primary : colors.gray500,
    border: `1px solid ${isActive ? "transparent" : colors.gray200}`,
    borderRadius: borderRadius.xl,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    cursor: "pointer",
    transition: transitions.normal,
    position: "relative",
    minWidth: 160,
  };
};

export const tabRowStyle = {
  display: "flex",
  gap: spacing.md,
  flexWrap: "wrap",
  width: "100%",
};


