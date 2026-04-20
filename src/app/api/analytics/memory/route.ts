// /api/analytics/memory
//
// Per-creator memory of private-analytics inputs, so values entered or OCR'd
// for one video pre-fill on the next forecast for the same creator.
//
// GET  ?platform=…&handle=…   → { ok, record }
// POST { platform, handle, inputs, sourceVideoId?, source? }
//                               → { ok, record }  (merged + persisted)

import { NextRequest, NextResponse } from "next/server";
import { isKvAvailable } from "@/lib/kv";
import {
  loadCreatorAnalytics,
  saveCreatorAnalytics,
} from "@/lib/analytics-memory";
import type { Platform, ManualInputs } from "@/lib/forecast";

export const runtime = "nodejs";
// Reads searchParams + KV at request time — must never be pre-rendered.
export const dynamic = "force-dynamic";

const VALID_PLATFORMS = new Set<Platform>(["youtube", "youtube_short", "tiktok", "instagram", "x"]);

export async function GET(req: NextRequest) {
  if (!isKvAvailable()) {
    return NextResponse.json({ ok: false, reason: "kv_not_configured", record: null });
  }
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const handle   = searchParams.get("handle");

  if (!platform || !VALID_PLATFORMS.has(platform as Platform)) {
    return NextResponse.json({ ok: false, reason: "invalid_platform" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ ok: false, reason: "handle_required" }, { status: 400 });
  }

  const record = await loadCreatorAnalytics(platform as Platform, handle);
  return NextResponse.json({ ok: true, record });
}

export async function POST(req: NextRequest) {
  if (!isKvAvailable()) {
    return NextResponse.json({ ok: false, reason: "kv_not_configured" });
  }

  let body: {
    platform?:      unknown;
    handle?:        unknown;
    inputs?:        unknown;
    sourceVideoId?: unknown;
    source?:        unknown;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 }); }

  const platform = typeof body.platform === "string" ? body.platform : "";
  const handle   = typeof body.handle   === "string" ? body.handle   : "";

  if (!VALID_PLATFORMS.has(platform as Platform)) {
    return NextResponse.json({ ok: false, reason: "invalid_platform" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ ok: false, reason: "handle_required" }, { status: 400 });
  }
  if (!body.inputs || typeof body.inputs !== "object") {
    return NextResponse.json({ ok: false, reason: "inputs_required" }, { status: 400 });
  }

  const sourceVideoId = typeof body.sourceVideoId === "string" ? body.sourceVideoId : undefined;
  const source = body.source === "manual" || body.source === "ocr" || body.source === "merged"
    ? body.source
    : undefined;

  const record = await saveCreatorAnalytics({
    platform:      platform as Platform,
    handle,
    newInputs:     body.inputs as Partial<ManualInputs>,
    sourceVideoId,
    source,
  });

  return NextResponse.json({ ok: true, record });
}
