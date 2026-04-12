"use client";

import type { ModeId } from "@/lib/types";
import { MODES } from "@/lib/modes";

interface ModeSelectorProps {
  activeModes: ModeId[];
  onToggle: (id: ModeId) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export default function ModeSelector({
  activeModes,
  onToggle,
  onSelectAll,
  onClear,
}: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 border-b border-border">
      {MODES.map((m) => {
        const active = activeModes.includes(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold font-mono transition-all cursor-pointer border"
            style={{
              background: active ? `color-mix(in srgb, ${m.color} 8%, transparent)` : "transparent",
              borderColor: active ? `color-mix(in srgb, ${m.color} 25%, transparent)` : "var(--color-border)",
              color: active ? m.color : "var(--color-border-light)",
            }}
            title={`${m.label}: ${m.desc}`}
          >
            <span className="text-xs">{m.icon}</span>
            {m.id}
          </button>
        );
      })}
      <button
        onClick={onSelectAll}
        className="rounded px-1.5 py-0.5 text-[8px] font-mono text-muted border border-border cursor-pointer hover:text-foreground transition-colors"
      >
        ALL
      </button>
      <button
        onClick={onClear}
        className="rounded px-1.5 py-0.5 text-[8px] font-mono text-muted border border-border cursor-pointer hover:text-foreground transition-colors"
      >
        CLR
      </button>
    </div>
  );
}
