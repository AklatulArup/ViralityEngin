// /api/thumbnail/score
//
// GET ?url=<encoded-thumbnail-url>   → { ok, score, cached }
//
// Fetches the thumbnail image server-side, calls Gemini Vision to score it
// against the 20-point checklist, returns an estimated CTR. Caches results
// in KV by URL hash — thumbnails rarely change, so repeat forecasts of the
// same video don't pay for a new vision call.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { kvGet, kvSet, isKvAvailable } from "@/lib/kv";
import { scoreThumbnail, type ThumbnailScore } from "@/lib/thumbnail-ctr-predictor";

export const runtime = "nodejs";
export const maxDuration = 30;
// Reads thumbnail url from query + KV cache lookup — must be dynamic.
export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024;              // don't pipe huge images into Gemini
const CACHE_PREFIX = "thumbnail-ctr:";

interface CachedScore {
  computedAt: string;
  score:      ThumbnailScore;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ ok: false, reason: "url_required" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, reason: "url_must_be_http" }, { status: 400 });
  }

  const cacheKey = CACHE_PREFIX + createHash("sha1").update(url).digest("hex");

  // ── Cache hit ──────────────────────────────────────────────────────────
  if (isKvAvailable()) {
    const cached = await kvGet<CachedScore>(cacheKey);
    if (cached?.score) {
      return NextResponse.json({ ok: true, score: cached.score, cached: true, computedAt: cached.computedAt });
    }
  }

  // ── Fetch image bytes ──────────────────────────────────────────────────
  let imgRes: Response;
  try {
    imgRes = await fetch(url, { cache: "no-store" });
  } catch (e) {
    return NextResponse.json(
      { ok: false, reason: "image_fetch_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
  if (!imgRes.ok) {
    return NextResponse.json({ ok: false, reason: "image_fetch_status", status: imgRes.status }, { status: 502 });
  }

  const mimeType = imgRes.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ ok: false, reason: "not_an_image", mimeType }, { status: 400 });
  }

  const buffer = await imgRes.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: "image_too_large", bytes: buffer.byteLength }, { status: 413 });
  }
  const imageBase64 = Buffer.from(buffer).toString("base64");

  // ── Score via Gemini Vision ────────────────────────────────────────────
  const result = await scoreThumbnail(imageBase64, mimeType);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  // ── Persist cache ──────────────────────────────────────────────────────
  if (isKvAvailable()) {
    const toCache: CachedScore = { computedAt: new Date().toISOString(), score: result.score };
    await kvSet(cacheKey, toCache);
  }

  return NextResponse.json({ ok: true, score: result.score, cached: false });
}
