// /api/analytics/ocr
//
// POST { imageBase64, mimeType } → { ok, extraction }
//
// Accepts a creator-studio screenshot as base64 and returns any analytics
// values Gemini Vision could extract, already typed as Partial<ManualInputs>.
// Used by the ForecastPanel paste/upload affordance so RMs don't have to
// type numbers from their partners' analytics screenshots by hand.
//
// Size cap: 6MB base64 (~4.5MB raw) — above that we reject rather than let
// the Gemini call time out. Mime must be image/*.

import { NextRequest, NextResponse } from "next/server";
import { extractAnalyticsFromImage } from "@/lib/analytics-ocr";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BASE64_BYTES = 6 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let body: { imageBase64?: unknown; mimeType?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const mimeType    = typeof body.mimeType    === "string" ? body.mimeType    : "";

  if (!imageBase64) {
    return NextResponse.json({ ok: false, reason: "image_required" }, { status: 400 });
  }
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ ok: false, reason: "mime_must_be_image" }, { status: 400 });
  }
  if (imageBase64.length > MAX_BASE64_BYTES) {
    return NextResponse.json({ ok: false, reason: "image_too_large", maxBytes: MAX_BASE64_BYTES }, { status: 413 });
  }

  // Strip any data URL prefix the client forgot to remove
  const cleaned = imageBase64.includes(",") ? imageBase64.split(",").pop() ?? "" : imageBase64;

  const result = await extractAnalyticsFromImage(cleaned, mimeType);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
