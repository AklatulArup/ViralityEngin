"use client";

import { useEffect, useState } from "react";
import type { CalibrationReport, LearningAdjustment } from "@/lib/forecast-learning";
import type { Platform } from "@/lib/forecast";

interface CalibrationData {
  ok:            boolean;
  reason?:       string;
  message?:      string;
  report?:       CalibrationReport;
  suggestions?:  LearningAdjustment[];
  byPlatform?:   Array<{ platform: Platform; report: CalibrationReport }> | null;
  sampleSize?:   number;
  withOutcomes?: number;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  youtube:       "YouTube Long-Form",
  youtube_short: "YouTube Shorts",
  tiktok:        "TikTok",
  instagram:     "Instagram Reels",
  x:             "X (Twitter)",
};

export default function CalibrationPage() {
  const [data, setData]       = useState<CalibrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forecast/calibration")
      .then(r => r.json())
      .then((d: CalibrationData) => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) {
    return <PageShell><div style={{ color: "#6B6964" }}>Loading calibration data…</div></PageShell>;
  }

  if (!data?.ok) {
    return (
      <PageShell>
        <div style={warningStyle}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#FF6B7A", marginBottom: 6 }}>Calibration unavailable</div>
          <div style={{ fontSize: 12.5, color: "#A8A6A1", lineHeight: 1.55 }}>
            {data?.message ?? "Unknown error loading calibration data."}
          </div>
        </div>
      </PageShell>
    );
  }

  const { report, suggestions, byPlatform, sampleSize, withOutcomes } = data;

  return (
    <PageShell>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "#E8E6E1", marginBottom: 6 }}>
          Forecast accuracy calibration
        </h1>
        <p style={{ fontSize: 13, color: "#A8A6A1", lineHeight: 1.55 }}>
          Every forecast the engine makes is stored here. As videos mature we re-scrape
          the actual view counts and compute error metrics. Auto-tuning suggestions appear
          once we have at least 20 samples per platform.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        <HeadlineMetric label="Total snapshots"   value={(sampleSize ?? 0).toLocaleString()} />
        <HeadlineMetric label="With outcomes"     value={(withOutcomes ?? 0).toLocaleString()} />
        <HeadlineMetric label="Median error"      value={report && report.sampleSize > 0 ? `${(report.medianAPE * 100).toFixed(1)}%` : "—"} color="#60A5FA" />
        <HeadlineMetric label="Interval coverage" value={report && report.sampleSize > 0 ? `${(report.coverage * 100).toFixed(0)}%` : "—"} color="#A78BFA" />
      </div>

      {suggestions && suggestions.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SectionHeading>Tuning suggestions</SectionHeading>
          <div style={{ fontSize: 12, color: "#A8A6A1", marginBottom: 12 }}>
            The engine proposes these parameter changes based on observed bias. Review and apply selectively.
          </div>
          {suggestions.map((s, i) => (
            <div key={i} style={suggestionStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#FFD54F" }}>
                  {PLATFORM_LABELS[s.platform]} — {s.parameter}
                </div>
                <div style={{ fontSize: 11, color: "#8A8883", fontFamily: "IBM Plex Mono, monospace" }}>
                  {s.deltaPercent > 0 ? "+" : ""}{s.deltaPercent}% · {s.confidence} conf · n={s.sampleSize}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#A8A6A1", lineHeight: 1.55 }}>
                {s.rationale}
              </div>
            </div>
          ))}
        </section>
      )}

      <section style={{ marginBottom: 28 }}>
        <SectionHeading>By platform</SectionHeading>
        {byPlatform && byPlatform.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {byPlatform.map(({ platform, report: r }) => (
              <PlatformCard key={platform} platform={platform} report={r} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "#6B6964", fontStyle: "italic" }}>No data yet.</div>
        )}
      </section>

      {report && report.byScoreBand && report.byScoreBand.length > 0 && report.sampleSize > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SectionHeading>Error by score band</SectionHeading>
          <div style={{ fontSize: 11, color: "#6B6964", marginBottom: 10 }}>Median absolute percentage error across score ranges. Flat is good; big swings suggest the score → multiplier curve is miscalibrated.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {report.byScoreBand.map((b, i) => (
              <BandCard key={i} label={`Score ${b.min}–${b.max}`} n={b.n} mdape={b.medianAPE} />
            ))}
          </div>
        </section>
      )}

      {report && report.byAgeBand && report.byAgeBand.length > 0 && report.sampleSize > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SectionHeading>Error by age at forecast time</SectionHeading>
          <div style={{ fontSize: 11, color: "#6B6964", marginBottom: 10 }}>How accurate we are at different stages of a post's life. Younger posts should have higher error; that's normal.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {report.byAgeBand.map((b, i) => (
              <BandCard key={i} label={ageLabel(b.min, b.max)} n={b.n} mdape={b.medianAPE} />
            ))}
          </div>
        </section>
      )}

      {report && report.worstPredictions && report.worstPredictions.length > 0 && (
        <section>
          <SectionHeading>Worst 5 predictions</SectionHeading>
          <div style={{ fontSize: 11, color: "#6B6964", marginBottom: 10 }}>For debugging. These are the snapshots where our prediction was furthest off.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {report.worstPredictions.map((w, i) => (
              <div key={w.id} style={worstRowStyle}>
                <div style={{ fontSize: 11, color: "#6B6964", fontFamily: "IBM Plex Mono, monospace", minWidth: 24 }}>#{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#E8E6E1" }}>
                    Predicted <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#A78BFA" }}>{w.predictedMedian.toLocaleString()}</span>
                    <span style={{ color: "#6B6964" }}> → actual </span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "#2ECC8A" }}>{w.actualViews.toLocaleString()}</span>
                  </div>
                  {w.videoUrl && (
                    <a href={w.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: "#60A5FA", fontFamily: "IBM Plex Mono, monospace" }}>
                      {w.videoUrl}
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#FF6B7A", fontFamily: "IBM Plex Mono, monospace" }}>
                  {(w.apeError * 100).toFixed(0)}% off
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A08", color: "#E8E6E1", padding: "32px 48px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 10, color: "#6B6964", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{children}</h2>
  );
}

function HeadlineMetric({ label, value, color = "#E8E6E1" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 10.5, color: "#6B6964", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color, fontFamily: "IBM Plex Mono, monospace" }}>{value}</div>
    </div>
  );
}

function PlatformCard({ platform, report }: { platform: Platform; report: CalibrationReport }) {
  const hasData = report.sampleSize > 0;
  const mdapeColor =
    !hasData            ? "#6B6964" :
    report.medianAPE < 0.20 ? "#2ECC8A" :
    report.medianAPE < 0.35 ? "#60A5FA" :
    report.medianAPE < 0.50 ? "#F59E0B" :
                              "#FF6B7A";

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#E8E6E1", marginBottom: 10 }}>{PLATFORM_LABELS[platform]}</div>
      {hasData ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, fontFamily: "IBM Plex Mono, monospace" }}>
          <Row label="Samples"   value={report.sampleSize.toString()} />
          <Row label="MdAPE"     value={`${(report.medianAPE * 100).toFixed(1)}%`} valueColor={mdapeColor} />
          <Row label="Coverage"  value={`${(report.coverage * 100).toFixed(0)}%`} />
          <Row label="Direction" value={`${(report.directionCorrect * 100).toFixed(0)}%`} />
          <Row label="Bias"      value={`${report.meanSignedError > 0 ? "+" : ""}${(report.meanSignedError * 100).toFixed(0)}%`} />
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: "#6B6964", fontStyle: "italic" }}>No matured samples yet</div>
      )}
    </div>
  );
}

function BandCard({ label, n, mdape }: { label: string; n: number; mdape: number }) {
  const hasData = n > 0;
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 10, color: "#6B6964", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: hasData ? "#E8E6E1" : "#6B6964", fontFamily: "IBM Plex Mono, monospace" }}>
        {hasData ? `${(mdape * 100).toFixed(0)}%` : "—"}
      </div>
      <div style={{ fontSize: 10.5, color: "#6B6964", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>n={n}</div>
    </div>
  );
}

function Row({ label, value, valueColor = "#E8E6E1" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#6B6964" }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── STYLES / HELPERS ────────────────────────────────────────────────────

function ageLabel(min: number, max: number): string {
  if (max === Infinity)  return `${min}d+`;
  if (min === 0 && max === 1) return "0–1d";
  return `${min}–${max}d`;
}

const warningStyle: React.CSSProperties = {
  background: "rgba(255,107,122,0.06)",
  border: "1px solid rgba(255,107,122,0.25)",
  borderRadius: 10,
  padding: "16px 18px",
};

const suggestionStyle: React.CSSProperties = {
  background: "rgba(255,213,79,0.04)",
  border: "1px solid rgba(255,213,79,0.2)",
  borderLeft: "3px solid #FFD54F",
  borderRadius: 8,
  padding: "12px 14px",
  marginBottom: 8,
};

const worstRowStyle: React.CSSProperties = {
  background: "rgba(255,107,122,0.03)",
  border: "1px solid rgba(255,107,122,0.12)",
  borderRadius: 6,
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  gap: 12,
};
