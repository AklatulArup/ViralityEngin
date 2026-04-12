import type { EnrichedVideo, AdjacentVideoContext } from "./types";

// Find the videos published immediately before and after a target video
// on the same channel, and compute the lag time in days between them.
export function findAdjacentVideos(
  targetVideo: EnrichedVideo,
  channelVideos: EnrichedVideo[]
): AdjacentVideoContext {
  // Filter to same channel, sort by publish date
  const sameChannel = channelVideos
    .filter((v) => v.channelId === targetVideo.channelId && v.id !== targetVideo.id)
    .sort(
      (a, b) =>
        new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    );

  if (sameChannel.length === 0) {
    return { before: null, after: null, lagBefore: null, lagAfter: null };
  }

  const targetDate = new Date(targetVideo.publishedAt).getTime();

  // Find the closest video published BEFORE the target
  let before: EnrichedVideo | null = null;
  for (let i = sameChannel.length - 1; i >= 0; i--) {
    const pubDate = new Date(sameChannel[i].publishedAt).getTime();
    if (pubDate < targetDate) {
      before = sameChannel[i];
      break;
    }
  }

  // Find the closest video published AFTER the target
  let after: EnrichedVideo | null = null;
  for (const v of sameChannel) {
    const pubDate = new Date(v.publishedAt).getTime();
    if (pubDate > targetDate) {
      after = v;
      break;
    }
  }

  const lagBefore = before
    ? Math.round((targetDate - new Date(before.publishedAt).getTime()) / 86_400_000)
    : null;

  const lagAfter = after
    ? Math.round((new Date(after.publishedAt).getTime() - targetDate) / 86_400_000)
    : null;

  return { before, after, lagBefore, lagAfter };
}
