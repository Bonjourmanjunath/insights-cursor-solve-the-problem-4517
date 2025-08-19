/**
 * Apple-Style Button Component
 * 
 * Design Rationale:
 * - Pure black/white color scheme for maximum contrast
 * - 2xl border radius for subtle rounded corners
 * - San Francisco font stack for native feel
 * - Smooth hover animations with subtle transforms
 * - Accessible focus states and keyboard navigation
 * - Mobile-first responsive design
 * - WCAG2.1 AA compliance
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AppleButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  'aria-label'?: string;
}

const AppleButton: React.FC<AppleButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium font-sans
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    select-none
  `;

  const variantClasses = {
    primary: `
      bg-black text-white
      hover:bg-gray-900 hover:shadow-lg
      focus:ring-black
      active:bg-gray-800
    `,
    secondary: `
      bg-white text-black border border-gray-200
      hover:bg-gray-50 hover:border-gray-300
      focus:ring-black
      active:bg-gray-100
    `,
    ghost: `
      bg-transparent text-black
      hover:bg-gray-100
      focus:ring-black
      active:bg-gray-200
    `
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-2xl',
    md: 'px-6 py-3 text-base rounded-2xl',
    lg: 'px-8 py-4 text-lg rounded-2xl'
  };

  const buttonClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <motion.button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17
      }}
      {...props}
    >
      {loading && (
        <motion.div
          className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}
      {children}
    </motion.button>
  );
};

export default AppleButton; 