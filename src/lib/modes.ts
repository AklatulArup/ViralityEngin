import type { Mode } from "./types";

export const MODES: Mode[] = [
  {
    id: "A",
    label: "Platform Education",
    icon: "\uD83D\uDCDA",
    desc: "How algorithms work",
    color: "var(--color-mode-a)",
  },
  {
    id: "B",
    label: "Continuous Update",
    icon: "\uD83D\uDD04",
    desc: "Latest algorithm changes",
    color: "var(--color-mode-b)",
  },
  {
    id: "C",
    label: "Outlier Detection",
    icon: "\uD83D\uDD0D",
    desc: "Why content outperformed",
    color: "var(--color-mode-c)",
  },
  {
    id: "D",
    label: "Reverse Engineer",
    icon: "\u2699\uFE0F",
    desc: "Break down virality",
    color: "var(--color-mode-d)",
  },
  {
    id: "E",
    label: "Competitor Intel",
    icon: "\uD83C\uDFAF",
    desc: "Competitor strategies",
    color: "var(--color-mode-e)",
  },
  {
    id: "F",
    label: "URL Analysis",
    icon: "\uD83D\uDD17",
    desc: "Full viral breakdown",
    color: "var(--color-mode-f)",
  },
  {
    id: "G",
    label: "VRS Score",
    icon: "\uD83D\uDCCA",
    desc: "Viral readiness 0-100%",
    color: "var(--color-mode-g)",
  },
  {
    id: "H",
    label: "Intel Update",
    icon: "\uD83E\uDDE0",
    desc: "Update knowledge base",
    color: "var(--color-mode-h)",
  },
];
