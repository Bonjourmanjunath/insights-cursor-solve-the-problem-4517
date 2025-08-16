/**
 * Design System - Apple-Style Minimalism
 * 
 * Design Rationale:
 * - Pure black (#000) and white (#FFF) for maximum contrast and Apple-like simplicity
 * - San Francisco font stack for native feel across platforms
 * - Consistent typographic scale (48px → 32px → 24px → 18px → 16px → 14px)
 * - Generous whitespace and subtle rounded corners (2xl)
 * - Soft shadows for depth without visual noise
 * - Mobile-first responsive design
 * - WCAG2.1 AA accessibility compliance
 */

export const designSystem = {
  // Color Palette - Pure Black & White
  colors: {
    black: '#000000',
    white: '#FFFFFF',
    // Semantic colors using black/white with opacity
    primary: '#000000',
    secondary: '#FFFFFF',
    background: '#FFFFFF',
    foreground: '#000000',
    muted: 'rgba(0, 0, 0, 0.6)',
    accent: 'rgba(0, 0, 0, 0.1)',
    border: 'rgba(0, 0, 0, 0.1)',
    input: 'rgba(0, 0, 0, 0.05)',
    ring: 'rgba(0, 0, 0, 0.2)',
    destructive: '#000000',
    destructiveForeground: '#FFFFFF',
    card: '#FFFFFF',
    cardForeground: '#000000',
    popover: '#FFFFFF',
    popoverForeground: '#000000',
    success: '#000000',
    warning: '#000000',
    info: '#000000',
  },

  // Typography - San Francisco Font Stack
  typography: {
    fontFamily: {
      sans: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"San Francisco"',
        '"Helvetica Neue"',
        'Helvetica',
        'Arial',
        'sans-serif'
      ],
      mono: [
        '"SF Mono"',
        'Monaco',
        'Inconsolata',
        '"Roboto Mono"',
        'monospace'
      ]
    },
    
    // Typographic Scale (48px → 32px → 24px → 18px → 16px → 14px)
    fontSize: {
      'xs': '0.75rem',    // 12px
      'sm': '0.875rem',   // 14px
      'base': '1rem',     // 16px
      'lg': '1.125rem',   // 18px
      'xl': '1.5rem',     // 24px
      '2xl': '2rem',      // 32px
      '3xl': '3rem',      // 48px
      '4xl': '3.75rem',   // 60px
      '5xl': '4.5rem',    // 72px
      '6xl': '6rem',      // 96px
    },

    // Harmonious Line Heights
    lineHeight: {
      'tight': '1.2',
      'snug': '1.375',
      'normal': '1.5',
      'relaxed': '1.625',
      'loose': '2',
    },

    // Font Weights
    fontWeight: {
      'normal': '400',
      'medium': '500',
      'semibold': '600',
      'bold': '700',
      'extrabold': '800',
    }
  },

  // Spacing Scale - Generous Whitespace
  spacing: {
    '0': '0',
    '1': '0.25rem',   // 4px
    '2': '0.5rem',    // 8px
    '3': '0.75rem',   // 12px
    '4': '1rem',      // 16px
    '5': '1.25rem',   // 20px
    '6': '1.5rem',    // 24px
    '8': '2rem',      // 32px
    '10': '2.5rem',   // 40px
    '12': '3rem',     // 48px
    '16': '4rem',     // 64px
    '20': '5rem',     // 80px
    '24': '6rem',     // 96px
    '32': '8rem',     // 128px
    '40': '10rem',    // 160px
    '48': '12rem',    // 192px
    '56': '14rem',    // 224px
    '64': '16rem',    // 256px
  },

  // Border Radius - Subtle Rounded Corners
  borderRadius: {
    'none': '0',
    'sm': '0.125rem',   // 2px
    'base': '0.25rem',  // 4px
    'md': '0.375rem',   // 6px
    'lg': '0.5rem',     // 8px
    'xl': '0.75rem',    // 12px
    '2xl': '1rem',      // 16px - Apple-style
    '3xl': '1.5rem',    // 24px
    'full': '9999px',
  },

  // Shadows - Soft and Subtle
  boxShadow: {
    'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    'base': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    'none': 'none',
  },

  // Breakpoints - Mobile First
  breakpoints: {
    'xs': '320px',
    'sm': '640px',
    'md': '768px',
    'lg': '1024px',
    'xl': '1280px',
    '2xl': '1440px',
  },

  // Transitions - Smooth and Natural
  transition: {
    'default': 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    'fast': 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
    'slow': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    'bounce': 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Z-Index Scale
  zIndex: {
    '0': '0',
    '10': '10',
    '20': '20',
    '30': '30',
    '40': '40',
    '50': '50',
    'auto': 'auto',
  }
};

// Component-specific design tokens
export const componentTokens = {
  // Button Variants
  button: {
    primary: {
      background: designSystem.colors.black,
      color: designSystem.colors.white,
      border: 'none',
      borderRadius: designSystem.borderRadius['2xl'],
      padding: `${designSystem.spacing['4']} ${designSystem.spacing['8']}`,
      fontSize: designSystem.typography.fontSize.base,
      fontWeight: designSystem.typography.fontWeight.medium,
      transition: designSystem.transition.default,
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: designSystem.boxShadow.lg,
      }
    },
    secondary: {
      background: 'transparent',
      color: designSystem.colors.black,
      border: `1px solid ${designSystem.colors.border}`,
      borderRadius: designSystem.borderRadius['2xl'],
      padding: `${designSystem.spacing['4']} ${designSystem.spacing['8']}`,
      fontSize: designSystem.typography.fontSize.base,
      fontWeight: designSystem.typography.fontWeight.medium,
      transition: designSystem.transition.default,
      '&:hover': {
        background: designSystem.colors.accent,
        borderColor: designSystem.colors.black,
      }
    }
  },

  // Card Variants
  card: {
    default: {
      background: designSystem.colors.card,
      border: `1px solid ${designSystem.colors.border}`,
      borderRadius: designSystem.borderRadius['2xl'],
      padding: designSystem.spacing['8'],
      boxShadow: designSystem.boxShadow.base,
      transition: designSystem.transition.default,
      '&:hover': {
        boxShadow: designSystem.boxShadow.lg,
        transform: 'translateY(-2px)',
      }
    }
  },

  // Input Variants
  input: {
    default: {
      background: designSystem.colors.input,
      border: `1px solid ${designSystem.colors.border}`,
      borderRadius: designSystem.borderRadius['2xl'],
      padding: `${designSystem.spacing['4']} ${designSystem.spacing['6']}`,
      fontSize: designSystem.typography.fontSize.base,
      transition: designSystem.transition.default,
      '&:focus': {
        outline: 'none',
        borderColor: designSystem.colors.black,
        boxShadow: `0 0 0 3px ${designSystem.colors.ring}`,
      }
    }
  }
};

// Animation presets for Framer Motion
export const animationPresets = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

export default designSystem; 