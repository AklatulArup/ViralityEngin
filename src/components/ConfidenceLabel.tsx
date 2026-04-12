import type { ConfidenceLevel } from "@/lib/types";

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; color: string; bg: string }
> = {
  confirmed: {
    label: "Confirmed (official)",
    color: "var(--color-confidence-confirmed)",
    bg: "rgba(0, 229, 160, 0.08)",
  },
  strong: {
    label: "Strong evidence",
    color: "var(--color-confidence-strong)",
    bg: "rgba(0, 180, 216, 0.08)",
  },
  likely: {
    label: "Likely (consensus)",
    color: "var(--color-confidence-likely)",
    bg: "rgba(255, 184, 0, 0.08)",
  },
  unconfirmed: {
    label: "Observed, unconfirmed",
    color: "var(--color-confidence-unconfirmed)",
    bg: "rgba(102, 102, 102, 0.08)",
  },
};

interface ConfidenceLabelProps {
  level: ConfidenceLevel;
}

export default function ConfidenceLabel({ level }: ConfidenceLabelProps) {
  const c = CONFIG[level];
  return (
    <span
      className="inline-block text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{ color: c.color, background: c.bg }}
    >
      {c.label}
    </span>
  );
}
