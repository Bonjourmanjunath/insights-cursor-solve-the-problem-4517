"use client";

import { motion } from "framer-motion";
import React from "react";

import { cn } from "@/lib/utils";

interface SparklesTextProps {
  children: React.ReactNode;
  className?: string;
  sparkleCount?: number;
  sparkleSize?: number;
  sparkleColor?: string;
}

export function SparklesText({
  children,
  className,
  sparkleCount = 20,
  sparkleSize = 4,
  sparkleColor = "#ffd700",
}: SparklesTextProps) {
  const sparkles = Array.from({ length: sparkleCount }, (_, i) => i);

  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      {sparkles.map((i) => (
        <motion.span
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: sparkleSize,
            height: sparkleSize,
            backgroundColor: sparkleColor,
            borderRadius: "50%",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
} 