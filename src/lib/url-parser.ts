import type { ParsedInput } from "./types";

export function parseInput(input: string): ParsedInput {
  const trimmed = input.trim();

  // YouTube channel handle: @handle or youtube.com/@handle
  const handleMatch = trimmed.match(
    /(?:youtube\.com\/@|^@)([a-zA-Z0-9_.-]+)/
  );
  if (handleMatch) {
    return {
      type: "youtube-channel",
      id: null,
      handle: handleMatch[1],
      url: trimmed,
      label: `YouTube · Channel @${handleMatch[1]}`,
    };
  }

  // YouTube video: watch?v=, youtu.be/, /shorts/
  const videoPatterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /shorts\/([^?&#]+)/,
  ];
  for (const pattern of videoPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const isShort = /shorts\//.test(trimmed);
      return {
        type: isShort ? "youtube-short" : "youtube-video",
        id: match[1],
        handle: null,
        url: trimmed,
        label: isShort ? "YouTube · Short" : "YouTube · Video",
      };
    }
  }

  // YouTube channel URL (not handle, but /channel/ID)
  const channelIdMatch = trimmed.match(/youtube\.com\/channel\/([^/?&#]+)/);
  if (channelIdMatch) {
    return {
      type: "youtube-channel",
      id: channelIdMatch[1],
      handle: null,
      url: trimmed,
      label: "YouTube · Channel",
    };
  }

  // TikTok — extract @handle and/or video id
  if (/tiktok\.com/.test(trimmed)) {
    const ttHandle = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)/);
    const ttVideoId = trimmed.match(/\/video\/(\d+)/);
    return {
      type: "tiktok",
      id: ttVideoId ? ttVideoId[1] : null,
      handle: ttHandle ? ttHandle[1] : null,
      url: trimmed,
      label: ttHandle ? `TikTok · @${ttHandle[1]}` : "TikTok · Content",
    };
  }

  // Instagram — extract handle from /username/ or reel/ URLs
  if (/instagram\.com/.test(trimmed)) {
    const igReel = trimmed.match(/instagram\.com\/reel\/([^/?&#]+)/);
    const igHandle = trimmed.match(
      /instagram\.com\/(?!reel\/|p\/|tv\/|stories\/)([a-zA-Z0-9_.]+)/
    );
    return {
      type: "instagram",
      id: igReel ? igReel[1] : null,
      handle: igHandle ? igHandle[1] : null,
      url: trimmed,
      label: igHandle
        ? `Instagram · @${igHandle[1]}`
        : igReel
          ? "Instagram · Reel"
          : "Instagram · Content",
    };
  }

  // X / Twitter
  if (/(?:twitter\.com|x\.com)/.test(trimmed)) {
    return {
      type: "x",
      id: null,
      handle: null,
      url: trimmed,
      label: "X · Post",
    };
  }

  // Plain @handle (assume YouTube)
  if (/^@?[a-zA-Z0-9_.-]+$/.test(trimmed) && !trimmed.includes(".")) {
    const handle = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
    return {
      type: "youtube-channel",
      id: null,
      handle,
      url: trimmed,
      label: `YouTube · Channel @${handle}`,
    };
  }

  return {
    type: "unknown",
    id: null,
    handle: null,
    url: trimmed,
    label: "Unknown format",
  };
}
