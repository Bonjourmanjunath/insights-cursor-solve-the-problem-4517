/**
 * Apple-Style Footer Component
 * 
 * Design Rationale:
 * - Clean, minimal design with proper hierarchy
 * - Generous whitespace and clear sections
 * - San Francisco font stack for consistency
 * - Subtle borders and proper spacing
 * - Mobile-first responsive design
 * - Accessible links and proper semantic structure
 * - Pure black/white color scheme
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface FooterLink {
  name: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface AppleFooterProps {
  sections?: FooterSection[];
  logo?: React.ReactNode;
  className?: string;
}

const AppleFooter: React.FC<AppleFooterProps> = ({
  sections = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '/features' },
        { name: 'Pricing', href: '/pricing' },
        { name: 'Free Trial', href: '/auth' }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Contact', href: '/contact' },
        { name: 'Careers', href: '/careers' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Security', href: '/security' }
      ]
    }
  ],
  logo = (
    <div className="flex items-center space-x-2">
      <div className="w-6 h-6 bg-black rounded-lg"></div>
      <span className="font-semibold text-black">FMR QualAI</span>
    </div>
  ),
  className
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`
      bg-white border-t border-gray-200
      ${className || ''}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            {logo}
            <p className="text-sm text-gray-600 max-w-xs">
              Transforming healthcare market research with AI-powered insights and analytics.
            </p>
          </div>

          {/* Footer Sections */}
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <h3 className="text-sm font-semibold text-black uppercase tracking-wide">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-600 hover:text-black transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-600">
              © {currentYear} FMR Global Health. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link
                to="/privacy"
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/cookies"
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AppleFooter; 