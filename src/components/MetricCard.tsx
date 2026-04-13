"use client";

import { useState } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  color?: string;
}

export default function MetricCard({ label, value, color = "#E8E8FF" }: MetricCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="glass-card px-3.5 py-2.5 cursor-default select-none"
      style={{
        background: hovered
          ? `color-mix(in srgb, ${color} 6%, rgba(255,255,255,0.07))`
          : "rgba(255,255,255,0.045)",
        border: `1px solid color-mix(in srgb, ${color} ${hovered ? "28%" : "14%"}, rgba(255,255,255,0.08))`,
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.22), 0 0 20px color-mix(in srgb, ${color} 10%, transparent)`
          : "0 4px 24px rgba(0,0,0,0.40), 0 1px 4px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14)",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: "rgba(232,232,255,0.38)" }}>
        {label}
      </div>
      <div
        className="text-[16px] font-extrabold font-mono leading-tight"
        style={{
          color,
          textShadow: hovered
            ? `0 0 12px color-mix(in srgb, ${color} 65%, transparent), 0 0 28px color-mix(in srgb, ${color} 30%, transparent)`
            : `0 0 8px color-mix(in srgb, ${color} 28%, transparent)`,
          transition: "text-shadow 0.25s",
        }}
      >
        {value}
      </div>
    </div>
  );
}
