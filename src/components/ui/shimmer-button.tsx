"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ children, className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-md font-medium transition-all duration-200",
          "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
          "hover:from-blue-700 hover:to-indigo-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100" />
      </button>
    );
  }
);

ShimmerButton.displayName = "ShimmerButton"; 