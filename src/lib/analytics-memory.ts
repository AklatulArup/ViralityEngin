// ═══════════════════════════════════════════════════════════════════════════
// PER-CREATOR ANALYTICS MEMORY
// ═══════════════════════════════════════════════════════════════════════════
//
// Every time an RM enters or OCRs private analytics for a partner's video, we
// store the inputs keyed by creator handle + platform. Next time any RM
// analyses another video from the same creator, those values pre-fill.
//
// This exists because the highest-signal ManualInputs (TikTok completion %,
// IG saves/sends/reach, YT AVD/CTR, …) usually don't change much post-by-post
// for a given creator — their median sits in a narrow band determined by
// audience quality. Pre-filling the last-known value is a good default even
// if the RM hasn't re-sourced the latest analytics for this specific video.
//
// KV shape:
//   Key: `creator-analytics:<platform>:<handle-normalized>`
//   Value: { platform, handle, inputs, updatedAt, videoId (most recent source) }
//
// Handles are normalised to lowercase with leading '@' stripped so variants
// of the same creator resolve consistently.

import type { ManualInputs, Platform } from "./forecast";
import { kvGet, kvSet } from "./kv";

export interface CreatorAnalyticsRecord {
  platform:   Platform;
  handle:     string;               // normalised (lowercase, no leading @)
  inputs:     Partial<ManualInputs>;
  updatedAt:  string;               // ISO
  sourceVideoId?: string;
  source?:    "manual" | "ocr" | "merged";
}

// ─── HANDLE NORMALISATION ─────────────────────────────────────────────────

export function normaliseHandle(handle: string | undefined | null): string | null {
  if (!handle) return null;
  const trimmed = handle.trim();
  if (!trimmed) return null;
  // Strip leading @, any URL prefix, lowercase. We intentionally keep dots
  // and underscores — they're significant in some platform handles.
  const stripped = trimmed
    .replace(/^@/, "")
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  return stripped || null;
}

function kvKey(platform: Platform, handle: string): string {
  return `creator-analytics:${platform}:${handle}`;
}

// ─── LOAD / SAVE ──────────────────────────────────────────────────────────

export async function loadCreatorAnalytics(
  platform: Platform,
  rawHandle: string | undefined | null,
): Promise<CreatorAnalyticsRecord | null> {
  const handle = normaliseHandle(rawHandle);
  if (!handle) return null;
  return kvGet<CreatorAnalyticsRecord>(kvKey(platform, handle));
}

/**
 * Merge new inputs into the existing record and persist. Fields set to null
 * or undefined in `newInputs` do NOT overwrite previously-known values —
 * this way a partial OCR (e.g. only completion %) doesn't wipe the reach
 * number an RM typed last week.
 */
export async function saveCreatorAnalytics(params: {
  platform:      Platform;
  handle:        string | undefined | null;
  newInputs:     Partial<ManualInputs>;
  sourceVideoId?: string;
  source?:       "manual" | "ocr" | "merged";
}): Promise<CreatorAnalyticsRecord | null> {
  const handle = normaliseHandle(params.handle);
  if (!handle) return null;

  const filtered = filterNonNull(params.newInputs);
  if (Object.keys(filtered).length === 0) return null;   // nothing to save

  const existing = await kvGet<CreatorAnalyticsRecord>(kvKey(params.platform, handle));
  const mergedInputs: Partial<ManualInputs> = { ...(existing?.inputs ?? {}), ...filtered };

  const record: CreatorAnalyticsRecord = {
    platform:      params.platform,
    handle,
    inputs:        mergedInputs,
    updatedAt:     new Date().toISOString(),
    sourceVideoId: params.sourceVideoId ?? existing?.sourceVideoId,
    source:        params.source ?? "merged",
  };

  await kvSet(kvKey(params.platform, handle), record);
  return record;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────

function filterNonNull(inputs: Partial<ManualInputs>): Partial<ManualInputs> {
  const out: Partial<ManualInputs> = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (v == null || Number.isNaN(v as number)) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
