"use client";

import { useState } from "react";
import type { ModeId } from "@/lib/types";
import { MODES } from "@/lib/modes";

interface ModeSelectorProps {
  activeModes: ModeId[];
  onToggle: (id: ModeId) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

const MODE_DESCRIPTIONS: Record<string, string> = {
  A: "Explains how the platform algorithm works — distribution logic, ranking signals, and what drives reach in 2026.",
  B: "Surfaces the latest algorithm changes and platform updates affecting content performance.",
  C: "Identifies why a specific video outperformed the channel median — hook, format, timing, or topic signals.",
  D: "Reverse-engineers viral content to extract the exact formula: structure, pacing, title, thumbnail patterns.",
  E: "Analyzes competitor strategies — what they post, how often, what's working, and gaps you can exploit.",
  F: "Full URL breakdown — pulls every signal from a video or channel link for a deep virality audit.",
  G: "Virality Readiness Score (0–100) — rates how likely content is to be pushed by the algorithm.",
  H: "Updates the platform intelligence knowledge base with fresh algorithm briefing data.",
};

export default function ModeSelector({
  activeModes,
  onToggle,
  onSelectAll,
  onClear,
}: ModeSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="px-1 py-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        {MODES.map((m) => {
          const active = activeModes.includes(m.id);
          const isHovered = hovered === m.id;

          return (
            <div
              key={m.id}
              className="relative"
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <button
                onClick={() => onToggle(m.id)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold font-mono transition-all cursor-pointer border"
                style={{
                  background: active
                    ? `color-mix(in srgb, ${m.color} 12%, transparent)`
                    : "transparent",
                  borderColor: active
                    ? `color-mix(in srgb, ${m.color} 30%, transparent)`
                    : "rgba(255,255,255,0.12)",
                  color: active ? m.color : "rgba(255,255,255,0.35)",
                  transform: isHovered ? "scale(1.08)" : "scale(1)",
                  transition: "all 0.15s ease",
                }}
              >
                <span className="text-xs">{m.icon}</span>
                {m.id}
              </button>

              {/* Tooltip */}
              {isHovered && (
                <div
                  className="absolute z-[200] pointer-events-none"
                  style={{
                    bottom: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 200,
                  }}
                >
                  {/* Card */}
                  <div
                    className="rounded-xl px-3 py-2.5 shadow-2xl"
                    style={{
                      background: "#2a2a2a",
                      border: `1px solid color-mix(in srgb, ${m.color} 35%, transparent)`,
                      boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base leading-none">{m.icon}</span>
                      <div>
                        <span
                          className="text-[11px] font-bold leading-none block"
                          style={{ color: m.color }}
                        >
                          Mode {m.id}
                        </span>
                        <span
                          className="text-[10px] font-semibold leading-none"
                          style={{ color: "#f1f1f1" }}
                        >
                          {m.label}
                        </span>
                      </div>
                    </div>
                    {/* Description */}
                    <p
                      className="text-[11px] leading-relaxed m-0"
                      style={{ color: "#aaa" }}
                    >
                      {MODE_DESCRIPTIONS[m.id] || m.desc}
                    </p>
                  </div>
                  {/* Arrow */}
                  <div
                    className="absolute"
                    style={{
                      bottom: -5,
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: 9,
                      height: 9,
                      background: "#2a2a2a",
                      borderRight: `1px solid color-mix(in srgb, ${m.color} 35%, transparent)`,
                      borderBottom: `1px solid color-mix(in srgb, ${m.color} 35%, transparent)`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={onSelectAll}
          className="rounded px-1.5 py-0.5 text-[8px] font-mono border cursor-pointer transition-colors"
          style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.1)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f1f1f1")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          ALL
        </button>
        <button
          onClick={onClear}
          className="rounded px-1.5 py-0.5 text-[8px] font-mono border cursor-pointer transition-colors"
          style={{ color: "rgba(255,255,255,0.3)", borderColor: "rgba(255,255,255,0.1)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f1f1f1")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
        >
          CLR
        </button>
      </div>
    </div>
  );
}
