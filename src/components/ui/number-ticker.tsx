"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import React, { useEffect } from "react";

import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export function NumberTicker({
  value,
  className,
  suffix = "",
  prefix = "",
  duration = 2,
}: NumberTickerProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const displayValue = useTransform(rounded, (latest) => `${prefix}${latest}${suffix}`);

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: "easeOut",
    });

    return controls.stop;
  }, [value, count, duration]);

  return (
    <motion.span className={cn(className)}>
      {displayValue}
    </motion.span>
  );
} 