// /api/forecast/calibration
//
// GET — compute accuracy report from stored snapshots + outcomes
//
// Returns:
//   - Overall MdAPE / coverage / direction-accuracy per platform
//   - Breakdowns by score band and age band
//   - Worst predictions (for debugging)
//   - Tuning suggestions when sample size is sufficient

import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvListRange, isKvAvailable } from "@/lib/kv";
import { computeCalibrationFrom, suggestAdjustments, type ForecastSnapshot } from "@/lib/forecast-learning";
import type { Platform } from "@/lib/forecast";

export const runtime = "nodejs";
export const revalidate = 60;

const PLATFORMS: Platform[] = ["youtube", "youtube_short", "tiktok", "instagram", "x"];

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const requestedPlatform = url.searchParams.get("platform") as Platform | null;

    if (!isKvAvailable()) {
      return NextResponse.json({
        ok: false,
        reason: "kv_not_configured",
        message: "Upstash Redis env vars missing. Calibration requires persistent storage.",
      });
    }

    const snapshots = requestedPlatform
      ? await loadSnapshotsForPlatform(requestedPlatform)
      : await loadAllSnapshots();

    const report = computeCalibrationFrom(snapshots, requestedPlatform ?? undefined);
    const suggestions = suggestAdjustments(report);

    const byPlatform = requestedPlatform
      ? null
      : PLATFORMS.map((p) => ({
          platform: p,
          report: computeCalibrationFrom(snapshots.filter((s) => s.platform === p), p),
        }));

    return NextResponse.json({
      ok: true,
      report,
      suggestions,
      byPlatform,
      sampleSize: snapshots.length,
      withOutcomes: snapshots.filter((s) => s.outcomes.length > 0).length,
    });
  } catch (e) {
    console.error("[api/forecast/calibration] error:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function loadAllSnapshots(): Promise<ForecastSnapshot[]> {
  const ids = await kvListRange("snapshots:all", 0, -1);
  const snaps = await Promise.all(ids.map((id) => kvGet<ForecastSnapshot>(`snapshot:${id}`)));
  return snaps.filter((s): s is ForecastSnapshot => s !== null);
}

async function loadSnapshotsForPlatform(platform: Platform): Promise<ForecastSnapshot[]> {
  const ids = await kvListRange(`snapshots:by-platform:${platform}`, 0, -1);
  const snaps = await Promise.all(ids.map((id) => kvGet<ForecastSnapshot>(`snapshot:${id}`)));
  return snaps.filter((s): s is ForecastSnapshot => s !== null);
}
