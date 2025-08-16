"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface GridPatternProps {
  width?: number;
  height?: number;
  className?: string;
  strokeDasharray?: string;
}

export function GridPattern({
  width = 40,
  height = 40,
  className,
  strokeDasharray = "1",
}: GridPatternProps) {
  return (
    <svg
      className={cn("absolute inset-0 h-full w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="grid"
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${height} 0 L 0 0 0 ${width}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray={strokeDasharray}
            opacity="0.1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
} 