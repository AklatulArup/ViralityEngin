// /api/analytics/csv-import
//
// POST multipart/form-data with fields:
//   platform: "tiktok" | "instagram"
//   handle:   creator handle (e.g. "@fundednext" — @ optional)
//   file:     CSV file exported from TikTok Studio or Meta Business Suite
//
// -- or --
//
// POST JSON { platform, handle, csv } where `csv` is the full CSV text.
//
// Parses the CSV using platform-specific column-header mapping, aggregates
// per-post rows into creator-level means, writes the merged inputs into
// `creator-analytics:<platform>:<handle>` via saveCreatorAnalytics().
//
// This is the circumvention for "no direct API pull of private analytics":
// both TikTok Studio and Meta Business Suite already let creators export
// per-post analytics as CSV. An RM uploads the creator's CSV once per week
// and the engine backfills ManualInputs for every forecast of that creator.
//
// Returns: { ok, platform, handle, rowsParsed, aggregated, record }

import { NextRequest, NextResponse } from "next/server";
import { isKvAvailable } from "@/lib/kv";
import { saveCreatorAnalytics } from "@/lib/analytics-memory";
import type { Platform, ManualInputs } from "@/lib/forecast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ─── TYPE HELPERS ─────────────────────────────────────────────────────────

type NumericKey = keyof Pick<
  ManualInputs,
  | "ttCompletionPct" | "ttRewatchPct" | "ttFypViewPct"
  | "igSaves" | "igSends" | "igReach" | "igHold3s"
>;

interface CsvRow {
  [header: string]: string;
}

interface ParsedResult {
  rowsParsed: number;
  aggregated: Partial<ManualInputs>;
  perRow: Array<Partial<Record<NumericKey, number>>>;
  detectedHeaders: string[];
  sampleMatched: string[];      // which columns we mapped
}

// ─── PLATFORM CSV COLUMN MAPS ─────────────────────────────────────────────
//
// Key = normalised header text (lowercase, spaces+punctuation stripped).
// Value = which ManualInputs field it feeds, plus a transform to convert the
// raw cell text into the right units (e.g. "72.4%" → 72.4, "1,234" → 1234).
//
// We deliberately list *several* synonyms per field because TikTok Studio /
// Meta Business Suite vary their column headers between regions, UI versions,
// and the creator's locale language. If a header isn't in the map we skip it.

interface ColumnMap {
  field:     NumericKey;
  transform: (raw: string) => number | null;
}

const pctTransform = (raw: string): number | null => {
  const cleaned = raw.replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  // 0-1 → 0-100 scale if someone exported decimals
  if (n > 0 && n <= 1) return +(n * 100).toFixed(2);
  return n;
};

const intTransform = (raw: string): number | null => {
  const cleaned = raw.replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
};

// TikTok Studio CSV column headers (EN locale). Covers both the per-video
// export and the 7/28/60-day aggregate export.
const TIKTOK_MAP: Record<string, ColumnMap> = {
  // Completion = watched full video % (canonical TikTok metric)
  "watchedfullvideo":        { field: "ttCompletionPct", transform: pctTransform },
  "completionrate":          { field: "ttCompletionPct", transform: pctTransform },
  "completedviews":          { field: "ttCompletionPct", transform: pctTransform },
  "averagecompletionrate":   { field: "ttCompletionPct", transform: pctTransform },
  // Rewatch
  "rewatchrate":             { field: "ttRewatchPct",    transform: pctTransform },
  "rewatches":               { field: "ttRewatchPct",    transform: pctTransform },
  "averagerewatchrate":      { field: "ttRewatchPct",    transform: pctTransform },
  // FYP/For-You share of views
  "forryoupagetraffic":      { field: "ttFypViewPct",    transform: pctTransform },
  "fypviews":                { field: "ttFypViewPct",    transform: pctTransform },
  "foryoufeed":              { field: "ttFypViewPct",    transform: pctTransform },
};

// Meta Business Suite / IG Insights CSV column headers.
const INSTAGRAM_MAP: Record<string, ColumnMap> = {
  "saves":                   { field: "igSaves",  transform: intTransform },
  "saved":                   { field: "igSaves",  transform: intTransform },
  "postssaved":              { field: "igSaves",  transform: intTransform },
  "sends":                   { field: "igSends",  transform: intTransform },
  "sharessends":             { field: "igSends",  transform: intTransform },
  "shares":                  { field: "igSends",  transform: intTransform },
  "sharessentto":            { field: "igSends",  transform: intTransform },
  "reach":                   { field: "igReach",  transform: intTransform },
  "accountsreached":         { field: "igReach",  transform: intTransform },
  "3secondplays":            { field: "igHold3s", transform: pctTransform },
  "threesecondplays":        { field: "igHold3s", transform: pctTransform },
  "3secondvideoplays":       { field: "igHold3s", transform: pctTransform },
  "retention3s":             { field: "igHold3s", transform: pctTransform },
  "initialplays":            { field: "igHold3s", transform: pctTransform },
};

// ─── CSV PARSER ───────────────────────────────────────────────────────────
//
// Minimal RFC-4180 parser: handles quoted fields, escaped quotes, and
// CRLF/LF line endings. No external dependency. We never call this on
// files bigger than a few thousand rows so perf isn't a concern.

interface ParseResult {
  rows:         CsvRow[];
  headers:      string[];
  droppedCount: number;    // rows with column-count mismatch (malformed CSV hints)
  droppedRowNumbers: number[];  // 1-indexed row numbers for the first 10 dropped, for surfacing to the RM
}

function parseCsv(text: string): ParseResult {
  // Strip UTF-8 BOM if present (common in Excel / Meta Business Suite exports).
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuote = false; }
      } else { field += c; }
    } else {
      if (c === '"') { inQuote = true; }
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }

  if (rows.length === 0) return { rows: [], headers: [], droppedCount: 0, droppedRowNumbers: [] };
  const headers = rows[0].map(h => h.trim());

  const kept: CsvRow[] = [];
  const droppedRowNumbers: number[] = [];
  let droppedCount = 0;

  // Drop rows whose length doesn't match the header count. A trailing empty
  // column (length = headers.length + 1) is tolerated — common in CSV exports
  // with stray trailing comma. Completely empty rows are silently skipped
  // (they're not data loss).
  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const isEmpty = r.length === 0 || (r.length === 1 && r[0].trim() === "");
    if (isEmpty) continue;
    if (r.length === headers.length || r.length === headers.length + 1) {
      const obj: CsvRow = {};
      for (let j = 0; j < headers.length; j++) obj[headers[j]] = (r[j] ?? "").trim();
      kept.push(obj);
    } else {
      droppedCount++;
      if (droppedRowNumbers.length < 10) droppedRowNumbers.push(ri + 1); // 1-indexed, header = row 1
    }
  }

  return { rows: kept, headers, droppedCount, droppedRowNumbers };
}

// ─── HEADER NORMALISER ────────────────────────────────────────────────────

function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ─── ROW → FIELDS ─────────────────────────────────────────────────────────

function extractRow(
  row: CsvRow,
  map: Record<string, ColumnMap>,
): Partial<Record<NumericKey, number>> {
  const out: Partial<Record<NumericKey, number>> = {};
  for (const [rawHeader, rawValue] of Object.entries(row)) {
    if (!rawValue) continue;
    const key = normHeader(rawHeader);
    const col = map[key];
    if (!col) continue;
    const n = col.transform(rawValue);
    if (n == null || !Number.isFinite(n)) continue;
    // Prefer first non-null occurrence per row
    if (out[col.field] == null) out[col.field] = n;
  }
  return out;
}

// ─── AGGREGATION ──────────────────────────────────────────────────────────
//
// Per-row values aggregate into creator-level means (for percentage metrics)
// or medians (for count metrics). The engine consumes ManualInputs as a
// single number per field, so we collapse every post in the CSV into one
// "typical value" that memory persists forward.

function median(arr: number[]): number {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function aggregate(
  rows: Array<Partial<Record<NumericKey, number>>>,
): Partial<ManualInputs> {
  const buckets: Partial<Record<NumericKey, number[]>> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      const key = k as NumericKey;
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      (buckets[key] ||= []).push(v);
    }
  }
  const out: Partial<ManualInputs> = {};
  // Percentages → mean (stable for small samples)
  for (const k of ["ttCompletionPct", "ttRewatchPct", "ttFypViewPct", "igHold3s"] as const) {
    const arr = buckets[k];
    if (arr && arr.length > 0) out[k] = +mean(arr).toFixed(2);
  }
  // Counts → median (robust to the occasional viral outlier)
  for (const k of ["igSaves", "igSends", "igReach"] as const) {
    const arr = buckets[k];
    if (arr && arr.length > 0) out[k] = Math.round(median(arr));
  }
  return out;
}

// ─── BODY INGESTION ───────────────────────────────────────────────────────

async function readBody(req: NextRequest): Promise<{ platform?: string; handle?: string; csv?: string }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const platform = form.get("platform");
    const handle   = form.get("handle");
    const file     = form.get("file");
    const csvText  = file instanceof File ? await file.text() : (typeof file === "string" ? file : "");
    return {
      platform: typeof platform === "string" ? platform : undefined,
      handle:   typeof handle   === "string" ? handle   : undefined,
      csv:      csvText,
    };
  }
  // JSON body
  const body = await req.json().catch(() => ({}));
  return {
    platform: typeof body?.platform === "string" ? body.platform : undefined,
    handle:   typeof body?.handle   === "string" ? body.handle   : undefined,
    csv:      typeof body?.csv      === "string" ? body.csv      : undefined,
  };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isKvAvailable()) {
    return NextResponse.json({ ok: false, reason: "kv_not_configured" });
  }

  const { platform, handle, csv } = await readBody(req);

  if (platform !== "tiktok" && platform !== "instagram") {
    return NextResponse.json({ ok: false, reason: "platform_must_be_tiktok_or_instagram" }, { status: 400 });
  }
  if (!handle || handle.trim().length === 0) {
    return NextResponse.json({ ok: false, reason: "handle_required" }, { status: 400 });
  }
  if (!csv || csv.trim().length === 0) {
    return NextResponse.json({ ok: false, reason: "csv_required" }, { status: 400 });
  }

  const parsed = parseCsv(csv);
  const rows = parsed.rows;
  if (rows.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: "no_rows_in_csv",
      droppedCount: parsed.droppedCount,
      droppedRowNumbers: parsed.droppedRowNumbers,
    });
  }

  // Surface column-count mismatches so RMs know silent data loss happened.
  // A malformed cell with an unescaped comma would otherwise drop the row
  // with no feedback.
  const warnings: string[] = [];
  if (parsed.droppedCount > 0) {
    warnings.push(
      `${parsed.droppedCount} row${parsed.droppedCount === 1 ? "" : "s"} dropped due to column-count mismatch ` +
      `(expected ${parsed.headers.length} columns). First affected row numbers: ${parsed.droppedRowNumbers.join(", ")}.`,
    );
  }

  const map = platform === "tiktok" ? TIKTOK_MAP : INSTAGRAM_MAP;
  const detectedHeaders = parsed.headers;
  const perRow = rows.map(r => extractRow(r, map));

  const matchedFields = new Set<string>();
  for (const r of perRow) for (const k of Object.keys(r)) matchedFields.add(k);

  if (matchedFields.size === 0) {
    return NextResponse.json({
      ok: false,
      reason: "no_columns_matched",
      detectedHeaders,
      hint: platform === "tiktok"
        ? "Export from TikTok Studio → Analytics → Video → Download. Expected columns include 'Watched full video' / 'Completion rate' / 'Rewatch rate' / 'For You Page traffic'."
        : "Export from Meta Business Suite → Content → Export. Expected columns include 'Saves' / 'Shares' / 'Reach' / '3-second plays'.",
    }, { status: 422 });
  }

  const aggregated = aggregate(perRow);

  const record = await saveCreatorAnalytics({
    platform:      platform as Platform,
    handle,
    newInputs:     aggregated,
    source:        "merged",
  });

  const result: ParsedResult = {
    rowsParsed:      rows.length,
    aggregated,
    perRow,
    detectedHeaders,
    sampleMatched:   Array.from(matchedFields),
  };

  return NextResponse.json({
    ok:           true,
    platform,
    handle,
    rowsParsed:   result.rowsParsed,
    aggregated:   result.aggregated,
    matched:      result.sampleMatched,
    droppedCount: parsed.droppedCount,
    warnings,
    record,
  });
}
