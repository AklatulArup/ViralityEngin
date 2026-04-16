"use client";

import { useState, useMemo } from "react";
import { formatNumber } from "@/lib/formatters";
import type { ReferenceStore } from "@/lib/types";

interface HistoryEntry {
  id: string;
  url: string;
  platform: string;
  title: string;
  channelName: string;
  checkedAt: string;
  firstCheckedAt?: string;
  metrics: Record<string, number | string>;
  previousSnapshot?: { checkedAt: string; metrics: Record<string, number | string> };
}

interface DayData {
  date: string;
  videos: {
    title: string;
    channel: string;
    platform: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement: number;
    vrsScore: number;
    velocity: number;
    url: string;
  }[];
  totalViews: number;
  avgVRS: number;
  avgEngagement: number;
}

interface HistoryCalendarProps {
  history: HistoryEntry[];
  referenceStore?: ReferenceStore | null;
  onVideoClick: (url: string) => void;
}

const PLATFORM_COLOR: Record<string, string> = {
  youtube: "#EF4444",
  tiktok: "#06B6D4",
  instagram: "#E1306C",
  "youtube_short": "#EC4899",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function HistoryCalendar({ history, referenceStore, onVideoClick }: HistoryCalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState("all");

  // Build day map from both history entries AND reference store
  const dayMap = useMemo<Record<string, DayData>>(() => {
    const map: Record<string, DayData> = {};

    function addEntry(
      date: string, title: string, channel: string, platform: string,
      views: number, likes: number, comments: number, shares: number,
      engagement: number, vrsScore: number, velocity: number, url: string
    ) {
      if (!date || date.length < 10) return;
      const d = date.slice(0, 10);
      if (!map[d]) map[d] = { date: d, videos: [], totalViews: 0, avgVRS: 0, avgEngagement: 0 };
      map[d].videos.push({ title, channel, platform, views, likes, comments, shares, engagement, vrsScore, velocity, url });
      map[d].totalViews += views;
    }

    // From analysis history (tracked re-checks)
    for (const h of history) {
      const m = h.metrics;
      const date = h.firstCheckedAt ?? h.checkedAt;
      addEntry(
        date, h.title, h.channelName, h.platform,
        Number(m.views ?? 0), Number(m.likes ?? 0), Number(m.comments ?? 0), Number(m.shares ?? 0),
        Number(m.engagement ?? 0), Number(m.vrsScore ?? 0), Number(m.velocity ?? 0),
        h.url
      );
    }

    // From reference store (video publish dates)
    const entries = referenceStore?.entries ?? [];
    for (const e of entries) {
      if (e.type !== "video") continue;
      const m = e.metrics ?? {};
      const pub = ((m as Record<string, unknown>).publishedAt as string | undefined) ?? e.analyzedAt ?? "";
      const date = pub.slice(0, 10);
      const url = e.platform === "youtube"
        ? `https://www.youtube.com/watch?v=${e.id}`
        : `https://www.tiktok.com/@${e.channelName}/video/${e.id}`;
      addEntry(
        date, e.name, e.channelName, e.platform,
        Number(m.views ?? 0), Number((m as Record<string,unknown>).likes ?? 0),
        Number((m as Record<string,unknown>).comments ?? 0), Number((m as Record<string,unknown>).shares ?? 0),
        Number(m.engagement ?? 0), Number(m.vrsScore ?? 0), Number(m.velocity ?? 0),
        url
      );
    }

    // Compute averages per day
    for (const d of Object.values(map)) {
      const n = d.videos.length;
      if (n > 0) {
        d.avgVRS = Math.round(d.videos.reduce((s, v) => s + v.vrsScore, 0) / n);
        d.avgEngagement = parseFloat((d.videos.reduce((s, v) => s + v.engagement, 0) / n).toFixed(1));
      }
    }

    return map;
  }, [history, referenceStore]);

  // All unique channels for filter
  const allChannels = useMemo(() => {
    const s = new Set<string>();
    Object.values(dayMap).forEach(d => d.videos.forEach(v => s.add(v.channel)));
    return ["all", ...Array.from(s).sort()];
  }, [dayMap]);

  // Calendar grid for current month
  const { year, month } = viewDate;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => setViewDate(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 });
  const nextMonth = () => setViewDate(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 });

  // Selected day data (filtered)
  const selectedDay = selected ? dayMap[selected] : null;
  const filteredVideos = selectedDay?.videos.filter(v =>
    filterChannel === "all" || v.channel === filterChannel
  ) ?? [];

  // Heat scale for day cells
  function heatColor(views: number): string {
    if (views >= 500000) return "#FF4D6A";
    if (views >= 100000) return "#F59E0B";
    if (views >= 50000)  return "#60A5FA";
    if (views >= 10000)  return "#2ECC8A";
    if (views >= 1000)   return "#A78BFA";
    if (views > 0)       return "#4A4845";
    return "transparent";
  }

  // Monthly totals for summary strip
  const monthDays = Object.entries(dayMap)
    .filter(([d]) => {
      const dt = new Date(d);
      return dt.getFullYear() === year && dt.getMonth() === month;
    });
  const monthTotalViews = monthDays.reduce((s, [,d]) => s + d.totalViews, 0);
  const monthTotalVideos = monthDays.reduce((s, [,d]) => s + d.videos.length, 0);
  const monthAvgVRS = monthDays.length > 0
    ? Math.round(monthDays.reduce((s, [,d]) => s + d.avgVRS, 0) / monthDays.length)
    : 0;

  return (
    <div className="glass-card" style={{ overflow: "hidden" }}>
      <div style={{ height: 2, background: "linear-gradient(90deg,transparent,#60A5FA,#2ECC8A,transparent)" }} />
      <div style={{ padding: "20px 24px" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8E6E1", marginBottom: 3 }}>Historical Data Calendar</h3>
            <p className="font-mono" style={{ fontSize: 9, color: "#5E5A57", letterSpacing: "0.08em" }}>
              {Object.keys(dayMap).length} DAYS WITH DATA · {Object.values(dayMap).reduce((s,d)=>s+d.videos.length,0).toLocaleString()} VIDEOS TRACKED
            </p>
          </div>
          {/* Channel filter */}
          <select
            value={filterChannel}
            onChange={e => setFilterChannel(e.target.value)}
            style={{
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "#E8E6E1", fontSize: 11, padding: "5px 10px",
              fontFamily: "var(--font-mono)", cursor: "pointer", maxWidth: 200,
            }}
          >
            {allChannels.slice(0, 50).map(c => (
              <option key={c} value={c}>{c === "all" ? "All Channels" : c.slice(0, 30)}</option>
            ))}
          </select>
        </div>

        {/* ── Month navigation ── */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#9E9C97", fontSize: 13, width: 32, height: 32, cursor: "pointer" }}>‹</button>
          <div className="text-center">
            <div style={{ fontSize: 16, fontWeight: 700, color: "#E8E6E1" }}>{MONTHS[month]} {year}</div>
            <div className="font-mono" style={{ fontSize: 9, color: "#5E5A57", marginTop: 2 }}>
              {formatNumber(monthTotalViews)} views · {monthTotalVideos} videos · avg VRS {monthAvgVRS}
            </div>
          </div>
          <button onClick={nextMonth} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#9E9C97", fontSize: 13, width: 32, height: 32, cursor: "pointer" }}>›</button>
        </div>

        {/* ── Calendar grid ── */}
        <div style={{ marginBottom: 20 }}>
          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
            {DAYS.map(d => (
              <div key={d} className="font-mono text-center" style={{ fontSize: 8, color: "#5E5A57", letterSpacing: "0.1em", padding: "4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
            {/* Empty cells before month start */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} style={{ height: 64, borderRadius: 6 }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum  = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayData = dayMap[dateStr];
              const filtered = dayData?.videos.filter(v => filterChannel === "all" || v.channel === filterChannel);
              const hasData  = filtered && filtered.length > 0;
              const totalV   = filtered?.reduce((s, v) => s + v.views, 0) ?? 0;
              const heat     = heatColor(totalV);
              const isToday  = dateStr === today.toISOString().slice(0, 10);
              const isSelected = selected === dateStr;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  style={{
                    height: 64, borderRadius: 7, cursor: hasData ? "pointer" : "default",
                    background: isSelected
                      ? `${heat === "transparent" ? "rgba(255,255,255,0.08)" : heat}22`
                      : hasData ? `${heat}10` : "rgba(255,255,255,0.02)",
                    border: isSelected
                      ? `1.5px solid ${heat === "transparent" ? "rgba(255,255,255,0.3)" : heat}`
                      : isToday
                        ? "1.5px solid rgba(255,255,255,0.25)"
                        : hasData
                          ? `1px solid ${heat}35`
                          : "1px solid rgba(255,255,255,0.04)",
                    transition: "all 0.15s",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 3, padding: 4, position: "relative", overflow: "hidden",
                  }}
                >
                  {/* Date number */}
                  <span className="font-mono" style={{
                    fontSize: 11, fontWeight: isToday ? 700 : 500,
                    color: isToday ? "#E8E6E1" : hasData ? "#C8C6C1" : "#3A3835",
                  }}>{dayNum}</span>

                  {/* Heat dot + video count */}
                  {hasData && (
                    <>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: heat, boxShadow: `0 0 6px ${heat}`,
                      }} />
                      <span className="font-mono" style={{ fontSize: 8, color: heat, fontWeight: 600 }}>
                        {formatNumber(totalV)}
                      </span>
                    </>
                  )}

                  {/* Platform dots */}
                  {hasData && (
                    <div className="flex gap-0.5">
                      {[...new Set(filtered!.map(v => v.platform))].slice(0, 4).map(p => (
                        <div key={p} style={{ width: 3, height: 3, borderRadius: "50%", background: PLATFORM_COLOR[p] ?? "#6B6860" }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Heat legend ── */}
        <div className="flex items-center gap-4 mb-5">
          <span className="font-mono" style={{ fontSize: 8, color: "#5E5A57", letterSpacing: "0.1em" }}>HEAT SCALE</span>
          {[
            { label: "0", color: "#4A4845" },
            { label: "1K+", color: "#A78BFA" },
            { label: "10K+", color: "#2ECC8A" },
            { label: "50K+", color: "#60A5FA" },
            { label: "100K+", color: "#F59E0B" },
            { label: "500K+", color: "#FF4D6A" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span className="font-mono" style={{ fontSize: 8, color: "#5E5A57" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Selected day detail ── */}
        {selected && (
          <div style={{
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, overflow: "hidden",
          }}>
            {/* Day header */}
            <div className="flex items-center justify-between" style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8E6E1" }}>
                  {new Date(selected + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </div>
                <div className="font-mono" style={{ fontSize: 9, color: "#5E5A57", marginTop: 2 }}>
                  {filteredVideos.length} VIDEO{filteredVideos.length !== 1 ? "S" : ""} ·{" "}
                  {formatNumber(filteredVideos.reduce((s, v) => s + v.views, 0))} TOTAL VIEWS
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#5E5A57", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>

            {/* Summary chips */}
            {filteredVideos.length > 0 && (
              <div className="flex flex-wrap gap-2" style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {[
                  { label: "TOTAL VIEWS",   value: formatNumber(filteredVideos.reduce((s,v)=>s+v.views,0)),      color: "#2ECC8A" },
                  { label: "TOTAL LIKES",   value: formatNumber(filteredVideos.reduce((s,v)=>s+(v.likes||0),0)), color: "#60A5FA" },
                  { label: "TOTAL COMMENTS",value: formatNumber(filteredVideos.reduce((s,v)=>s+(v.comments||0),0)), color: "#A78BFA" },
                  { label: "TOTAL SHARES",  value: formatNumber(filteredVideos.reduce((s,v)=>s+(v.shares||0),0)), color: "#F59E0B" },
                  { label: "AVG ENGAGEMENT",value: `${(filteredVideos.reduce((s,v)=>s+v.engagement,0)/filteredVideos.length).toFixed(1)}%`, color: "#E879F9" },
                  { label: "AVG VRS",       value: `${Math.round(filteredVideos.reduce((s,v)=>s+v.vrsScore,0)/filteredVideos.length)}/100`, color: "#FF4D6A" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 7, padding: "5px 10px" }}>
                    <div className="font-mono" style={{ fontSize: 7, color: "#5E5A57", letterSpacing: "0.1em" }}>{label}</div>
                    <div className="font-mono font-bold" style={{ fontSize: 13, color }}>{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Video list */}
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {filteredVideos.length === 0 ? (
                <div className="font-mono" style={{ padding: "20px", fontSize: 11, color: "#5E5A57", textAlign: "center" }}>
                  No videos for this channel on this day
                </div>
              ) : (
                filteredVideos
                  .sort((a, b) => b.views - a.views)
                  .map((v, i) => (
                    <button
                      key={i}
                      onClick={() => { if (v.url) onVideoClick(v.url); }}
                      className="w-full text-left"
                      style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: "transparent", border: "none", cursor: v.url ? "pointer" : "default",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { if (v.url) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Platform dot */}
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: PLATFORM_COLOR[v.platform] ?? "#6B6860", marginTop: 4, flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#D8D6D1", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {v.title}
                          </div>
                          <div className="font-mono" style={{ fontSize: 9, color: "#6B6860", marginBottom: 6 }}>{v.channel}</div>
                          {/* Metrics row */}
                          <div className="flex flex-wrap gap-3">
                            {[
                              { label: "Views",      value: formatNumber(v.views),              color: "#2ECC8A" },
                              { label: "Likes",      value: v.likes ? formatNumber(v.likes) : "—", color: "#60A5FA" },
                              { label: "Comments",   value: v.comments ? formatNumber(v.comments) : "—", color: "#A78BFA" },
                              { label: "Shares",     value: v.shares ? formatNumber(v.shares) : "—", color: "#F59E0B" },
                              { label: "Engagement", value: `${v.engagement.toFixed(1)}%`,       color: "#E879F9" },
                              { label: "VRS",        value: `${v.vrsScore}/100`,                 color: "#FF4D6A" },
                              { label: "Velocity",   value: v.velocity ? `${formatNumber(v.velocity)}/d` : "—", color: "#06B6D4" },
                            ].map(({ label, value, color }) => (
                              <div key={label} className="flex items-center gap-1">
                                <span className="font-mono" style={{ fontSize: 9, color: "#5E5A57" }}>{label}:</span>
                                <span className="font-mono font-bold" style={{ fontSize: 10, color }}>{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
