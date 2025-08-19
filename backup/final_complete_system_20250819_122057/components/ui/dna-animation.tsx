"use client";

import { motion } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";

interface DNAAnimationProps {
  className?: string;
  size?: number;
  speed?: number;
  color1?: string;
  color2?: string;
  strandCount?: number;
}

export function DNAAnimation({
  className,
  size = 200,
  speed = 2,
  color1 = "#3b82f6",
  color2 = "#10b981",
  strandCount = 8,
}: DNAAnimationProps) {
  const strands = Array.from({ length: strandCount }, (_, i) => i);
  const basePairs = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* DNA Helix Container */}
      <div className="relative w-full h-full">
        {/* Left Strand */}
        <div className="absolute left-1/4 top-0 w-1 h-full">
          {basePairs.map((pair, index) => (
            <motion.div
              key={`left-${index}`}
              className="absolute w-2 h-2 rounded-full bg-white shadow-lg"
              style={{
                left: "-4px",
                top: `${(index / basePairs.length) * 100}%`,
              }}
              animate={{
                x: [0, 8, 0],
                y: [0, -4, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: speed,
                repeat: Infinity,
                delay: (index / basePairs.length) * speed,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Right Strand */}
        <div className="absolute right-1/4 top-0 w-1 h-full">
          {basePairs.map((pair, index) => (
            <motion.div
              key={`right-${index}`}
              className="absolute w-2 h-2 rounded-full bg-white shadow-lg"
              style={{
                left: "-4px",
                top: `${(index / basePairs.length) * 100}%`,
              }}
              animate={{
                x: [0, -8, 0],
                y: [0, 4, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: speed,
                repeat: Infinity,
                delay: (index / basePairs.length) * speed + speed / 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Base Pairs - Connecting Lines */}
        {basePairs.map((pair, index) => (
          <motion.div
            key={`pair-${index}`}
            className="absolute top-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-green-500 to-blue-500"
            style={{
              top: `${(index / basePairs.length) * 100}%`,
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scaleX: [0.7, 1.1, 0.7],
              boxShadow: [
                "0 0 5px rgba(59, 130, 246, 0.3)",
                "0 0 15px rgba(59, 130, 246, 0.8)",
                "0 0 5px rgba(59, 130, 246, 0.3)"
              ],
            }}
            transition={{
              duration: speed * 1.5,
              repeat: Infinity,
              delay: (index / basePairs.length) * speed,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Floating Nucleotides */}
        {strands.map((strand, index) => (
          <motion.div
            key={`nucleotide-${index}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: index % 2 === 0 ? color1 : color2,
              left: `${20 + (index % 3) * 20}%`,
              top: `${(index / strands.length) * 100}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              x: [-5, 5, -5],
              scale: [0.5, 1, 0.5],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: speed * 1.5,
              repeat: Infinity,
              delay: (index / strands.length) * speed,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* DNA Helix Rotation Effect */}
        <motion.div
          className="absolute inset-0"
          animate={{
            rotateY: [0, 360],
          }}
          transition={{
            duration: speed * 4,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Additional Helix Strands */}
          {Array.from({ length: 6 }, (_, i) => (
            <motion.div
              key={`helix-${i}`}
              className="absolute w-0.5 h-full bg-gradient-to-b from-transparent via-white to-transparent opacity-40"
              style={{
                left: `${20 + i * 12}%`,
              }}
              animate={{
                opacity: [0.1, 0.6, 0.1],
                scaleY: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: speed * 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>

        {/* Pulse Effect */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-500/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: speed * 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />

        {/* Energy Particles */}
        {Array.from({ length: 12 }, (_, i) => (
          <motion.div
            key={`energy-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              backgroundColor: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#10b981" : "#3b82f6",
              left: `${20 + (i % 4) * 20}%`,
              top: `${(i / 12) * 100}%`,
            }}
            animate={{
              y: [-30, 30, -30],
              x: [-15, 15, -15],
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: speed * 2.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Enhanced Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 via-green-500/15 to-blue-500/15 rounded-full blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent rounded-full blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-green-500/5 to-transparent rounded-full blur-2xl" />
    </div>
  );
} 