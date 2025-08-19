/**
 * Apple-Style Navbar Component
 * 
 * Design Rationale:
 * - Clean, minimal design with proper spacing
 * - San Francisco font stack for native feel
 * - Smooth transitions and hover effects
 * - Mobile-first responsive design
 * - Accessible navigation with proper ARIA labels
 * - Sticky positioning with backdrop blur
 * - Pure black/white color scheme
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import AppleButton from './apple-button';
import { Menu, X } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  external?: boolean;
}

interface AppleNavbarProps {
  items?: NavItem[];
  logo?: React.ReactNode;
  ctaText?: string;
  ctaHref?: string;
  className?: string;
}

const AppleNavbar: React.FC<AppleNavbarProps> = ({
  items = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ],
  logo = (
    <div className="flex items-center space-x-3">
      <img src="/logo.svg?v=1" alt="FMR QualAI" className="w-8 h-8 rounded-lg object-contain shrink-0" />
      <div className="leading-tight">
        <span className="block text-xl font-semibold text-black">FMR QualAI</span>
        <span className="block text-[11px] text-gray-500 -mt-0.5">by FMR Global Health</span>
      </div>
    </div>
  ),
  ctaText = 'Get Started',
  ctaHref = '/auth',
  className
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className={`
      sticky top-0 z-50
      bg-white/95 backdrop-blur-md
      border-b border-gray-200
      ${className || ''}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            {logo}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {items.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  text-sm font-medium transition-colors duration-200
                  ${isActive(item.href)
                    ? 'text-black'
                    : 'text-gray-600 hover:text-black'
                  }
                `}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/auth" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
              Sign In
            </Link>
            <AppleButton size="sm" variant="primary">
              {ctaText}
            </AppleButton>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-gray-200"
            >
              <div className="px-2 pt-2 pb-3 space-y-1">
                {items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      block px-3 py-2 rounded-lg text-base font-medium transition-colors
                      ${isActive(item.href)
                        ? 'text-black bg-gray-100'
                        : 'text-gray-600 hover:text-black hover:bg-gray-50'
                      }
                    `}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="pt-4 space-y-2">
                  <Link
                    to="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-black transition-colors"
                  >
                    Sign In
                  </Link>
                  <AppleButton
                    size="sm"
                    variant="primary"
                    className="w-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {ctaText}
                  </AppleButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default AppleNavbar; 