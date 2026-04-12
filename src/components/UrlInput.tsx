"use client";

import { useState, useEffect } from "react";
import { parseInput } from "@/lib/url-parser";

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  loading: boolean;
  status: string;
  error: string | null;
}

export default function UrlInput({
  onAnalyze,
  loading,
  status,
  error,
}: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [detectedLabel, setDetectedLabel] = useState("");

  useEffect(() => {
    if (url.trim().length > 5) {
      const parsed = parseInput(url);
      setDetectedLabel(parsed.label);
    } else {
      setDetectedLabel("");
    }
  }, [url]);

  const handleSubmit = () => {
    if (url.trim() && !loading) onAnalyze(url.trim());
  };

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center bg-surface border border-border rounded-lg px-3">
          <span className="text-muted mr-2 text-sm">&#x1F517;</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="Paste YouTube video URL or channel (@handle)..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm py-2.5"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
          className="rounded-lg px-5 py-2.5 font-bold text-sm transition-all cursor-pointer disabled:cursor-default disabled:opacity-50"
          style={{
            background: url.trim()
              ? "linear-gradient(135deg, var(--color-accent), var(--color-accent-blue))"
              : "var(--color-surface-hover)",
            color: url.trim() ? "#000" : "var(--color-muted)",
          }}
        >
          {loading ? "\u23F3" : "Analyze"}
        </button>
      </div>
      {detectedLabel && (
        <div className="text-[11px] text-muted font-mono mt-1.5">
          Auto-detect: {detectedLabel}
        </div>
      )}
      {status && (
        <div className="text-[11px] text-accent font-mono mt-1.5">
          {status}
        </div>
      )}
      {error && (
        <div className="text-[11px] text-vrs-rework mt-1.5">{error}</div>
      )}
    </div>
  );
}
