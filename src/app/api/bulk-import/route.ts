import { NextRequest } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseInput } from "@/lib/url-parser";
import {
  fetchVideo,
  fetchChannel,
  fetchByHandle,
  fetchFullDiscography,
} from "@/lib/youtube";
import { buildEntryFromVideo } from "@/lib/reference-store";
import type {
  ReferenceEntry,
  ReferenceStore,
  Blocklist,
  VideoData,
  ChannelData,
} from "@/lib/types";

const STORE_PATH = join(process.cwd(), "src/data/reference-store.json");
const BLOCKLIST_PATH = join(process.cwd(), "src/data/blocklist.json");

function readStore(): ReferenceStore {
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf-8"));
  } catch {
    return { version: 1, lastUpdated: "", entries: [] };
  }
}

function writeStore(s: ReferenceStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(s, null, 2), "utf-8");
}

function readBlocklist(): Blocklist {
  try {
    return JSON.parse(readFileSync(BLOCKLIST_PATH, "utf-8"));
  } catch {
    return { version: 1, lastUpdated: "", channels: [], creators: [] };
  }
}

function isBlocked(
  entry: { channelId: string; channelName: string },
  channelSet: Set<string>,
  creatorSet: Set<string>
): boolean {
  if (channelSet.has(entry.channelId)) return true;
  if (creatorSet.has((entry.channelName || "").toLowerCase())) return true;
  return false;
}

interface ImportResult {
  url: string;
  status: "ok" | "skipped" | "error" | "stub";
  platform: string;
  message: string;
  videoCount?: number;
  channelName?: string;
}

/**
 * POST /api/bulk-import
 * Body: { urls: string[], discographyDepth?: number }
 *
 * Resolves each URL into one or more reference entries:
 *   - YouTube video → fetches video, then fetches the entire creator discography
 *   - YouTube channel/handle → fetches the entire creator discography
 *   - TikTok handle/video → creates a stub entry (use CSV upload for stats)
 *   - Instagram handle/reel → creates a stub entry
 *
 * Respects the blocklist (skips entries from blocked channels/creators).
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
  const discographyDepth: number = Math.min(
    Math.max(parseInt(body.discographyDepth, 10) || 200, 1),
    500
  );

  if (urls.length === 0) {
    return Response.json({ error: "urls array required" }, { status: 400 });
  }

  const blocklist = readBlocklist();
  const channelSet = new Set(blocklist.channels);
  const creatorSet = new Set(blocklist.creators);

  const store = readStore();
  const existingIds = new Set(store.entries.map((e) => e.id));
  const results: ImportResult[] = [];
  const newEntries: ReferenceEntry[] = [];
  const seenChannels = new Set<string>();

  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed) continue;
    const parsed = parseInput(trimmed);

    try {
      if (
        parsed.type === "youtube-video" ||
        parsed.type === "youtube-short"
      ) {
        if (!parsed.id) {
          results.push({ url, status: "error", platform: parsed.type, message: "Could not extract video ID" });
          continue;
        }
        const video = await fetchVideo(parsed.id);
        if (!video) {
          results.push({ url, status: "error", platform: parsed.type, message: "Video not found" });
          continue;
        }
        if (seenChannels.has(video.channelId)) {
          results.push({ url, status: "skipped", platform: parsed.type, message: "Channel already processed in this batch", channelName: video.channel });
          continue;
        }
        if (isBlocked({ channelId: video.channelId, channelName: video.channel }, channelSet, creatorSet)) {
          results.push({ url, status: "skipped", platform: parsed.type, message: "Channel is blocklisted", channelName: video.channel });
          continue;
        }
        seenChannels.add(video.channelId);

        const channel: ChannelData | null = await fetchChannel(video.channelId);
        if (!channel?.uploads) {
          // Just save the single video
          if (!existingIds.has(video.id)) {
            newEntries.push(buildEntryFromVideo(video, "youtube"));
            existingIds.add(video.id);
          }
          results.push({ url, status: "ok", platform: parsed.type, message: "Saved video (no uploads playlist for full discography)", videoCount: 1, channelName: video.channel });
          continue;
        }

        const discography: VideoData[] = await fetchFullDiscography(channel.uploads, discographyDepth);
        let added = 0;
        for (const v of discography) {
          if (existingIds.has(v.id)) continue;
          newEntries.push(buildEntryFromVideo(v, "youtube"));
          existingIds.add(v.id);
          added++;
        }
        results.push({
          url,
          status: "ok",
          platform: "youtube",
          message: `Fetched ${discography.length} videos from discography (${added} new)`,
          videoCount: added,
          channelName: channel.name,
        });
      } else if (parsed.type === "youtube-channel") {
        let channel: ChannelData | null = null;
        if (parsed.handle) {
          channel = await fetchByHandle(parsed.handle);
        } else if (parsed.id) {
          channel = await fetchChannel(parsed.id);
        }
        if (!channel) {
          results.push({ url, status: "error", platform: parsed.type, message: "Channel not found" });
          continue;
        }
        if (seenChannels.has(channel.id)) {
          results.push({ url, status: "skipped", platform: "youtube", message: "Channel already processed in this batch", channelName: channel.name });
          continue;
        }
        if (isBlocked({ channelId: channel.id, channelName: channel.name }, channelSet, creatorSet)) {
          results.push({ url, status: "skipped", platform: "youtube", message: "Channel is blocklisted", channelName: channel.name });
          continue;
        }
        seenChannels.add(channel.id);

        if (!channel.uploads) {
          results.push({ url, status: "error", platform: "youtube", message: "Channel has no uploads playlist", channelName: channel.name });
          continue;
        }

        const discography: VideoData[] = await fetchFullDiscography(channel.uploads, discographyDepth);
        let added = 0;
        for (const v of discography) {
          if (existingIds.has(v.id)) continue;
          newEntries.push(buildEntryFromVideo(v, "youtube"));
          existingIds.add(v.id);
          added++;
        }
        results.push({
          url,
          status: "ok",
          platform: "youtube",
          message: `Fetched ${discography.length} videos from discography (${added} new)`,
          videoCount: added,
          channelName: channel.name,
        });
      } else if (parsed.type === "tiktok") {
        const handle = parsed.handle || "unknown";
        const stubId = `tiktok:${handle}${parsed.id ? `:${parsed.id}` : ""}`;
        if (existingIds.has(stubId)) {
          results.push({ url, status: "skipped", platform: "tiktok", message: "Already imported", channelName: handle });
          continue;
        }
        if (creatorSet.has(handle.toLowerCase())) {
          results.push({ url, status: "skipped", platform: "tiktok", message: "Creator is blocklisted", channelName: handle });
          continue;
        }
        const stub: ReferenceEntry = {
          id: stubId,
          type: "video",
          platform: "tiktok",
          name: parsed.id ? `TikTok video ${parsed.id}` : `@${handle} (TikTok)`,
          channelId: stubId,
          channelName: handle,
          analyzedAt: new Date().toISOString(),
          metrics: {},
          tags: [],
        };
        newEntries.push(stub);
        existingIds.add(stubId);
        results.push({
          url,
          status: "stub",
          platform: "tiktok",
          message: "Stub created — upload TikTok CSV for stats",
          videoCount: 1,
          channelName: handle,
        });
      } else if (parsed.type === "instagram") {
        const handle = parsed.handle || "unknown";
        const stubId = `instagram:${handle}${parsed.id ? `:${parsed.id}` : ""}`;
        if (existingIds.has(stubId)) {
          results.push({ url, status: "skipped", platform: "instagram", message: "Already imported", channelName: handle });
          continue;
        }
        if (creatorSet.has(handle.toLowerCase())) {
          results.push({ url, status: "skipped", platform: "instagram", message: "Creator is blocklisted", channelName: handle });
          continue;
        }
        const stub: ReferenceEntry = {
          id: stubId,
          type: "video",
          platform: "tiktok", // Using tiktok as closest analog (vertical/short content)
          name: parsed.id ? `Instagram reel ${parsed.id}` : `@${handle} (Instagram)`,
          channelId: stubId,
          channelName: handle,
          analyzedAt: new Date().toISOString(),
          metrics: {},
          tags: [],
        };
        newEntries.push(stub);
        existingIds.add(stubId);
        results.push({
          url,
          status: "stub",
          platform: "instagram",
          message: "Stub created — Instagram has no public API. Add stats via CSV.",
          videoCount: 1,
          channelName: handle,
        });
      } else {
        results.push({ url, status: "error", platform: parsed.type, message: "Unsupported URL format" });
      }
    } catch (e) {
      results.push({
        url,
        status: "error",
        platform: parsed.type,
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // Persist all new entries in one write
  if (newEntries.length > 0) {
    store.entries.push(...newEntries);
    store.lastUpdated = new Date().toISOString();
    writeStore(store);
  }

  return Response.json({
    success: true,
    processed: urls.length,
    addedEntries: newEntries.length,
    totalEntries: store.entries.length,
    results,
  });
}
