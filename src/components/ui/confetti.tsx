"use client";

import React from "react";

interface ConfettiProps {
  className?: string;
}

export function Confetti({ className }: ConfettiProps) {
  return (
    <div className={className}>
      {/* Simple confetti effect using CSS */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 10 + 5}px`,
              height: `${Math.random() * 10 + 5}px`,
              backgroundColor: [
                "#ff6b6b",
                "#4ecdc4",
                "#45b7d1",
                "#96ceb4",
                "#feca57",
                "#ff9ff3",
                "#54a0ff",
                "#5f27cd",
                "#00d2d3",
                "#ff9f43",
              ][Math.floor(Math.random() * 10)],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 2 + 1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
} 