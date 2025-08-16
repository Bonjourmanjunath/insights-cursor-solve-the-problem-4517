/**
 * Apple-Style Card Component
 * 
 * Design Rationale:
 * - Clean white background with subtle borders
 * - 2xl border radius for Apple-like rounded corners
 * - Soft shadows for depth without visual noise
 * - Smooth hover animations with subtle transforms
 * - Generous padding for breathing room
 * - Accessible focus states
 * - Mobile-first responsive design
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AppleCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
  'aria-label'?: string;
}

const AppleCard: React.FC<AppleCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  onClick,
  interactive = false,
  'aria-label': ariaLabel,
  ...props
}) => {
  const baseClasses = `
    bg-white
    transition-all duration-200 ease-out
    focus:outline-none
  `;

  const variantClasses = {
    default: `
      border border-gray-200
      shadow-sm
      hover:shadow-md
    `,
    elevated: `
      border border-gray-200
      shadow-md
      hover:shadow-lg
    `,
    outlined: `
      border-2 border-gray-200
      shadow-none
      hover:border-gray-300
    `
  };

  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-12'
  };

  const interactiveClasses = interactive ? `
    cursor-pointer
    hover:scale-[1.02]
    active:scale-[0.98]
  ` : '';

  const cardClasses = cn(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    interactiveClasses,
    'rounded-2xl',
    className
  );

  const CardWrapper = interactive ? motion.div : 'div';

  return (
    <CardWrapper
      className={cardClasses}
      onClick={onClick}
      aria-label={ariaLabel}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      whileHover={interactive ? { scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17
      }}
      {...props}
    >
      {children}
    </CardWrapper>
  );
};

export default AppleCard; 