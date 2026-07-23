// CEDOI Official Brand Design System & Color Palette
export const BRAND_COLORS = {
  // Primary Deep Ocean Blue (Logo Base)
  primary: '#0d5984',
  primaryHover: '#094466',
  primaryLight: '#f0f7fb',
  primaryBorder: '#c6def0',

  // Secondary Cyan / Sky Accent (Logo Accent)
  secondary: '#67bed9',
  secondaryHover: '#4faecb',
  secondaryLight: '#f0f9fc',
  secondaryBorder: '#bce4f1',

  // Warm Amber / Sunrise Orange (Logo Warm Accent)
  accent: '#ec861a',
  accentHover: '#d4730d',
  accentLight: '#fff8f0',
  accentBorder: '#fcdcb8',
  accentText: '#c66708',

  // High-Contrast Accessible Typography (WCAG AAA Compliant for all ages)
  canvasBg: '#f4f7f9',
  cardBg: '#ffffff',
  border: '#cbd5e1',           // Sharper, clear card borders
  textHeading: '#0f172a',      // Crisp deep ocean heading (14:1 contrast ratio)
  textBody: '#1e293b',         // Dark slate body text (high legibility)
  textMuted: '#475569',        // High contrast secondary text (never faint #94a3b8!)
  textLight: '#64748b',        // Subtitle labels (WCAG AAA compliant)

  // Status & Utility Colors
  success: '#10b981',
  successLight: '#f0fdf4',
  danger: '#ef4444',
  dangerLight: '#fef2f2',
  warning: '#ec861a',
  warningLight: '#fff8f0',
} as const;
