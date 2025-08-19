/**
 * Floating Elements Component
 * 
 * Design Rationale:
 * - Subtle floating objects for visual interest
 * - Professional, sophisticated animations
 * - Multiple layers of depth
 * - Responsive and performant
 */

import React from 'react';
import { motion } from 'framer-motion';

interface FloatingElementsProps {
  className?: string;
}

const FloatingElements: React.FC<FloatingElementsProps> = ({ className }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className || ''}`}>
      {/* Large Floating Circle */}
      <motion.div
        className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-gray-200/20 to-gray-400/20 rounded-full blur-xl"
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Medium Floating Circle */}
      <motion.div
        className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-bl from-gray-300/15 to-gray-500/15 rounded-full blur-xl"
        animate={{
          y: [0, 15, 0],
          x: [0, -15, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />

      {/* Small Floating Circle */}
      <motion.div
        className="absolute bottom-20 left-20 w-16 h-16 bg-gradient-to-r from-gray-200/10 to-gray-400/10 rounded-full blur-lg"
        animate={{
          y: [0, -10, 0],
          x: [0, 8, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      {/* Floating Rectangle */}
      <motion.div
        className="absolute top-1/2 right-10 w-20 h-12 bg-gradient-to-r from-gray-300/10 to-gray-500/10 rounded-lg blur-lg"
        animate={{
          y: [0, -25, 0],
          rotate: [0, 5, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3
        }}
      />

      {/* Floating Dots */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-gray-400 rounded-full opacity-40"
          style={{
            left: `${20 + (i * 15)}%`,
            top: `${30 + (i * 10)}%`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingElements; 