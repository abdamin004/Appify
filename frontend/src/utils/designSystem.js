// Design System Constants
// Centralized design tokens for consistent UI across the application

export const colors = {
  // Primary Colors
  primary: '#003366',        // Deep blue
  primaryDark: '#000d1a',    // Very dark blue
  primaryLight: '#004080',   // Lighter blue
  
  // Accent Colors
  accent: '#b8941f',         // Gold (dimmer)
  accentDark: '#9a7a1a',     // Darker gold
  accentLight: '#c9a845',    // Lighter gold (dimmer)
  
  // Neutral Colors
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Status Colors
  success: '#10b981',
  successLight: '#d1fae5',
  error: '#dc2626',
  errorLight: '#fee2e2',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#dbeafe',
  
  // Background Colors
  bgPrimary: 'linear-gradient(135deg, #003366 0%, #000d1a 100%)',
  bgCard: 'rgba(255, 255, 255, 0.85)',
  bgOverlay: 'rgba(0, 51, 102, 0.95)',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  '5xl': '48px',
  '6xl': '64px',
  '7xl': '80px',
  '8xl': '120px',
};

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '20px',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 12px rgba(0, 51, 102, 0.15)',
  lg: '0 8px 25px rgba(0, 0, 0, 0.3)',
  xl: '0 12px 24px rgba(212, 175, 55, 0.25)',
  accent: '0 4px 15px rgba(212, 175, 55, 0.4)',
  accentHover: '0 6px 20px rgba(212, 175, 55, 0.6)',
};

export const typography = {
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2rem',   // 32px
    '5xl': '2.5rem', // 40px
    '6xl': '3rem',   // 48px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const transitions = {
  fast: '0.15s ease',
  normal: '0.3s ease',
  slow: '0.5s ease',
};

// Common Component Styles
export const buttonStyles = {
  primary: {
    padding: `${spacing.md} ${spacing['2xl']}`,
    background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDark} 100%)`,
    color: colors.primary,
    border: 'none',
    borderRadius: borderRadius.xl,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
    transition: transitions.normal,
    boxShadow: shadows.accent,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: shadows.accentHover,
    },
    '&:active': {
      transform: 'translateY(0)',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
    },
  },
  secondary: {
    padding: `${spacing.md} ${spacing['2xl']}`,
    background: 'transparent',
    color: colors.accent,
    border: `2px solid ${colors.accent}`,
    borderRadius: borderRadius.xl,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: transitions.normal,
    '&:hover': {
      background: colors.accent,
      color: colors.primary,
    },
  },
  outline: {
    padding: `${spacing.md} ${spacing['2xl']}`,
    background: 'transparent',
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    borderRadius: borderRadius.xl,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: transitions.normal,
    '&:hover': {
      background: colors.primary,
      color: colors.white,
    },
  },
  back: {
    padding: `${spacing.sm} ${spacing.lg}`,
    background: colors.bgCard,
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    borderRadius: borderRadius.xl,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    cursor: 'pointer',
    transition: transitions.normal,
    whiteSpace: 'nowrap',
  },
};

export const cardStyles = {
  base: {
    background: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    boxShadow: shadows.lg,
    padding: spacing['2xl'],
    border: `1px solid ${colors.gray200}`,
    transition: transitions.normal,
  },
  hover: {
    transform: 'translateY(-5px)',
    boxShadow: shadows.xl,
    border: `2px solid rgba(212, 175, 55, 0.3)`,
  },
};

export const inputStyles = {
  base: {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    border: `2px solid ${colors.gray200}`,
    borderRadius: borderRadius.xl,
    fontSize: typography.fontSize.base,
    outline: 'none',
    transition: transitions.fast,
    backgroundColor: colors.white,
    color: colors.gray800,
    boxSizing: 'border-box',
    '&:focus': {
      borderColor: colors.accent,
      boxShadow: `0 0 0 3px rgba(212, 175, 55, 0.1)`,
    },
    '&:disabled': {
      backgroundColor: colors.gray100,
      cursor: 'not-allowed',
    },
  },
};

export const badgeStyles = {
  primary: {
    padding: `${spacing.xs} ${spacing.lg}`,
    background: `rgba(212, 175, 55, 0.15)`,
    color: colors.primary,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    border: `1px solid rgba(212, 175, 55, 0.2)`,
  },
  success: {
    padding: `${spacing.xs} ${spacing.lg}`,
    background: colors.successLight,
    color: colors.success,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  error: {
    padding: `${spacing.xs} ${spacing.lg}`,
    background: colors.errorLight,
    color: colors.error,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
};

// Helper function to apply button styles with hover effects
export const getButtonStyle = (variant = 'primary', disabled = false) => {
  const baseStyle = buttonStyles[variant] || buttonStyles.primary;
  return {
    ...baseStyle,
    ...(disabled && { opacity: 0.6, cursor: 'not-allowed' }),
  };
};

// Helper function for hover effects
export const getHoverHandlers = (style) => ({
  onMouseEnter: (e) => {
    if (!e.target.disabled) {
      Object.assign(e.target.style, style.hover || {});
    }
  },
  onMouseLeave: (e) => {
    if (!e.target.disabled) {
      Object.assign(e.target.style, style.base || {});
    }
  },
});

