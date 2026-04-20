import type { CrossPromotion } from "./types";

const SOCIAL_PATTERNS: { platform: string; regex: RegExp }[] = [
  { platform: "Instagram", regex: /https?:\/\/(www\.)?instagram\.com\/[^\s)]+/gi },
  { platform: "Twitter/X", regex: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s)]+/gi },
  { platform: "TikTok", regex: /https?:\/\/(www\.)?tiktok\.com\/[^\s)]+/gi },
  { platform: "Discord", regex: /https?:\/\/(www\.)?(discord\.(gg|com))\/[^\s)]+/gi },
  { platform: "Telegram", regex: /https?:\/\/(www\.)?(t\.me|telegram\.me)\/[^\s)]+/gi },
  { platform: "Facebook", regex: /https?:\/\/(www\.)?facebook\.com\/[^\s)]+/gi },
];

export function detectCrossPromotion(description: string): CrossPromotion {
  const lower = description.toLowerCase();

  // Video links
  const videoRegex = /https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)[^\s)]+/gi;
  const videoMatches = description.match(videoRegex) || [];
  const videoLinks = videoMatches.length;

  // Playlist links
  const playlistRegex = /https?:\/\/(www\.)?youtube\.com\/playlist[^\s)]+/gi;
  const playlistMatches = description.match(playlistRegex) || [];
  const playlistLinks = playlistMatches.length;

  // Social links
  const socialLinks: { platform: string; url: string }[] = [];
  for (const { platform, regex } of SOCIAL_PATTERNS) {
    const matches = description.match(regex);
    if (matches) {
      socialLinks.push({ platform, url: matches[0] });
    }
  }

  // End screen likelihood
  const endScreenPhrases = [
    "watch next", "next video", "watch this", "check out my", "more videos",
    "playlist", "watch more", "related video", "recommended",
  ];
  const endScreenLikely = endScreenPhrases.some((p) => lower.includes(p));

  // Pinned comment CTA
  const pinnedPhrases = ["pinned comment", "comment below", "drop a comment", "leave a comment"];
  const pinnedCommentCTA = pinnedPhrases.some((p) => lower.includes(p));

  // Card links (links in first 100 chars or mentions of cards)
  const first100 = description.slice(0, 100).toLowerCase();
  const cardMentions = /card|i-card|info card/i.test(lower);
  const earlyLinks = /https?:\/\//.test(description.slice(0, 100));
  const cardLinks = (cardMentions ? 1 : 0) + (earlyLinks ? 1 : 0);

  // Ecosystem score
  let ecosystemScore = 0;
  if (videoLinks > 0) ecosystemScore += 20;
  if (playlistLinks > 0) ecosystemScore += 15;
  if (socialLinks.length >= 3) ecosystemScore += 20;
  else if (socialLinks.length >= 2) ecosystemScore += 12;
  else if (socialLinks.length >= 1) ecosystemScore += 6;
  if (endScreenLikely) ecosystemScore += 15;
  if (pinnedCommentCTA) ecosystemScore += 15;
  if (cardLinks > 0) ecosystemScore += 15;

  // Suggestions
  const suggestions: string[] = [];
  if (videoLinks === 0) suggestions.push("Add links to related videos to keep viewers in your ecosystem");
  if (playlistLinks === 0) suggestions.push("Include a playlist link — playlists boost session time significantly");
  if (socialLinks.length < 2) suggestions.push("Add social media links (Instagram, Twitter/X, Discord) to build community");
  if (!endScreenLikely) suggestions.push("Reference 'watch next' or specific videos near the end of description");
  if (!pinnedCommentCTA) suggestions.push("Mention pinned comment for engagement — 'Check the pinned comment for...'");

  return {
    videoLinks,
    playlistLinks,
    socialLinks,
    endScreenLikely,
    pinnedCommentCTA,
    cardLinks,
    ecosystemScore,
    suggestions,
  };
}
