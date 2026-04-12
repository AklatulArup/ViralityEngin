import { NextRequest } from "next/server";
import {
  fetchVideo,
  fetchChannel,
  fetchByHandle,
  fetchFullDiscography,
} from "@/lib/youtube";
import type { ChannelData, VideoData } from "@/lib/types";

/**
 * GET /api/youtube/discography
 *
 * Resolves any YouTube input (videoId, channelId, handle) into the full channel
 * discography. Strategy:
 *   1. If videoId is given, fetch the video to get channelId
 *   2. If handle is given, resolve to channelId via /forHandle
 *   3. Fetch the channel to get the uploads playlist ID
 *   4. Page through the uploads playlist up to `max` items
 *
 * Query params:
 *   - videoId  (optional)  e.g. dQw4w9WgXcQ
 *   - channelId (optional)
 *   - handle (optional)  e.g. fundednext
 *   - max (optional, default 200)
 *
 * Returns: { channel: ChannelData, videos: VideoData[] }
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const videoId = sp.get("videoId");
  const channelId = sp.get("channelId");
  const handle = sp.get("handle");
  const max = parseInt(sp.get("max") || "200", 10);

  if (!videoId && !channelId && !handle) {
    return Response.json(
      { error: "Provide one of: videoId, channelId, handle" },
      { status: 400 }
    );
  }

  try {
    let channel: ChannelData | null = null;

    if (channelId) {
      channel = await fetchChannel(channelId);
    } else if (handle) {
      channel = await fetchByHandle(handle.replace(/^@/, ""));
    } else if (videoId) {
      const video = await fetchVideo(videoId);
      if (!video) {
        return Response.json({ error: "Video not found" }, { status: 404 });
      }
      channel = await fetchChannel(video.channelId);
    }

    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }
    if (!channel.uploads) {
      return Response.json(
        { error: "Channel has no uploads playlist", channel, videos: [] },
        { status: 200 }
      );
    }

    const videos: VideoData[] = await fetchFullDiscography(channel.uploads, max);

    return Response.json({ channel, videos, count: videos.length });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
