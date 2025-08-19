/**
 * Animated Waves Component
 * 
 * Design Rationale:
 * - Subtle, sophisticated wave animations
 * - ElevenLabs-style flowing background elements
 * - Smooth, professional motion
 * - Multiple layers for depth
 * - Responsive and performant
 */

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedWavesProps {
  className?: string;
}

const AnimatedWaves: React.FC<AnimatedWavesProps> = ({ className }) => {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className || ''}`}>
      {/* Primary Wave */}
      <motion.div
        className="absolute top-1/4 left-0 w-full h-32"
        animate={{
          x: [0, -100, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <svg
          viewBox="0 0 1200 200"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z"
            fill="url(#waveGradient1)"
            animate={{
              d: [
                "M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z",
                "M0,100 Q300,150 600,100 T1200,100 L1200,200 L0,200 Z",
                "M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z"
              ]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <defs>
            <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(156, 163, 175, 0.1)" />
              <stop offset="50%" stopColor="rgba(107, 114, 128, 0.15)" />
              <stop offset="100%" stopColor="rgba(75, 85, 99, 0.1)" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Secondary Wave */}
      <motion.div
        className="absolute bottom-1/4 right-0 w-full h-24"
        animate={{
          x: [0, 100, 0],
          y: [0, 15, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
          delay: 2
        }}
      >
        <svg
          viewBox="0 0 1200 150"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M0,75 Q400,25 800,75 T1200,75 L1200,150 L0,150 Z"
            fill="url(#waveGradient2)"
            animate={{
              d: [
                "M0,75 Q400,25 800,75 T1200,75 L1200,150 L0,150 Z",
                "M0,75 Q400,125 800,75 T1200,75 L1200,150 L0,150 Z",
                "M0,75 Q400,25 800,75 T1200,75 L1200,150 L0,150 Z"
              ]
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <defs>
            <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(75, 85, 99, 0.08)" />
              <stop offset="50%" stopColor="rgba(55, 65, 81, 0.12)" />
              <stop offset="100%" stopColor="rgba(31, 41, 55, 0.08)" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Floating Particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-gray-400 rounded-full opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

export default AnimatedWaves; 