"use client";

import { motion } from "framer-motion";
import React from "react";

import { cn } from "@/lib/utils";

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  colors?: string[];
}

export function AnimatedGradientText({
  children,
  className,
  duration = 3,
  colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"],
}: AnimatedGradientTextProps) {
  return (
    <motion.span
      className={cn(
        "bg-gradient-to-r bg-clip-text text-transparent",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(to right, ${colors.join(", ")})`,
        backgroundSize: `${colors.length * 100}% 100%`,
      }}
      animate={{
        backgroundPosition: [
          "0% 50%",
          `${(colors.length - 1) * 100}% 50%`,
          "0% 50%",
        ],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
} 