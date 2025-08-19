"use client";

import { motion } from "framer-motion";
import React from "react";

import { cn } from "@/lib/utils";

interface AnimatedBeamProps {
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedBeam({ className, children }: AnimatedBeamProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
      }}
    >
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg"
        animate={{
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
} 