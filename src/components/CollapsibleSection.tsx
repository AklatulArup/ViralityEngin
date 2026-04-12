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
      className="rounded-lg overflow-hidden"
      style={{
        border: `1px solid ${open ? `color-mix(in srgb, ${accentColor} 30%, transparent)` : "var(--color-border)"}`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
        style={{ background: open ? `color-mix(in srgb, ${accentColor} 5%, transparent)` : undefined }}
      >
        <span
          className="text-xs transition-transform duration-200"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            color: accentColor,
          }}
        >
          &#9654;
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-semibold" style={{ color: open ? accentColor : "var(--color-foreground)" }}>
            {title}
          </div>
          {subtitle && (
            <div className="text-[10px] text-muted mt-0.5">{subtitle}</div>
          )}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
