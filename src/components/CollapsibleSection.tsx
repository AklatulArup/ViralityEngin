"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  accentColor = "var(--color-accent)",
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: open ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: `1px solid ${open ? `color-mix(in srgb, ${accentColor} 30%, rgba(255,255,255,0.10))` : "rgba(255,255,255,0.07)"}`,
        boxShadow: open
          ? `0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 24px color-mix(in srgb, ${accentColor} 6%, transparent)`
          : "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        transition: "all 0.3s ease",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{
          background: open ? `color-mix(in srgb, ${accentColor} 5%, rgba(255,255,255,0.03))` : "transparent",
        }}
      >
        <span
          className="text-xs transition-transform duration-200 shrink-0"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: accentColor,
            filter: open ? `drop-shadow(0 0 4px ${accentColor})` : "none",
            transition: "transform 0.2s, filter 0.2s",
          }}
        >
          &#9654;
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold" style={{ color: open ? accentColor : "rgba(232,232,255,0.85)" }}>
            {title}
          </div>
          {subtitle && (
            <div className="text-[10px] mt-0.5" style={{ color: "rgba(232,232,255,0.38)" }}>{subtitle}</div>
          )}
        </div>
        {open && (
          <div
            className="shrink-0 w-1.5 h-1.5 rounded-full"
            style={{
              background: accentColor,
              boxShadow: `0 0 6px ${accentColor}, 0 0 12px color-mix(in srgb, ${accentColor} 50%, transparent)`,
              animation: "glowPulse 2s ease-in-out infinite",
            }}
          />
        )}
      </button>
      {open && (
        <div
          className="px-4 pb-4"
          style={{
            borderTop: `1px solid rgba(255,255,255,0.06)`,
            paddingTop: 12,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
