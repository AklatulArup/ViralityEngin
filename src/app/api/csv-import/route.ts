/**
 * POST /api/csv-import
 * Accepts a mixed multi-platform CSV with video URLs + metrics.
 * Auto-detects platform from URL. Saves VRS, keywords, hashtags, history.
 */
import { NextRequest } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { runPlatformVRS } from "@/lib/vrs";
import { expandKeywordBank } from "@/lib/keyword-bank";
import { detectArchetypes } from "@/lib/archetypes";
import type { ReferenceStore, ReferenceEntry, KeywordBank, VideoData } from "@/lib/types";

const P = {
  store:    join(process.cwd(), "src/data/reference-store.json"),
  keywords: join(process.cwd(), "src/data/keyword-bank.json"),
  history:  join(process.cwd(), "src/data/analysis-history.json"),
  hashtags: join(process.cwd(), "src/data/hashtag-bank.json"),
};
const rd = <T>(p: string, fb: T): T => { try { return JSON.parse(readFileSync(p, "utf-8")); } catch { return fb; } };
const wr = (p: string, d: object) => writeFileSync(p, JSON.stringify(d, null, 2), "utf-8");

type Platform = "youtube" | "youtube_short" | "tiktok" | "instagram";

function detectPlatform(url: string): Platform | null {
  const u = (url ?? "").toLowerCase();
  if (u.includes("youtube.com/shorts") || u.includes("youtu.be/shorts")) return "youtube_short";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("tiktok.com") || u.includes("vm.tiktok")) return "tiktok";
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  return null;
}

function extractId(url: string, platform: Platform): string {
  try {
    const u = new URL(url.startsWith("http") ? url : "https://" + url);
    if (platform === "youtube" || platform === "youtube_short") {
      return u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop() || url.slice(-11);
    }
    const segs = u.pathname.split("/").filter(Boolean);
    const idx = segs.findIndex(s => s === "video" || s === "reel" || s === "p");
    return idx >= 0 ? segs[idx + 1] : segs.pop() || url;
  } catch { return url.replace(/[^a-zA-Z0-9_-]/g, "").slice(-20) || `row_${Date.now()}`; }
}

// Column name normaliser → canonical field
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
const FIELD_MAP: Record<string, string> = {
  url:"url", link:"url", video_url:"url", post_url:"url", permalink:"url",
  video_link:"url", content_url:"url", post_link:"url", media_url:"url",
  title:"title", video_title:"title", caption:"title", post_caption:"title",
  views:"views", video_views:"views", view_count:"views", impressions:"views",
  reach:"views", plays:"views", total_views:"views", post_impressions:"views",
  likes:"likes", like_count:"likes", reactions:"likes", hearts:"likes", favorites:"likes",
  comments:"comments", comment_count:"comments", replies:"comments",
  shares:"shares", share_count:"shares", reposts:"shares", retweets:"shares",
  saves:"saves", bookmarks:"saves",
  // Instagram native export aliases
  video_plays:"views", reel_plays:"views",
  accounts_reached:"views", unique_accounts_reached:"views",
  story_impressions:"views",
  post_id:"id_hint", post_type:"platform_hint",   reel_id:"id_hint", shortcode:"id_hint",
  profile_visits:"saves", profile_activity:"saves",
  // TikTok native export aliases
  video_id:"id_hint", sound_name:"tags",
  total_play_time:"duration", average_watch_time:"duration",
  full_video_watched_rate:"engagement",
  // YouTube Studio export aliases
  video_id_yt:"id_hint", content_type:"platform_hint",
  yt_video_views:"views", watch_time_hours:"duration",
  average_view_duration2:"duration", average_view_percentage:"engagement",
  subscribers_gained:"saves", subscribers_lost:"shares",
  dt_date:"date", published_at:"date", post_date:"date", upload_date:"date",
  created_at:"date", publish_date:"date", video_date:"date", timestamp:"date",
  channel:"channel", creator:"channel", username:"channel", handle:"channel",
  account:"channel", author:"channel", channel_name:"channel", creator_name:"channel",
  duration:"duration", length:"duration", video_length:"duration",
  platform:"platform", network:"platform", social_network:"platform",
  tags:"tags", keywords:"tags", hashtags:"tags",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const first = lines[0];
  const tabs = (first.match(/\t/g) || []).length;
  const semis = (first.match(/;/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  const delim = tabs > commas ? "\t" : semis > commas ? ";" : ",";

  function splitLine(line: string): string[] {
    const cells: string[] = []; let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === delim && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  }

  const headers = splitLine(lines[0]).map(h => h.replace(/^["']|["']$/g, "").trim());
  return lines.slice(1).map(line => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) row[h] = (cells[i] ?? "").replace(/^["']|["']$/g, "").trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v.length > 0));
}

function toNum(val: string): number {
  if (!val) return 0;
  const c = val.replace(/[,\s$€£¥%]/g, "").toLowerCase();
  if (c.endsWith("m")) return Math.round(parseFloat(c) * 1_000_000);
  if (c.endsWith("k")) return Math.round(parseFloat(c) * 1_000);
  return parseInt(c) || 0;
}

function parseDur(val: string): number {
  if (!val) return 0;
  const parts = val.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(val) || 0;
}

export async function POST(req: NextRequest) {
  let csvText = "";
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart")) {
    const form = await req.formData();
    const file = form.get("csv") as File | null;
    if (file) csvText = await file.text();
    const txt = form.get("text") as string | null;
    if (txt) csvText = txt;
  } else {
    const body = await req.json().catch(() => ({}));
    csvText = body.text ?? body.csv ?? "";
  }

  if (!csvText.trim()) return Response.json({ error: "No CSV data" }, { status: 400 });

  const rows = parseCSV(csvText);
  if (!rows.length) return Response.json({ error: "No data rows found. Check delimiter (comma/tab/semicolon) and headers." }, { status: 400 });

  // Normalise column names
  const normRows = rows.map(row => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      const mapped = FIELD_MAP[norm(k)];
      out[mapped ?? k] = v;
    }
    return out;
  });

  // Load stores
  const store   = rd<ReferenceStore>(P.store, { version: 1, lastUpdated: "", entries: [] });
  const kwBank  = rd<KeywordBank>(P.keywords, { version: 1, lastUpdated: "", categories: { niche: [], competitors: [], contentType: [], language: [] } });
  const hist    = rd<{ entries: object[] }>(P.history, { entries: [] });
  const htStore = rd<{ version: number; lastUpdated: string; categories: Record<string,string[]> }>(P.hashtags, { version: 1, lastUpdated: "", categories: { viral:[], brand:[], niche:[], campaign:[] } });

  const existingIds = new Set(store.entries.map(e => e.id));
  const newEntries: ReferenceEntry[] = [];
  const results: { row: number; status: string; platform: string; title: string; message: string }[] = [];
  let kwAdded = 0, htAdded = 0, skipped = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < normRows.length; i++) {
    const row = normRows[i];

    // Find URL from mapped field or scan all values
    let url = row.url ?? "";
    if (!url) {
      for (const v of Object.values(row)) {
        if (/^https?:\/\//i.test(v) || /youtube\.com|tiktok\.com|instagram\.com/i.test(v)) { url = v; break; }
      }
    }

    // Detect platform
    let platform = detectPlatform(url) as Platform | null;
    if (!platform && row.platform) {
      const p = row.platform.toLowerCase();
      platform = p.includes("tiktok") ? "tiktok" : p.includes("instagram") ? "instagram" : p.includes("short") ? "youtube_short" : "youtube";
    }
    if (!platform) {
      results.push({ row: i + 2, status: "skip", platform: "?", title: row.title ?? url ?? "(no title)", message: "Cannot detect platform — no recognisable URL or platform column" });
      skipped++;
      continue;
    }

    // Previously this coerced all short-form (IG + TT) into "tiktok" for
    // storage, which polluted the reference pool: IG entries were stored
    // with platform="tiktok", making pool-stats bucket them wrong. Keep the
    // real detected platform so the pool, scoring, and filters agree.
    const id = url ? extractId(url, platform) : `csv_${i}_${Date.now()}`;

    if (existingIds.has(id)) {
      results.push({ row: i + 2, status: "skip", platform, title: row.title ?? "", message: "Already in pool" });
      skipped++;
      continue;
    }

    const views    = toNum(row.views ?? "0");
    const likes    = toNum(row.likes ?? "0");
    const comments = toNum(row.comments ?? "0");
    const shares   = toNum(row.shares ?? "0");
    const saves    = toNum(row.saves ?? "0");
    const durSecs  = parseDur(row.duration ?? "");
    const title    = row.title ?? `Video ${id}`;
    const channel  = row.channel ?? "Unknown";
    const publishedAt = row.date ? (new Date(row.date).toISOString() || now) : now;
    const tags     = row.tags ? row.tags.split(/[,;#\s]+/).map(t => t.replace(/^#/, "")).filter(t => t.length > 1) : [];
    const eng      = views > 0 ? ((likes + comments) / views) * 100 : 0;

    const videoStub: VideoData = {
      id, title, channel, channelId: channel.toLowerCase().replace(/\W/g, "_"),
      views, likes, comments, publishedAt,
      duration: row.duration ?? "0:00", durationSeconds: durSecs,
      thumbnail: "", description: row.description ?? "",
      tags, shares, saves,
      platform,
    };

    const vrs = runPlatformVRS(videoStub);
    const archetypes = detectArchetypes(title, tags);

    // Extract keywords
    const { bank: updatedBank, newKeywords } = expandKeywordBank(kwBank, title, videoStub.description ?? "", tags);
    if (newKeywords.length) { Object.assign(kwBank, updatedBank); kwBank.categories = updatedBank.categories; kwAdded += newKeywords.length; }

    // Extract hashtags
    const rawHashtags = ((title + " " + tags.join(" ")).match(/#[a-zA-Z0-9_]+/g) ?? []).map(h => h.toLowerCase());
    for (const ht of rawHashtags) {
      const all = Object.values(htStore.categories).flat();
      if (!all.includes(ht)) { (htStore.categories.niche = htStore.categories.niche ?? []).push(ht); htAdded++; }
    }

    const entry: ReferenceEntry = {
      id, type: "video", platform,
      name: title, channelId: videoStub.channelId, channelName: channel,
      analyzedAt: now,
      metrics: { views, engagement: parseFloat(eng.toFixed(2)), vrsScore: vrs.estimatedFullScore },
      archetypes, tags: tags.slice(0, 20),
      durationSeconds: durSecs, duration: row.duration ?? "",
    };

    newEntries.push(entry);
    existingIds.add(id);

    // History snapshot
    hist.entries.unshift({
      id: `${id}_csv`, url: url || `csv:${id}`, platform, title, channelName: channel,
      channelId: videoStub.channelId, checkedAt: now, firstCheckedAt: now,
      metrics: { views, engagement: parseFloat(eng.toFixed(2)), vrsScore: vrs.estimatedFullScore },
    });

    results.push({ row: i + 2, status: "ok", platform, title: title.slice(0, 60), message: `VRS ${vrs.estimatedFullScore} · ${eng.toFixed(1)}% eng · +${newKeywords.length} kw` });
  }

  // Write all stores
  store.entries.push(...newEntries);
  store.lastUpdated = now;
  wr(P.store, store);
  kwBank.lastUpdated = now;
  wr(P.keywords, kwBank);
  hist.entries.splice(5000);
  wr(P.history, hist);
  htStore.lastUpdated = now;
  wr(P.hashtags, htStore);

  return Response.json({
    success: true, totalRows: rows.length,
    indexed: newEntries.length, skipped,
    keywordsAdded: kwAdded, hashtagsAdded: htAdded,
    totalPool: store.entries.length,
    results,
  });
}
