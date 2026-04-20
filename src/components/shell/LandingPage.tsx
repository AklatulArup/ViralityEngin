"use client";

// ═══════════════════════════════════════════════════════════════════════════
// LANDING PAGE — V5 data-dense two-column, live-refreshing pool coverage
// ═══════════════════════════════════════════════════════════════════════════
//
// Main column: redesigned Pool Coverage panel (header with live total +
// last-ingested timestamp, three coverage bars, platform table sorted by
// count) + Live Signal Feed. Right rail: total reach, per-platform bars,
// next milestone, learning loop stats, last ingestions.
//
// Data comes from `/api/reference-store` and flows through `computePoolStats`
// (src/lib/pool-stats.ts) — the same bucketer the Sidebar uses, so the two
// surfaces are guaranteed to agree.

import React, { useEffect, useMemo, useState } from "react";
import { T, PLATFORMS } from "@/lib/design-tokens";
import { computePoolStats, type MinimalEntry, type PlatformRow } from "@/lib/pool-stats";
import type { Platform } from "@/lib/forecast";

export default function LandingPage() {
  const [entries, setEntries] = useState<MinimalEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => {
      fetch("/api/reference-store")
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          const arr: MinimalEntry[] = Array.isArray(d?.entries) ? d.entries : Array.isArray(d) ? d : [];
          setEntries(arr);
        })
        .catch(() => {});
    };
    refresh();
    // Live refresh: legacy Dashboard fires ve:pool-updated after every
    // successful analyze / bulk import / reference-store POST.
    window.addEventListener("ve:pool-updated", refresh);
    return () => window.removeEventListener("ve:pool-updated", refresh);
  }, []);

  const stats = useMemo(() => computePoolStats(entries), [entries]);

  const signals = useMemo(() => {
    const hasEntries = entries.length > 0;
    const vrs = entries.map(e => Number(e.metrics?.vrsScore ?? 0)).filter(v => v > 0);
    const avgVRS = vrs.length > 0 ? vrs.reduce((s, v) => s + v, 0) / vrs.length : 0;
    const eng = entries.map(e => Number(e.metrics?.engagement ?? 0)).filter(v => v > 0);
    const avgEng = eng.length > 0 ? eng.reduce((s, v) => s + v, 0) / eng.length : 0;
    const highVRS = entries.filter(e => Number(e.metrics?.vrsScore ?? 0) >= 80).length;
    const totalViews = entries.reduce((s, e) => s + Number(e.metrics?.views ?? 0), 0);
    return [
      { label: "Pool depth",              value: `${fmtCompact(stats.totalEntries)} items`,                                      color: T.red,    active: hasEntries },
      { label: "Unique creators",         value: `${fmtCompact(stats.totalCreators)}`,                                            color: T.red,    active: stats.totalCreators > 0 },
      { label: "Total reach",             value: totalViews > 0 ? `${fmtCompact(totalViews)} views` : "—",                       color: T.purple, active: totalViews > 0 },
      { label: "Avg VRS",                 value: avgVRS > 0 ? `${avgVRS.toFixed(0)}/100` : "—",                                  color: T.amber,  active: avgVRS >= 60 },
      { label: "Avg engagement",          value: avgEng > 0 ? `${avgEng.toFixed(1)}%` : "—",                                     color: T.amber,  active: avgEng > 0 },
      { label: "High-VRS content (≥80)",  value: `${highVRS} videos`,                                                             color: T.green,  active: highVRS > 0 },
    ];
  }, [entries, stats]);

  // 5 most recent ingestions for the right-rail feed.
  const recent = useMemo(() => {
    return [...entries]
      .filter(e => typeof e.analyzedAt === "string")
      .sort((a, b) => (b.analyzedAt ?? "").localeCompare(a.analyzedAt ?? ""))
      .slice(0, 5);
  }, [entries]);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 320px",
      height: "100%", color: T.ink, fontFamily: "IBM Plex Sans, sans-serif",
    }}>
      {/* ── MAIN ────────────────────────────────────────────────── */}
      <main style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 22, borderRight: `1px solid ${T.line}`, overflowY: "auto" }}>
        <PoolCoverage stats={stats} />
        <LiveSignalFeed signals={signals} />
      </main>

      {/* ── RIGHT RAIL ──────────────────────────────────────────── */}
      <aside style={{ padding: "22px 22px", display: "flex", flexDirection: "column", gap: 22, background: T.bgDeep, overflowY: "auto" }}>
        <RailTotal entries={entries} stats={stats} />
        <RailPlatformBars rows={stats.rows} />
        <RailNextMilestone stats={stats} />
        <RailRecentIngestions recent={recent} />
        <RailLearningLoop />
      </aside>
    </div>
  );
}

// ─── POOL COVERAGE PANEL (main) ─────────────────────────────────────────

function PoolCoverage({ stats }: { stats: ReturnType<typeof computePoolStats> }) {
  const lastAgo = fmtAgo(stats.lastIngestedAt);
  const youtubeRow = stats.rows.find(r => r.id === "youtube");
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div>
          <V5SectionHeader>Pool coverage · learning accuracy</V5SectionHeader>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: T.green, letterSpacing: 1 }}>LIVE</span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.55, marginTop: -6 }}>
        Updates in real-time as you analyse content or bulk-import creators. The more entries the pool has, the more accurate the forecast engine becomes.
      </div>

      {/* Top row: big pool size + last ingested + skipped warning */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
        border: `1px solid ${T.line}`, borderRadius: 4, overflow: "hidden",
      }}>
        <V5Cell
          big
          label="Pool size"
          value={stats.totalEntries.toLocaleString()}
          sub={`${stats.totalCreators.toLocaleString()} creators · last added ${lastAgo}`}
          color={T.ink}
        />
        <V5Cell
          label="Long-form"
          value={stats.totalLong.toLocaleString()}
          sub="YT watch URLs"
          color={T.red}
        />
        <V5Cell
          label="Shorts"
          value={stats.totalShorts.toLocaleString()}
          sub="YT Shorts bucket"
          color={T.pink}
        />
        <V5Cell
          label="Other platforms"
          value={(stats.totalEntries - stats.totalLong - stats.totalShorts).toLocaleString()}
          sub="TikTok + IG + X"
          color={T.cyan}
        />
      </div>

      {/* Coverage targets */}
      <div>
        <V5SectionHeader>Coverage targets</V5SectionHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, border: `1px solid ${T.line}`, borderRadius: 4, padding: "14px 16px" }}>
          <CoverageBar label="Workable minimum" sub="engine functions"        color={T.amber} cur={stats.grand.current} target={stats.grand.min} />
          <CoverageBar label="Standard target"  sub="reliable benchmarking"   color={T.blue}  cur={stats.grand.current} target={stats.grand.std} />
          <CoverageBar label="Mature pool"      sub="niche-specific patterns" color={T.green} cur={stats.grand.current} target={stats.grand.mat} />
        </div>
      </div>

      {/* Per platform — one table, dense, sorted by count */}
      <div>
        <V5SectionHeader>Per platform — sorted by count</V5SectionHeader>
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 4, overflow: "hidden" }}>
          <div style={tableHeaderStyle}>
            <div>Platform</div>
            <div style={{ textAlign: "right" }}>Videos</div>
            <div style={{ textAlign: "right" }}>Creators</div>
            <div style={{ textAlign: "right" }}>% of pool</div>
            <div>Status</div>
            <div>Progress</div>
            <div style={{ textAlign: "right" }}>Next</div>
          </div>
          {stats.rows.map((row, i) => (
            <PlatformTableRow
              key={row.id} row={row}
              last={i === stats.rows.length - 1}
            />
          ))}
          {stats.skipped > 0 && (
            <div style={{
              padding: "8px 12px", fontFamily: "IBM Plex Mono, monospace",
              fontSize: 10, color: T.inkFaint,
              background: T.bgRow, borderTop: `1px solid ${T.line}`,
            }}>
              {stats.skipped} entr{stats.skipped === 1 ? "y" : "ies"} skipped — missing platform field
            </div>
          )}
        </div>
        {youtubeRow && stats.totalShorts > 0 && (
          <div style={{
            fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: T.inkFaint,
            marginTop: 6, lineHeight: 1.55,
          }}>
            YouTube is split by format: long-form (watch URLs) vs. shorts (videoFormat&nbsp;=&nbsp;&quot;short&quot;). Both count toward the YouTube coverage milestones.
          </div>
        )}
      </div>
    </section>
  );
}

// ─── LIVE SIGNAL FEED (main, below pool coverage) ──────────────────────

function LiveSignalFeed({ signals }: { signals: Array<{ label: string; value: string; color: string; active: boolean }> }) {
  return (
    <div>
      <V5SectionHeader>Live signal feed</V5SectionHeader>
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4 }}>
        {signals.map((s, i) => (
          <div
            key={i}
            style={{
              display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center",
              padding: "10px 14px",
              borderBottom: i < signals.length - 1 ? `1px solid ${T.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: s.color, opacity: s.active ? 1 : 0.3, flexShrink: 0 }} />
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: T.inkDim }}>{s.label}</span>
            </div>
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: s.active ? s.color : T.inkFaint }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PLATFORM TABLE ROW ───────────────────────────────────────────────

function PlatformTableRow({ row, last }: { row: PlatformRow; last: boolean }) {
  const pl = PLATFORMS[row.id];
  const remaining = row.nextTarget === null ? 0 : Math.max(0, row.nextTarget - row.count);
  const pctToNext = row.nextTarget === null ? 1 : Math.min(1, row.count / row.nextTarget);
  const statusColor =
    row.status === "mature"     ? T.green :
    row.status === "standard"   ? T.blue  :
    row.status === "functional" ? T.amber :
    row.status === "below-min"  ? T.amber :
                                   T.inkMuted;
  const statusText =
    row.status === "mature"     ? "mature" :
    row.status === "standard"   ? "standard" :
    row.status === "functional" ? "workable" :
    row.status === "below-min"  ? "below min" :
                                   "empty";
  const nextText =
    row.nextTarget === null ? "✓ mature" :
    remaining === 0         ? "✓"         :
                               `${fmtCompact(remaining)} to ${row.label ?? "next"}`;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "110px 70px 80px 70px 90px 1fr 120px",
      padding: "9px 12px", alignItems: "center",
      fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: T.inkDim,
      borderBottom: last ? "none" : `1px solid ${T.line}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: pl.color }} />
        <span style={{ color: pl.color, fontWeight: 600 }}>{pl.code}</span>
        <span style={{ color: T.inkFaint, fontSize: 10 }}>{pl.short}</span>
      </div>
      <div style={{ textAlign: "right", color: row.count > 0 ? T.ink : T.inkFaint }}>
        {row.count.toLocaleString()}
      </div>
      <div style={{ textAlign: "right" }}>{row.creators.toLocaleString()}</div>
      <div style={{ textAlign: "right" }}>
        {row.pct > 0 ? `${row.pct.toFixed(1)}%` : "—"}
      </div>
      <div style={{ color: statusColor }}>{statusText}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${pctToNext * 100}%`, height: "100%", background: pl.color, opacity: 0.7 }} />
        </div>
      </div>
      <div style={{ textAlign: "right", color: row.nextTarget === null ? T.green : T.inkFaint }}>
        {nextText}
      </div>
    </div>
  );
}

// ─── COVERAGE BAR (grand totals) ───────────────────────────────────────

function CoverageBar({ label, sub, color, cur, target }: { label: string; sub: string; color: string; cur: number; target: number }) {
  const pct = target > 0 ? Math.min(1, cur / target) : 0;
  const met = cur >= target;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: 99, background: color }} />
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: T.ink }}>{label}</span>
        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: T.inkFaint }}>· {sub}</span>
        <span style={{ marginLeft: "auto", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: met ? T.green : T.inkDim }}>
          {met && "✓ "}{cur.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, background: color, opacity: 0.8, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ─── RIGHT RAIL SECTIONS ───────────────────────────────────────────────

function RailTotal({ entries, stats }: { entries: MinimalEntry[]; stats: ReturnType<typeof computePoolStats> }) {
  const totalViews = entries.reduce((s, e) => s + Number(e.metrics?.views ?? 0), 0);
  return (
    <div>
      <V5SectionHeader>Total reach</V5SectionHeader>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 22, fontWeight: 300, color: T.ink, letterSpacing: -0.5 }}>
        {fmtCompact(totalViews)}
      </div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: T.inkFaint, marginTop: 3 }}>
        views across {stats.totalEntries.toLocaleString()} entries
      </div>
    </div>
  );
}

function RailPlatformBars({ rows }: { rows: PlatformRow[] }) {
  return (
    <div>
      <V5SectionHeader>Coverage · per platform</V5SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {rows.map(pl => {
          const plObj = PLATFORMS[pl.id];
          const pct = pl.count / Math.max(1, pl.mat);
          return (
            <div key={pl.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: plObj.color }} />
              <span style={{ flex: 1, color: T.inkMuted }}>{plObj.code}</span>
              <span style={{ color: T.inkFaint, width: 44, textAlign: "right" }}>{pl.count.toLocaleString()}</span>
              <div style={{ width: 36, height: 3, background: T.line, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, pct * 100)}%`, height: "100%", background: plObj.color, opacity: 0.7 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RailNextMilestone({ stats }: { stats: ReturnType<typeof computePoolStats> }) {
  const toMature = Math.max(0, stats.grand.mat - stats.totalEntries);
  const toStd    = Math.max(0, stats.grand.std - stats.totalEntries);
  const toMin    = Math.max(0, stats.grand.min - stats.totalEntries);
  const nextLabel =
    toMin > 0     ? { n: toMin,    label: "workable minimum", color: T.amber } :
    toStd > 0     ? { n: toStd,    label: "standard target",  color: T.blue  } :
                    { n: toMature, label: "mature pool",      color: T.green };
  return (
    <div>
      <V5SectionHeader>Next milestone</V5SectionHeader>
      <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>
        <span style={{ color: nextLabel.color }}>
          {nextLabel.n > 0 ? `${nextLabel.n.toLocaleString()} entries` : "✓ all milestones hit"}
        </span>
        {nextLabel.n > 0 && <> to <strong style={{ fontWeight: 500 }}>{nextLabel.label}</strong></>}
      </div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: T.inkFaint, marginTop: 5, lineHeight: 1.6 }}>
        Bulk-import or paste a URL to grow the pool — every analyzed creator adds their recent videos too.
      </div>
    </div>
  );
}

function RailRecentIngestions({ recent }: { recent: MinimalEntry[] }) {
  if (recent.length === 0) {
    return (
      <div>
        <V5SectionHeader>Last ingestions</V5SectionHeader>
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: T.inkFaint, fontStyle: "italic" }}>
          none yet — paste a URL to start
        </div>
      </div>
    );
  }
  return (
    <div>
      <V5SectionHeader>Last {recent.length} ingestions</V5SectionHeader>
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4 }}>
        {recent.map((e, i) => {
          const pl = e.platform && e.platform in PLATFORMS ? PLATFORMS[e.platform as Platform] : null;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px",
              borderBottom: i < recent.length - 1 ? `1px solid ${T.line}` : "none",
              fontFamily: "IBM Plex Mono, monospace", fontSize: 10,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: pl?.color ?? T.inkFaint, flexShrink: 0 }} />
              <span style={{ color: T.inkFaint, width: 44, flexShrink: 0 }}>{fmtAgo(e.analyzedAt ?? null)}</span>
              <span style={{ color: pl ? pl.color : T.inkMuted, width: 32, flexShrink: 0 }}>{pl?.code ?? "—"}</span>
              <span style={{
                flex: 1, color: T.inkDim,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {e.name || e.title || e.channelName || "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RailLearningLoop() {
  return (
    <div>
      <V5SectionHeader>Learning loop</V5SectionHeader>
      <div style={{ border: `1px solid ${T.line}`, borderRadius: 4 }}>
        {([
          ["MdAPE (30d rolling)",    "see /admin/calibration"],
          ["Coverage bias",          "—"],
          ["Conformal strata ready", "—"],
        ] as const).map((row, i, arr) => (
          <div
            key={i}
            style={{
              display: "flex", justifyContent: "space-between",
              padding: "8px 12px", fontFamily: "IBM Plex Mono, monospace", fontSize: 11,
              borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none",
            }}
          >
            <span style={{ color: T.inkDim }}>{row[0]}</span>
            <span style={{ color: T.ink }}>{row[1]}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 9.5, color: T.inkFaint, marginTop: 6 }}>
        populated once outcomes mature · /admin/calibration
      </div>
    </div>
  );
}

// ─── V5 PRIMITIVES + HELPERS ───────────────────────────────────────────

function V5SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "IBM Plex Mono, monospace", fontSize: 10,
      letterSpacing: 1.3, textTransform: "uppercase", color: T.inkFaint,
      marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${T.line}`,
    }}>{children}</div>
  );
}

function V5Cell({ label, value, sub, big, color }: { label: string; value: string; sub?: string; big?: boolean; color?: string }) {
  return (
    <div style={{
      padding: "14px 16px",
      borderRight: `1px solid ${T.line}`,
      background: big ? "rgba(255,255,255,0.018)" : "transparent",
    }}>
      <div style={{
        fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: 1.2,
        textTransform: "uppercase", color: T.inkFaint, marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: "IBM Plex Mono, monospace",
        fontSize: big ? 34 : 20, fontWeight: 300, letterSpacing: -0.5,
        color: color || T.ink, lineHeight: 1.1,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: "IBM Plex Mono, monospace", fontSize: 10,
          color: T.inkFaint, marginTop: 3,
        }}>{sub}</div>
      )}
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "110px 70px 80px 70px 90px 1fr 120px",
  padding: "8px 12px", background: T.bgRow,
  fontFamily: "IBM Plex Mono, monospace", fontSize: 9, letterSpacing: 1.2,
  textTransform: "uppercase", color: T.inkFaint,
  borderBottom: `1px solid ${T.line}`,
  alignItems: "center",
};

function fmtCompact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function fmtAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60)        return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60)        return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)         return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30)          return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12)         return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
