// /api/forecast/snapshot
//
// POST — record a new forecast snapshot
// GET  — list recent snapshots (for debugging; calibration uses its own endpoint)

import { NextRequest, NextResponse } from "next/server";
import { kvSet, kvListPush, kvSetAdd, kvListRange, kvGet, isKvAvailable } from "@/lib/kv";
import type { ForecastSnapshot } from "@/lib/forecast-learning";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const snapshot = (await req.json()) as ForecastSnapshot;

    // Basic validation — reject malformed payloads
    if (!snapshot?.id || !snapshot?.videoId || !snapshot?.platform) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    if (!isKvAvailable()) {
      // KV not configured — acknowledge so client's localStorage still works, but flag it
      return NextResponse.json({
        ok: false,
        stored: false,
        reason: "kv_not_configured",
      });
    }

    // Persist the snapshot by ID
    await kvSet(`snapshot:${snapshot.id}`, snapshot);

    // Index membership: global list, per-platform list, per-video set
    await kvListPush("snapshots:all", snapshot.id);
    await kvListPush(`snapshots:by-platform:${snapshot.platform}`, snapshot.id);
    await kvSetAdd(`snapshots:by-video:${snapshot.videoId}`, snapshot.id);
    await kvSetAdd("snapshots:video-ids", snapshot.videoId);

    return NextResponse.json({ ok: true, stored: true, id: snapshot.id });
  } catch (e) {
    console.error("[api/forecast/snapshot] POST error:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(200, parseInt(url.searchParams.get("limit") ?? "50", 10));

    if (!isKvAvailable()) {
      return NextResponse.json({ ok: false, snapshots: [], reason: "kv_not_configured" });
    }

    const ids = await kvListRange("snapshots:all", -limit, -1);
    const snapshots = await Promise.all(
      ids.map((id) => kvGet<ForecastSnapshot>(`snapshot:${id}`))
    );
    const validSnapshots = snapshots.filter((s): s is ForecastSnapshot => s !== null);

    return NextResponse.json({ ok: true, snapshots: validSnapshots });
  } catch (e) {
    console.error("[api/forecast/snapshot] GET error:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
