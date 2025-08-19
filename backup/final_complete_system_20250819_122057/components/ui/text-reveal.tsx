"use client";

import { motion } from "framer-motion";
import React from "react";

import { cn } from "@/lib/utils";

interface TextRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function TextReveal({
  children,
  className,
  delay = 0,
  duration = 0.8,
}: TextRevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      viewport={{ once: true }}
    >
      {children}
    </motion.div>
  );
} 