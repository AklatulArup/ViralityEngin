"use client";

import { useMemo } from "react";
import { forecastViews, detectPlatform } from "@/lib/view-forecast";
import { formatNumber } from "@/lib/formatters";
import type { EnrichedVideo } from "@/lib/types";

interface ViewForecastPanelProps {
  video: EnrichedVideo;
  forecastDate: string; // ISO date string from date input
  onDateChange: (date: string) => void;
}

export default function ViewForecastPanel({
  video,
  forecastDate,
  onDateChange,
}: ViewForecastPanelProps) {
  const platform = detectPlatform(video);

  const forecast = useMemo(() => {
    if (!forecastDate) return null;
    const target = new Date(forecastDate + "T12:00:00");
    if (isNaN(target.getTime())) return null;
    return forecastViews(video.views, video.publishedAt, platform, target);
  }, [video, forecastDate, platform]);

  // Min date = today, sensible max = 2 years out
  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 730 * 86400000).toISOString().split("T")[0];

  const confidenceColor = {
    high: "var(--color-vrs-excellent)",
    medium: "var(--color-mode-e)",
    low: "var(--color-vrs-rework)",
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">View Forecast</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "#86868b" }}>
            {forecast?.platformLabel || "Select a target date"} · based on{" "}
            {forecast ? `${forecast.daysSincePublish}d of data` : "publish history"}
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="forecast-date"
            className="text-[11px] font-medium"
            style={{ color: "#86868b" }}
          >
            Target date
          </label>
          <input
            id="forecast-date"
            type="date"
            value={forecastDate}
            min={today}
            max={maxDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[12px] font-mono outline-none cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f5f5f7",
              colorScheme: "dark",
            }}
          />
        </div>
      </div>

      {forecast ? (
        <>
          {/* Days info */}
          <div className="text-[11px] mb-4" style={{ color: "#86868b" }}>
            Day{" "}
            <span className="font-mono" style={{ color: "#f5f5f7" }}>
              {forecast.daysToTarget}
            </span>{" "}
            after publish
            {forecast.daysToTarget > forecast.daysSincePublish && (
              <>
                {" · "}
                <span className="font-mono" style={{ color: "var(--color-accent)" }}>
                  +{forecast.daysToTarget - forecast.daysSincePublish}d from now
                </span>
              </>
            )}
          </div>

          {/* View range cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Low", value: forecast.low, color: "#86868b", opacity: 0.7 },
              { label: "Mid", value: forecast.mid, color: "var(--color-accent)", opacity: 1 },
              { label: "High", value: forecast.high, color: "var(--color-mode-e)", opacity: 0.9 },
            ].map(({ label, value, color, opacity }) => (
              <div
                key={label}
                className="rounded-xl p-4 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  opacity,
                }}
              >
                <div
                  className="text-[9px] font-medium uppercase tracking-widest mb-1"
                  style={{ color: "#86868b" }}
                >
                  {label}
                </div>
                <div
                  className="text-[22px] font-bold tracking-tight"
                  style={{ color }}
                >
                  {formatNumber(value)}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar — current vs forecast */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]" style={{ color: "#86868b" }}>
              <span>Now — {formatNumber(video.views)}</span>
              <span>
                Confidence:{" "}
                <span
                  style={{ color: confidenceColor[forecast.confidence] }}
                  className="font-medium"
                >
                  {forecast.confidence}
                </span>
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (video.views / forecast.mid) * 100)}%`,
                  background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-blue))",
                }}
              />
            </div>
            <div className="text-[9px]" style={{ color: "#86868b" }}>
              Currently at{" "}
              {forecast.mid > 0
                ? Math.round((video.views / forecast.mid) * 100)
                : 0}
              % of mid forecast
            </div>
          </div>
        </>
      ) : (
        <div
          className="text-center py-8 text-[12px]"
          style={{ color: "#86868b" }}
        >
          Pick a future date above to see the view prediction
        </div>
      )}
    </div>
  );
}
