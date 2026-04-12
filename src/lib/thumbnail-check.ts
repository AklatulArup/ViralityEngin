import type { ThumbnailAnalysis } from "./types";

export function analyzeThumbnail(thumbnailUrl: string, videoId: string): ThumbnailAnalysis {
  const resolutions = [
    { label: "default", width: 120, height: 90, url: `https://img.youtube.com/vi/${videoId}/default.jpg` },
    { label: "mqdefault", width: 320, height: 180, url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` },
    { label: "hqdefault", width: 480, height: 360, url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
    { label: "sddefault", width: 640, height: 480, url: `https://img.youtube.com/vi/${videoId}/sddefault.jpg` },
    { label: "maxresdefault", width: 1280, height: 720, url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` },
  ];

  // Determine if custom thumbnail
  const urlLower = thumbnailUrl.toLowerCase();
  const hasMaxRes = urlLower.includes("maxresdefault");
  const hasSdRes = urlLower.includes("sddefault");
  const hasHqRes = urlLower.includes("hqdefault");
  const hasCustomThumbnail = hasMaxRes || hasSdRes || hasHqRes;

  // Aspect ratio — YouTube standard is 16:9
  const aspectRatioCorrect = hasMaxRes || hasSdRes;

  // Max resolution
  let maxResolution = "default (120x90)";
  if (hasMaxRes) maxResolution = "maxresdefault (1280x720)";
  else if (hasSdRes) maxResolution = "sddefault (640x480)";
  else if (hasHqRes) maxResolution = "hqdefault (480x360)";
  else if (urlLower.includes("mqdefault")) maxResolution = "mqdefault (320x180)";

  // Issues
  const issues: string[] = [];
  if (!hasCustomThumbnail) {
    issues.push("Thumbnail appears auto-generated — custom thumbnails get 30%+ more clicks");
  }
  if (!hasMaxRes) {
    issues.push("Thumbnail not uploaded at max resolution (1280x720) — lower res reduces visual impact");
  }
  issues.push("Visual analysis unavailable — consider: face presence, readable text (3-5 words max), high contrast colors, brand consistency");

  // Score
  let score = 0;
  if (hasCustomThumbnail) score += 50;
  if (hasMaxRes) score += 30;
  if (aspectRatioCorrect) score += 20;

  return {
    hasCustomThumbnail,
    resolutions,
    aspectRatioCorrect,
    maxResolution,
    issues,
    score,
  };
}
