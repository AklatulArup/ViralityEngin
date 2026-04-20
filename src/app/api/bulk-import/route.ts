import { NextRequest } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseInput } from "@/lib/url-parser";
import { fetchVideo, fetchChannel, fetchByHandle, fetchFullDiscography } from "@/lib/youtube";
import { buildEntryFromVideo } from "@/lib/reference-store";
import { runPlatformVRS } from "@/lib/vrs";
import { expandKeywordBank } from "@/lib/keyword-bank";
import { daysAgo, velocity } from "@/lib/formatters";
import type { Platform } from "@/lib/forecast";
import type { ReferenceEntry, ReferenceStore, Blocklist, VideoData, ChannelData, KeywordBank } from "@/lib/types";

const PATHS = {
  store:    join(process.cwd(), "src/data/reference-store.json"),
  keywords: join(process.cwd(), "src/data/keyword-bank.json"),
  history:  join(process.cwd(), "src/data/analysis-history.json"),
  hashtags: join(process.cwd(), "src/data/hashtag-bank.json"),
  blocklist:join(process.cwd(), "src/data/blocklist.json"),
};

function read<T>(path: string, fallback: T): T {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return fallback; }
}
function write(path: string, data: object) {
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

interface HistoryEntry {
  id: string; url: string; platform: string;
  title: string; channelName: string; channelId: string;
  checkedAt: string; firstCheckedAt?: string;
  metrics: Record<string, number | string>;
  previousSnapshot?: { checkedAt: string; metrics: Record<string, number | string> };
}

// Enrich a VideoData with VRS, velocity, and other computed metrics.
// Uses runPlatformVRS so IG → IG_CRITERIA, YTS → YT_SHORTS_CRITERIA,
// X → X_CRITERIA, TT → TT_CRITERIA, YT → YT_LONGFORM_CRITERIA. Previously
// this forced everything except "tiktok" through YT criteria.
function enrichEntry(v: VideoData, platform: Platform = "youtube"): ReferenceEntry {
  const entry = buildEntryFromVideo(v, platform);
  const days   = daysAgo(v.publishedAt);
  const vel    = velocity(v.views, days);
  const videoWithPlatform: VideoData = v.platform ? v : { ...v, platform };
  const vrs    = runPlatformVRS(videoWithPlatform);
  const eng    = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0;

  return {
    ...entry,
    metrics: {
      ...entry.metrics,
      views:      v.views,
      engagement: parseFloat(eng.toFixed(2)),
      vrsScore:   vrs.estimatedFullScore,
      velocity:   Math.round(vel),
    },
    tags: (v.tags ?? []).slice(0, 20),
  };
}

// Extract hashtags from title, description, tags
function extractHashtags(v: VideoData): string[] {
  const text = `${v.title} ${v.description ?? ""} ${(v.tags ?? []).join(" ")}`;
  const matches = text.match(/#[a-zA-Z0-9_]+/g) ?? [];
  return [...new Set(matches.map(h => h.toLowerCase()))].slice(0, 30);
}

// Save a history snapshot for a video
function saveHistory(
  historyStore: { entries: HistoryEntry[] },
  v: VideoData,
  platform: string,
  vrsScore: number,
  vel: number,
  eng: number
) {
  const url = platform === "youtube"
    ? `https://www.youtube.com/watch?v=${v.id}`
    : v.id;
  const now = new Date().toISOString();
  const existing = historyStore.entries.findIndex(e => e.url === url);
  const newEntry: HistoryEntry = {
    id: `${v.id}_${Date.now()}`,
    url,
    platform,
    title: v.title,
    channelName: v.channel,
    channelId: v.channelId,
    checkedAt: now,
    firstCheckedAt: now,
    metrics: {
      views: v.views,
      likes: v.likes,
      comments: v.comments,
      engagement: parseFloat(eng.toFixed(2)),
      velocity: Math.round(vel),
      vrsScore,
    },
  };
  if (existing >= 0) {
    const old = historyStore.entries[existing];
    historyStore.entries[existing] = {
      ...newEntry,
      firstCheckedAt: old.firstCheckedAt ?? old.checkedAt,
      id: old.id,
      previousSnapshot: { checkedAt: old.checkedAt, metrics: old.metrics },
    };
  } else {
    historyStore.entries.unshift(newEntry);
  }
}

interface ImportResult {
  url: string;
  status: "ok" | "skipped" | "error" | "stub";
  platform: string;
  message: string;
  videoCount?: number;
  channelName?: string;
  keywordsAdded?: number;
  hashtagsAdded?: number;
  avgVRS?: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
  const depth: number = Math.min(parseInt(body.discographyDepth, 10) || 200, 500);
  if (!urls.length) return Response.json({ error: "urls required" }, { status: 400 });

  // Load all stores
  const store      = read<ReferenceStore>(PATHS.store, { version: 1, lastUpdated: "", entries: [] });
  const blocklist  = read<Blocklist>(PATHS.blocklist, { version: 1, lastUpdated: "", channels: [], creators: [] });
  const kwBank     = read<KeywordBank>(PATHS.keywords, { version: 1, lastUpdated: "", categories: { niche: [], competitors: [], contentType: [], language: [] } });
  const histStore  = read<{ entries: HistoryEntry[] }>(PATHS.history, { entries: [] });
  const hashtagStore = read<{ version: number; lastUpdated: string; categories: Record<string, string[]> }>(
    PATHS.hashtags, { version: 1, lastUpdated: "", categories: { viral: [], brand: [], niche: [], campaign: [] } }
  );

  const existingIds   = new Set(store.entries.map(e => e.id));
  const channelSet    = new Set(blocklist.channels);
  const creatorSet    = new Set(blocklist.creators);
  const results: ImportResult[] = [];
  const newEntries: ReferenceEntry[] = [];
  const seenChannels  = new Set<string>();

  let totalKeywordsAdded = 0;
  let totalHashtagsAdded = 0;
  let totalHistorySaved  = 0;

  // Helper: process a batch of videos, extract keywords, save history
  function processBatch(videos: VideoData[], platform: Platform): {
    entries: ReferenceEntry[]; kwAdded: number; htAdded: number; histAdded: number; avgVRS: number;
  } {
    const entries: ReferenceEntry[] = [];
    let kwAdded = 0, htAdded = 0, histAdded = 0, vrsSum = 0;

    for (const v of videos) {
      if (existingIds.has(v.id)) {
        // Even if already indexed, update history snapshot
        const days = daysAgo(v.publishedAt);
        const vel  = velocity(v.views, days);
        const eng  = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0;
        const withPlatform: VideoData = v.platform ? v : { ...v, platform };
        const vrs  = runPlatformVRS(withPlatform);
        saveHistory(histStore, v, platform, vrs.estimatedFullScore, vel, eng);
        histAdded++;
        continue;
      }

      const enriched = enrichEntry(v, platform);
      entries.push(enriched);
      existingIds.add(v.id);

      const days = daysAgo(v.publishedAt);
      const vel  = velocity(v.views, days);
      const eng  = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0;
      const vrs  = enriched.metrics.vrsScore as number ?? 0;
      vrsSum += vrs;

      // Save to history
      saveHistory(histStore, v, platform, vrs, vel, eng);
      histAdded++;

      // Extract and save keywords
      const { bank: updatedBank, newKeywords } = expandKeywordBank(kwBank, v.title, v.description ?? "", v.tags ?? []);
      if (newKeywords.length) {
        Object.assign(kwBank, updatedBank);
        kwBank.categories = updatedBank.categories;
        kwAdded += newKeywords.length;
      }

      // Extract hashtags
      const hashtags = extractHashtags(v);
      for (const ht of hashtags) {
        const existing = Object.values(hashtagStore.categories).flat();
        if (!existing.includes(ht)) {
          hashtagStore.categories.niche = [...(hashtagStore.categories.niche ?? []), ht];
          htAdded++;
        }
      }
    }

    return { entries, kwAdded, htAdded, histAdded, avgVRS: entries.length > 0 ? Math.round(vrsSum / entries.length) : 0 };
  }

  function isBlocked(channelId: string, channelName: string) {
    return channelSet.has(channelId) || creatorSet.has(channelName.toLowerCase());
  }

  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed) continue;
    const parsed = parseInput(trimmed);

    try {
      // ── YouTube video URL ──────────────────────────────────────────────
      if (parsed.type === "youtube-video" || parsed.type === "youtube-short") {
        if (!parsed.id) { results.push({ url, status: "error", platform: "youtube", message: "No video ID" }); continue; }
        const video = await fetchVideo(parsed.id);
        if (!video) { results.push({ url, status: "error", platform: "youtube", message: "Video not found" }); continue; }
        if (isBlocked(video.channelId, video.channel)) { results.push({ url, status: "skipped", platform: "youtube", message: "Blocklisted", channelName: video.channel }); continue; }

        let allVideos: VideoData[] = [video];
        // Fetch full discography if not already seen this channel
        if (!seenChannels.has(video.channelId)) {
          seenChannels.add(video.channelId);
          const channel = await fetchChannel(video.channelId);
          if (channel?.uploads) {
            allVideos = await fetchFullDiscography(channel.uploads, depth);
          }
        }

        const { entries, kwAdded, htAdded, histAdded, avgVRS } = processBatch(allVideos, "youtube");
        newEntries.push(...entries);
        totalKeywordsAdded += kwAdded; totalHashtagsAdded += htAdded; totalHistorySaved += histAdded;
        results.push({ url, status: "ok", platform: "youtube", message: `${entries.length} videos indexed (${allVideos.length} fetched)`, videoCount: entries.length, channelName: video.channel, keywordsAdded: kwAdded, hashtagsAdded: htAdded, avgVRS });

      // ── YouTube channel / handle ───────────────────────────────────────
      } else if (parsed.type === "youtube-channel") {
        let channel: ChannelData | null = null;
        if (parsed.handle) channel = await fetchByHandle(parsed.handle);
        else if (parsed.id) channel = await fetchChannel(parsed.id);
        if (!channel) { results.push({ url, status: "error", platform: "youtube", message: "Channel not found" }); continue; }
        if (isBlocked(channel.id, channel.name)) { results.push({ url, status: "skipped", platform: "youtube", message: "Blocklisted", channelName: channel.name }); continue; }
        if (seenChannels.has(channel.id)) { results.push({ url, status: "skipped", platform: "youtube", message: "Already processed", channelName: channel.name }); continue; }
        seenChannels.add(channel.id);
        if (!channel.uploads) { results.push({ url, status: "error", platform: "youtube", message: "No uploads playlist", channelName: channel.name }); continue; }

        const videos = await fetchFullDiscography(channel.uploads, depth);
        const { entries, kwAdded, htAdded, histAdded, avgVRS } = processBatch(videos, "youtube");
        newEntries.push(...entries);
        totalKeywordsAdded += kwAdded; totalHashtagsAdded += htAdded; totalHistorySaved += histAdded;
        results.push({ url, status: "ok", platform: "youtube", message: `${entries.length} videos indexed from ${channel.name} (${videos.length} fetched)`, videoCount: entries.length, channelName: channel.name, keywordsAdded: kwAdded, hashtagsAdded: htAdded, avgVRS });

      // ── TikTok / Instagram (stub + keyword extraction from handle) ─────
      } else if (parsed.type === "tiktok" || parsed.type === "instagram") {
        const handle = parsed.handle ?? "unknown";
        const stubId = `${parsed.type}:${handle}${parsed.id ? `:${parsed.id}` : ""}`;
        if (existingIds.has(stubId)) { results.push({ url, status: "skipped", platform: parsed.type, message: "Already imported", channelName: handle }); continue; }
        if (creatorSet.has(handle.toLowerCase())) { results.push({ url, status: "skipped", platform: parsed.type, message: "Blocklisted", channelName: handle }); continue; }
        const stub: ReferenceEntry = {
          id: stubId, type: "video", platform: "tiktok",
          name: parsed.id ? `${parsed.type} video ${parsed.id}` : `@${handle} (${parsed.type})`,
          channelId: stubId, channelName: handle,
          analyzedAt: new Date().toISOString(), metrics: {}, tags: [],
        };
        newEntries.push(stub);
        existingIds.add(stubId);
        results.push({ url, status: "stub", platform: parsed.type, message: `Stub saved — upload ${parsed.type === "tiktok" ? "TikTok CSV" : "Instagram CSV"} for stats`, videoCount: 1, channelName: handle });

      } else {
        results.push({ url, status: "error", platform: parsed.type, message: "Unsupported format" });
      }
    } catch (e) {
      results.push({ url, status: "error", platform: parsed.type, message: e instanceof Error ? e.message : "Unknown error" });
    }
  }

  // Persist everything in one batch write
  const now = new Date().toISOString();
  if (newEntries.length) {
    store.entries.push(...newEntries);
    store.lastUpdated = now;
    write(PATHS.store, store);
  }
  kwBank.lastUpdated = now;
  write(PATHS.keywords, kwBank);
  histStore.entries = histStore.entries.slice(0, 5000);
  write(PATHS.history, histStore);
  hashtagStore.lastUpdated = now;
  write(PATHS.hashtags, hashtagStore);

  return Response.json({
    success: true,
    processed: urls.length,
    addedEntries:    newEntries.length,
    totalEntries:    store.entries.length,
    keywordsAdded:   totalKeywordsAdded,
    hashtagsAdded:   totalHashtagsAdded,
    historySaved:    totalHistorySaved,
    totalKeywords:   (kwBank.categories.niche ?? []).length,
    results,
  });
}
