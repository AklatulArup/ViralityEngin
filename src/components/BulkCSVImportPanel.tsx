"use client";

import { useState, useRef, useCallback } from "react";

interface ImportResult {
  url: string;
  status: "ok" | "skipped" | "error" | "stub";
  platform: string;
  message: string;
  videoCount?: number;
  channelName?: string;
  keywordsAdded?: number;
  hashtagsAdded?: number;
  avgVRS?: number;
}

interface ImportSummary {
  processed: number;
  addedEntries: number;
  totalEntries: number;
  keywordsAdded: number;
  hashtagsAdded: number;
  historySaved: number;
  totalKeywords: number;
  results: ImportResult[];
}

interface BulkCSVImportPanelProps {
  onComplete: () => void;
}

// Parse URLs/handles from CSV or plain text
function parseInput(text: string): string[] {
  const lines = text.split(/[\r\n]+/);
  const urls: string[] = [];
  for (const line of lines) {
    const cells = line.split(/[,\t;]/).map(c => c.trim().replace(/^["']|["']$/g, ""));
    for (const cell of cells) {
      if (!cell || cell.length < 3) continue;
      if (
        /^https?:\/\//i.test(cell) ||
        /^@[a-zA-Z0-9_.]+$/.test(cell) ||
        /youtube\.com|youtu\.be|tiktok\.com|instagram\.com/i.test(cell)
      ) {
        urls.push(cell);
      }
    }
  }
  return [...new Set(urls)];
}

const STATUS_COLORS = { ok: "#2ECC8A", skipped: "#6B6860", error: "#FF4D6A", stub: "#60A5FA" };
const STATUS_ICONS  = { ok: "✓", skipped: "–", error: "✗", stub: "○" };
const PLATFORM_COLORS = { youtube: "#EF4444", tiktok: "#06B6D4", instagram: "#E1306C", "youtube-short": "#EC4899" };

export default function BulkCSVImportPanel({ onComplete }: BulkCSVImportPanelProps) {
  const [text, setText]           = useState("");
  const [dragging, setDragging]   = useState(false);
  const [parsed, setParsed]       = useState<string[]>([]);
  const [loading, setLoading]     = useState(false);
  const [summary, setSummary]     = useState<ImportSummary | null>(null);
  const [depth, setDepth]         = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleTextChange(val: string) {
    setText(val);
    setParsed(parseInput(val));
    setSummary(null);
  }

  async function handleFile(file: File) {
    const content = await file.text();
    handleTextChange(content);
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, []);

  async function runImport() {
    if (!parsed.length) return;
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: parsed, discographyDepth: depth }),
      });
      const data: ImportSummary = await res.json();
      setSummary(data);
      onComplete();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const okCount      = summary?.results.filter(r => r.status === "ok").length ?? 0;
  const errorCount   = summary?.results.filter(r => r.status === "error").length ?? 0;
  const skippedCount = summary?.results.filter(r => r.status === "skipped").length ?? 0;
  const stubCount    = summary?.results.filter(r => r.status === "stub").length ?? 0;

  return (
    <div className="glass-card" style={{ overflow: "hidden" }}>
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #2ECC8A, #60A5FA, transparent)" }} />
      <div style={{ padding: "20px 24px" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8E6E1", marginBottom: 4 }}>Bulk CSV Import</h3>
            <p className="font-mono" style={{ fontSize: 10, color: "#5E5A57", letterSpacing: "0.06em" }}>
              IMPORT CREATORS · EXTRACT KEYWORDS · BUILD HISTORICAL DATASET
            </p>
          </div>
          {parsed.length > 0 && !loading && (
            <span className="font-mono font-bold" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "rgba(46,204,138,0.12)", border: "1px solid rgba(46,204,138,0.3)", color: "#2ECC8A" }}>
              {parsed.length} URL{parsed.length !== 1 ? "s" : ""} detected
            </span>
          )}
        </div>

        {/* ── CSV Format Guide ── */}
        <div style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.14)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <div className="font-mono" style={{ fontSize: 9, color: "#60A5FA", letterSpacing: "0.1em", marginBottom: 6 }}>ACCEPTED CSV FORMATS</div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { type: "YT Channel", ex: "@MrBeast or youtube.com/c/..." },
              { type: "YT Video",   ex: "youtube.com/watch?v=..." },
              { type: "TikTok",     ex: "@handle or tiktok.com/..." },
              { type: "Instagram",  ex: "@handle or instagram.com/..." },
              { type: "YT Shorts",  ex: "youtube.com/shorts/..." },
              { type: "Plain list", ex: "One URL per line, comma, or tab" },
            ].map(({ type, ex }) => (
              <div key={type} className="flex items-center gap-1.5">
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#60A5FA44", display: "inline-block", flexShrink: 0 }} />
                <span className="font-mono" style={{ fontSize: 9, color: "#5E5A57" }}><span style={{ color: "#B8B6B1" }}>{type}:</span> {ex}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Drop zone + textarea ── */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          style={{
            position: "relative", marginBottom: 16, borderRadius: 10, overflow: "hidden",
            border: `1px solid ${dragging ? "rgba(46,204,138,0.5)" : "rgba(255,255,255,0.10)"}`,
            transition: "border-color 0.15s",
            boxShadow: dragging ? "0 0 0 3px rgba(46,204,138,0.1)" : "none",
          }}
        >
          {dragging && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              background: "rgba(46,204,138,0.08)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 28, marginRight: 12 }}>📂</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#2ECC8A" }}>Drop CSV here</span>
            </div>
          )}
          <textarea
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            placeholder={"Paste URLs, @handles, or drop a CSV file here…\n\nExamples:\n@MrBeast\nhttps://youtube.com/watch?v=abc123\n@khaby.lame\nhttps://instagram.com/cristiano"}
            rows={8}
            style={{
              width: "100%", resize: "vertical",
              background: "rgba(0,0,0,0.5)", color: "#E8E6E1",
              border: "none", outline: "none",
              fontSize: 13, lineHeight: 1.7, padding: "14px 16px",
              fontFamily: "var(--font-mono)",
              caretColor: "#2ECC8A",
            }}
          />
        </div>

        {/* ── Controls row ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost flex items-center gap-2"
            style={{ padding: "8px 14px", fontSize: 12 }}
          >
            📂 Upload CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: "none" }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          />

          <div className="flex items-center gap-2">
            <span className="font-mono" style={{ fontSize: 10, color: "#6B6860" }}>Depth:</span>
            <select
              value={depth}
              onChange={e => setDepth(parseInt(e.target.value))}
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#E8E6E1", fontSize: 11, padding: "4px 8px", fontFamily: "var(--font-mono)", cursor: "pointer" }}
            >
              <option value={20}>20 videos/channel</option>
              <option value={50}>50 videos/channel</option>
              <option value={100}>100 videos/channel</option>
              <option value={200}>200 videos/channel</option>
              <option value={500}>500 videos/channel (slow)</option>
            </select>
            <span className="font-mono" style={{ fontSize: 9, color: "#5E5A57" }}>per creator</span>
          </div>

          <div className="flex-1" />

          <button
            onClick={runImport}
            disabled={loading || !parsed.length}
            className="flex items-center gap-2 font-semibold rounded-xl"
            style={{
              height: 40, padding: "0 22px", fontSize: 13, cursor: loading || !parsed.length ? "not-allowed" : "pointer",
              background: parsed.length ? "linear-gradient(135deg, #1D6E4B, #2ECC8A)" : "rgba(255,255,255,0.05)",
              color: parsed.length ? "#fff" : "#4A4845",
              border: parsed.length ? "1px solid rgba(46,204,138,0.4)" : "1px solid rgba(255,255,255,0.08)",
              opacity: loading ? 0.7 : 1,
              transition: "all 0.2s",
              boxShadow: parsed.length && !loading ? "inset 0 1px 0 rgba(255,255,255,0.2), 0 0 20px rgba(46,204,138,0.4), 0 0 48px rgba(46,204,138,0.15)" : "none",
            }}
          >
            {loading ? <><span className="orbital-loader" style={{ borderTopColor: "#2ECC8A", width: 14, height: 14 }} /> Processing…</> : <><span>⚡</span> Run Import</>}
          </button>
        </div>

        {/* ── Loading indicator ── */}
        {loading && (
          <div style={{ background: "rgba(46,204,138,0.04)", border: "1px solid rgba(46,204,138,0.15)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="orbital-loader" style={{ borderTopColor: "#2ECC8A" }} />
              <span className="font-mono" style={{ fontSize: 11, color: "#2ECC8A" }}>Fetching discographies, computing VRS, extracting keywords…</span>
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: "#5E5A57" }}>
              This may take a few minutes for large batches. YouTube API calls are rate-limited.
            </div>
          </div>
        )}

        {/* ── Summary ── */}
        {summary && (
          <div>
            {/* Stats row */}
            <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              {[
                { label: "Videos Indexed",   value: summary.addedEntries,   color: "#2ECC8A" },
                { label: "Pool Total",        value: summary.totalEntries,   color: "#60A5FA" },
                { label: "Keywords Extracted",value: summary.keywordsAdded,  color: "#A78BFA" },
                { label: "Hashtags Found",    value: summary.hashtagsAdded,  color: "#F59E0B" },
                { label: "History Entries",   value: summary.historySaved,   color: "#06B6D4" },
                { label: "Keyword Bank Size", value: summary.totalKeywords,  color: "#E879F9" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${color}20`, borderRadius: 8, padding: "10px 12px" }}>
                  <div className="font-mono" style={{ fontSize: 8, color: "#5E5A57", letterSpacing: "0.12em", marginBottom: 3 }}>{label.toUpperCase()}</div>
                  <div className="font-mono font-bold" style={{ fontSize: 18, color, textShadow: `0 0 10px ${color}88` }}>{typeof value === "number" && value >= 1000 ? `${(value/1000).toFixed(1)}K` : value}</div>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div className="flex items-center gap-4 mb-3 font-mono" style={{ fontSize: 10 }}>
              {[
                { label: "Indexed",  count: okCount,      color: "#2ECC8A" },
                { label: "Skipped",  count: skippedCount, color: "#6B6860" },
                { label: "Stubs",    count: stubCount,     color: "#60A5FA" },
                { label: "Errors",   count: errorCount,   color: "#FF4D6A" },
              ].map(({ label, count, color }) => count > 0 && (
                <div key={label} className="flex items-center gap-1.5">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
                  <span style={{ color }}>{count} {label}</span>
                </div>
              ))}
            </div>

            {/* Per-URL results */}
            <div className="space-y-1.5" style={{ maxHeight: 320, overflowY: "auto" }}>
              {summary.results.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.2)", border: `1px solid rgba(255,255,255,0.05)` }}>
                  {/* Status icon */}
                  <span className="font-mono font-bold shrink-0" style={{ fontSize: 11, color: STATUS_COLORS[r.status], marginTop: 1 }}>{STATUS_ICONS[r.status]}</span>

                  {/* Platform badge */}
                  <span className="font-mono shrink-0" style={{ fontSize: 8, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 4, marginTop: 2,
                    background: `${PLATFORM_COLORS[r.platform as keyof typeof PLATFORM_COLORS] ?? "#606060"}18`,
                    border: `1px solid ${PLATFORM_COLORS[r.platform as keyof typeof PLATFORM_COLORS] ?? "#606060"}30`,
                    color: PLATFORM_COLORS[r.platform as keyof typeof PLATFORM_COLORS] ?? "#9E9C97",
                  }}>
                    {r.platform.toUpperCase().replace("YOUTUBE", "YT")}
                  </span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 12, color: "#B8B6B1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.channelName && <span style={{ color: "#E8E6E1", fontWeight: 600 }}>{r.channelName} · </span>}
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6B6860" }}>{r.url.length > 60 ? r.url.slice(0, 60) + "…" : r.url}</span>
                    </div>
                    <div className="font-mono" style={{ fontSize: 9, color: STATUS_COLORS[r.status], marginTop: 2 }}>{r.message}</div>
                  </div>

                  {/* Per-result stats */}
                  {r.status === "ok" && (
                    <div className="flex gap-3 shrink-0">
                      {r.videoCount !== undefined && (
                        <div className="text-right">
                          <div className="font-mono" style={{ fontSize: 8, color: "#5E5A57" }}>VIDEOS</div>
                          <div className="font-mono font-bold" style={{ fontSize: 11, color: "#2ECC8A" }}>{r.videoCount}</div>
                        </div>
                      )}
                      {r.avgVRS !== undefined && r.avgVRS > 0 && (
                        <div className="text-right">
                          <div className="font-mono" style={{ fontSize: 8, color: "#5E5A57" }}>AVG VRS</div>
                          <div className="font-mono font-bold" style={{ fontSize: 11, color: "#A78BFA" }}>{r.avgVRS}</div>
                        </div>
                      )}
                      {r.keywordsAdded !== undefined && r.keywordsAdded > 0 && (
                        <div className="text-right">
                          <div className="font-mono" style={{ fontSize: 8, color: "#5E5A57" }}>KEYWORDS</div>
                          <div className="font-mono font-bold" style={{ fontSize: 11, color: "#F59E0B" }}>+{r.keywordsAdded}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
