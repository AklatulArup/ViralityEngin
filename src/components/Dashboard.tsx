"use client";

import { useState, useEffect } from "react";
import type {
  ModeId,
  VideoData,
  ChannelData,
  EnrichedVideo,
  ChannelHealth,
  AnalysisResult,
  VideoAnalysis,
  ReferenceStore,
  TikTokBatchAnalysis,
  KeywordBank,
  AdjacentVideoContext,
  NicheRanking,
  LanguageCPA,
  DescriptionSEO,
  EngagementDecay,
  ThumbnailAnalysis,
  CrossPromotion,
  TitleVariant,
  PublishTimeHeatmap,
  CompetitorGapMatrix,
  TagCorrelationResult,
  UploadCadenceResult,
} from "@/lib/types";
import { MODES } from "@/lib/modes";
import { parseInput } from "@/lib/url-parser";
import { runVRS, runTRS } from "@/lib/vrs";
import {
  daysAgo,
  velocity,
  engagement,
  formatNumber,
} from "@/lib/formatters";
import {
  GLOBAL_BASELINE,
  calculateMedian,
  isOutlier,
  vsBaseline,
  detectTrend,
  calculateUploadFrequency,
} from "@/lib/baseline";
import { computeDeepAnalysis } from "@/lib/deep-analysis";
import {
  buildReferenceEntry,
  findRelatedEntries,
} from "@/lib/reference-store";
import { expandKeywordBank } from "@/lib/keyword-bank";
import { findAdjacentVideos } from "@/lib/adjacent-videos";
import { computeNicheRanking } from "@/lib/niche-ranking";
import { computeLanguageCPA } from "@/lib/language-detect";
import { analyzeDescriptionSEO } from "@/lib/description-seo";
import { computeEngagementDecay } from "@/lib/engagement-decay";
import { analyzeThumbnail } from "@/lib/thumbnail-check";
import { detectCrossPromotion } from "@/lib/cross-promotion";
import { computePublishTimeHeatmap } from "@/lib/publish-time";
import { computeCompetitorGapMatrix } from "@/lib/competitor-gap";
import { computeTagCorrelation } from "@/lib/tag-correlation";
import { computeUploadCadence } from "@/lib/upload-cadence";
import ModeSelector from "./ModeSelector";
import UrlInput from "./UrlInput";
import VideoResult from "./VideoResult";
import ChannelResult from "./ChannelResult";
import CsvUpload from "./CsvUpload";
import TikTokBatchResult from "./TikTokBatchResult";
import ReferenceSearch from "./ReferenceSearch";
import ReferenceUpload from "./ReferenceUpload";
import ReferencePoolBuilder from "./ReferencePoolBuilder";
import ReverseEngineerPanel from "./ReverseEngineerPanel";
import KeywordBankManager from "./KeywordBankManager";
import HashtagBankManager from "./HashtagBankManager";
import CompetitorBankManager from "./CompetitorBankManager";
import type { Competitor } from "./CompetitorBankManager";
import CreatorBlocklist from "./CreatorBlocklist";
import ViewForecastPanel from "./ViewForecastPanel";

type InputTab = "youtube" | "youtube_short" | "tiktok" | "instagram";

function enrichVideo(
  v: VideoData,
  median: number,
  platform: "youtube" | "tiktok" = "youtube"
): EnrichedVideo {
  const days = daysAgo(v.publishedAt);
  const vel = velocity(v.views, days);
  const eng = engagement(v.likes, v.comments, v.views);
  const vrs = platform === "tiktok" ? runTRS(v) : runVRS(v);
  return {
    ...v,
    days,
    velocity: vel,
    engagement: eng,
    vrs,
    isOutlier: isOutlier(v.views, median),
    vsBaseline: vsBaseline(v.views, median),
  };
}

export default function Dashboard() {
  const [activeModes, setActiveModes] = useState<ModeId[]>(["F", "G", "C"]);
  const [inputTab, setInputTab] = useState<InputTab>("youtube");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastUrl, setLastUrl] = useState("");
  const [referenceStore, setReferenceStore] = useState<ReferenceStore | null>(null);
  const [refStoreStatus, setRefStoreStatus] = useState<"idle" | "saved" | "updated">("idle");
  const [tiktokUploadInfo, setTiktokUploadInfo] = useState<{
    videoCount: number;
    uploadCount: number;
    time: string;
  } | null>(null);
  const [keywordBank, setKeywordBank] = useState<KeywordBank | null>(null);
  const [blocklistKey, setBlocklistKey] = useState(0);
  const [hashtagBank, setHashtagBank] = useState<{
    version: number;
    lastUpdated: string;
    categories: { viral: string[]; brand: string[]; niche: string[]; campaign: string[] };
  } | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [forecastDate, setForecastDate] = useState<string>("");
  const [instagramInput, setInstagramInput] = useState("");
  const [instagramStatus, setInstagramStatus] = useState("");
  const [tiktokInputVal, setTiktokInputVal] = useState("");
  const [youtubeShortInput, setYoutubeShortInput] = useState("");
  const [activePanel, setActivePanel] = useState<"libraries" | "ref-tools" | "reverse-engineer" | null>(null);

  // Extra analysis results for video mode
  const [adjacentCtx, setAdjacentCtx] = useState<AdjacentVideoContext | null>(null);
  const [nicheRanking, setNicheRanking] = useState<NicheRanking | null>(null);
  const [languageCPA, setLanguageCPA] = useState<LanguageCPA[] | null>(null);

  // New feature states
  const [descSEO, setDescSEO] = useState<DescriptionSEO | null>(null);
  const [engDecay, setEngDecay] = useState<EngagementDecay | null>(null);
  const [thumbAnalysis, setThumbAnalysis] = useState<ThumbnailAnalysis | null>(null);
  const [crossPromo, setCrossPromo] = useState<CrossPromotion | null>(null);
  const [publishTime, setPublishTime] = useState<PublishTimeHeatmap | null>(null);
  const [competitorGap, setCompetitorGap] = useState<CompetitorGapMatrix | null>(null);
  const [tagCorrelation, setTagCorrelation] = useState<TagCorrelationResult | null>(null);
  const [uploadCadence, setUploadCadence] = useState<UploadCadenceResult | null>(null);

  // Load reference store and keyword bank on mount
  useEffect(() => {
    fetch("/api/reference-store")
      .then((r) => r.json())
      .then((store: ReferenceStore) => setReferenceStore(store))
      .catch(() => {});
    fetch("/api/keyword-bank")
      .then((r) => r.json())
      .then((bank: KeywordBank) => setKeywordBank(bank))
      .catch(() => {});
    fetch("/api/hashtag-bank")
      .then((r) => r.json())
      .then(setHashtagBank)
      .catch(() => {});
    fetch("/api/competitor-bank")
      .then((r) => r.json())
      .then(setCompetitors)
      .catch(() => {});
  }, []);

  const refreshReferenceStore = () => {
    fetch("/api/reference-store")
      .then((r) => r.json())
      .then((store: ReferenceStore) => {
        setReferenceStore(store);
      })
      .catch(() => {});
    // Also refresh keyword bank since pool expansions can add new keywords
    fetch("/api/keyword-bank")
      .then((r) => r.json())
      .then((bank: KeywordBank) => setKeywordBank(bank))
      .catch(() => {});
  };

  const toggleMode = (id: ModeId) => {
    setActiveModes((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => setActiveModes(MODES.map((m) => m.id));
  const clearModes = () => setActiveModes([]);

  // Expand keyword bank with new video data
  const expandBank = (title: string, description: string, tags: string[]) => {
    if (!keywordBank) return;
    const { bank: updated, newKeywords } = expandKeywordBank(keywordBank, title, description, tags);
    if (newKeywords.length > 0) {
      setKeywordBank(updated);
      // Persist to server
      fetch("/api/keyword-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: newKeywords }),
      }).catch(() => {});
    }
  };

  // ─── TikTok CSV Upload Handler ───
  const analyzeTikTok = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAdjacentCtx(null);
    setNicheRanking(null);
    setLanguageCPA(null);
    setDescSEO(null);
    setEngDecay(null);
    setThumbAnalysis(null);
    setCrossPromo(null);
    setPublishTime(null);
    setCompetitorGap(null);
    setTagCorrelation(null);
    setUploadCadence(null);
    setStatus("Uploading CSV...");

    try {
      const formData = new FormData();
      formData.append("csv", file);

      const uploadRes = await fetch("/api/tiktok/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      setTiktokUploadInfo({
        videoCount: uploadData.videoCount,
        uploadCount: uploadData.uploadCount,
        time: new Date().toLocaleString(),
      });

      setStatus(`Parsed ${uploadData.videoCount} videos. Analyzing...`);

      const storeRes = await fetch("/api/tiktok/upload");
      const store = await storeRes.json();
      const videos: VideoData[] = store.videos;

      if (videos.length === 0) throw new Error("No videos in store");

      const medianViews = calculateMedian(videos.map((v) => v.views));

      setStatus("Computing TRS scores...");
      const enriched = videos
        .map((v) => enrichVideo(v, medianViews, "tiktok"))
        .sort((a, b) => b.views - a.views);

      const topPerformers = enriched.slice(0, 10);

      const creatorMap: Record<string, { views: number[]; scores: number[] }> = {};
      for (const v of enriched) {
        const handle = v.channel || "unknown";
        if (!creatorMap[handle]) creatorMap[handle] = { views: [], scores: [] };
        creatorMap[handle].views.push(v.views);
        creatorMap[handle].scores.push(v.vrs.estimatedFullScore);
      }

      const competitorBreakdown = Object.entries(creatorMap)
        .map(([handle, data]) => ({
          handle,
          videoCount: data.views.length,
          avgViews: Math.round(data.views.reduce((s, v) => s + v, 0) / data.views.length),
          avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
        }))
        .sort((a, b) => b.avgViews - a.avgViews);

      setStatus("Computing deep analysis...");
      const relatedEntries = referenceStore
        ? referenceStore.entries.filter((e) => e.platform === "tiktok")
        : [];

      const deepAnalysis = computeDeepAnalysis(enriched, null, relatedEntries, "tiktok");

      const batchResult: TikTokBatchAnalysis = {
        type: "tiktok-batch",
        videos: enriched,
        deepAnalysis,
        topPerformers,
        competitorBreakdown,
        referenceContext: relatedEntries,
      };

      setResult(batchResult);

      // Language CPA for TikTok batch
      setLanguageCPA(computeLanguageCPA(enriched));

      // Save to reference store
      const entries = buildReferenceEntry(batchResult);
      const entryArray = Array.isArray(entries) ? entries : [entries];
      if (entryArray.length > 0) {
        fetch("/api/reference-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entryArray),
        })
          .then((r) => r.json())
          .then(() => {
            setRefStoreStatus("saved");
            refreshReferenceStore();
          })
          .catch(() => {});
      }

      setStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("");
    }

    setLoading(false);
  };

  // ─── YouTube Analysis Handler ───
  const analyze = async (url: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAdjacentCtx(null);
    setNicheRanking(null);
    setLanguageCPA(null);
    setDescSEO(null);
    setEngDecay(null);
    setThumbAnalysis(null);
    setCrossPromo(null);
    setPublishTime(null);
    setCompetitorGap(null);
    setTagCorrelation(null);
    setUploadCadence(null);
    setLastUrl(url);

    try {
      const parsed = parseInput(url);

      if (
        parsed.type === "youtube-channel" &&
        (parsed.handle || parsed.id)
      ) {
        // ── Channel analysis ──
        let channelData: ChannelData;

        if (parsed.handle) {
          setStatus(`Fetching channel @${parsed.handle}...`);
          const res = await fetch(`/api/youtube/handle?handle=${encodeURIComponent(parsed.handle)}`);
          if (!res.ok) throw new Error("Channel not found");
          channelData = await res.json();
        } else {
          setStatus(`Fetching channel...`);
          const res = await fetch(`/api/youtube/channel?id=${encodeURIComponent(parsed.id!)}`);
          if (!res.ok) throw new Error("Channel not found");
          channelData = await res.json();
        }

        setStatus(`Found ${channelData.name} · Fetching recent videos...`);

        let videos: VideoData[] = [];
        if (channelData.uploads) {
          const res = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(channelData.uploads)}&max=20`);
          if (res.ok) videos = await res.json();
        }

        const viewCounts = videos.map((v) => v.views);
        const medianViews = calculateMedian(viewCounts);

        // Compute channel context for VRS criteria
        const uploadFreq = videos.length >= 2 ? calculateUploadFrequency(videos.map((v) => ({
          ...v, days: 0, velocity: 0, engagement: 0,
          vrs: { score: 0, estimatedFullScore: 0, earned: 0, possible: 0, totalWeight: 0, estimatedHiddenScore: 0, tierSummaries: [], criteria: [], gaps: [], topFixes: [], hiddenCount: 0 },
          isOutlier: false, vsBaseline: 0,
        }))) : 0;

        const channelAgeDays = videos.length > 0
          ? Math.max(1, (Date.now() - new Date(videos[videos.length - 1]?.publishedAt || Date.now()).getTime()) / 86_400_000)
          : 365;

        const channelCtx = {
          subs: channelData.subs,
          videoCount: channelData.videoCount,
          uploadFrequency: uploadFreq,
          recentVideoTitles: videos.slice(0, 10).map((v) => v.title),
          channelAgeDays: Math.round(channelAgeDays),
        };

        // Attach channel context to each video before enriching
        const videosWithCtx = videos.map((v) => ({ ...v, channelContext: channelCtx }));

        const enriched = videosWithCtx
          .map((v) => enrichVideo(v, medianViews))
          .sort((a, b) => b.views - a.views);

        const velocities = enriched.map((v) => v.velocity);
        const engagements = enriched.map((v) => v.engagement);
        const medianVelocity = calculateMedian(velocities);
        const medianEngagement = parseFloat(
          (calculateMedian(engagements.map((e) => Math.round(e * 100))) / 100).toFixed(2)
        );

        const outliers = enriched.filter((v) => v.isOutlier);

        const health: ChannelHealth = {
          channel: channelData,
          videos: enriched,
          medianViews,
          medianVelocity,
          medianEngagement,
          outliers,
          outlierRate: enriched.length > 0 ? (outliers.length / enriched.length) * 100 : 0,
          uploadFrequency: uploadFreq,
          trend: detectTrend(enriched),
        };

        setStatus("Computing deep analysis...");
        const relatedEntries = referenceStore ? findRelatedEntries(referenceStore, channelData.id) : [];
        const deepAnalysis = computeDeepAnalysis(enriched, channelData, relatedEntries);

        // Language CPA
        setLanguageCPA(computeLanguageCPA(enriched));

        const channelResult: AnalysisResult = {
          type: "channel",
          health,
          deepAnalysis,
          referenceContext: relatedEntries,
        };
        setResult(channelResult);

        // Expand keyword bank
        for (const v of enriched.slice(0, 5)) {
          expandBank(v.title, v.description, v.tags);
        }

        // Save to reference store
        const entryOrEntries = buildReferenceEntry(channelResult);
        const entry = Array.isArray(entryOrEntries) ? entryOrEntries[0] : entryOrEntries;
        if (entry) {
          fetch("/api/reference-store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          })
            .then((r) => r.json())
            .then((res) => {
              setRefStoreStatus(res.action === "updated" ? "updated" : "saved");
              refreshReferenceStore();
            })
            .catch(() => {});
        }

        setStatus("");
      } else if (
        parsed.type === "youtube-video" ||
        parsed.type === "youtube-short"
      ) {
        // ── Video analysis ──
        if (!parsed.id) throw new Error("Could not parse video ID from URL");

        setStatus("Fetching video data...");
        const vRes = await fetch(`/api/youtube/video?id=${encodeURIComponent(parsed.id)}`);
        if (!vRes.ok) throw new Error("Video not found");
        const videoData: VideoData = await vRes.json();

        setStatus(`Got "${videoData.title}" · Fetching channel...`);
        let channelData: ChannelData | null = null;
        try {
          const cRes = await fetch(`/api/youtube/channel?id=${encodeURIComponent(videoData.channelId)}`);
          if (cRes.ok) channelData = await cRes.json();
        } catch {
          // Channel fetch is non-critical
        }

        setStatus("Fetching channel baseline...");
        let recentVideos: VideoData[] = [];
        if (channelData?.uploads) {
          try {
            const pRes = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(channelData.uploads)}&max=12`);
            if (pRes.ok) recentVideos = await pRes.json();
          } catch {
            // Playlist fetch is non-critical
          }
        }

        const channelMedian =
          recentVideos.length > 0
            ? calculateMedian(recentVideos.map((v) => v.views))
            : GLOBAL_BASELINE.medianViews;

        // Build channel context
        const uploadFreq = recentVideos.length >= 2 ? calculateUploadFrequency(recentVideos.map((v) => ({
          ...v, days: 0, velocity: 0, engagement: 0,
          vrs: { score: 0, estimatedFullScore: 0, earned: 0, possible: 0, totalWeight: 0, estimatedHiddenScore: 0, tierSummaries: [], criteria: [], gaps: [], topFixes: [], hiddenCount: 0 },
          isOutlier: false, vsBaseline: 0,
        }))) : 0;

        const channelAgeDays = recentVideos.length > 0
          ? Math.max(1, (Date.now() - new Date(recentVideos[recentVideos.length - 1]?.publishedAt || Date.now()).getTime()) / 86_400_000)
          : 365;

        const channelCtx = channelData ? {
          subs: channelData.subs,
          videoCount: channelData.videoCount,
          uploadFrequency: uploadFreq,
          recentVideoTitles: recentVideos.slice(0, 10).map((v) => v.title),
          channelAgeDays: Math.round(channelAgeDays),
        } : undefined;

        // Attach channel context
        const videoWithCtx = { ...videoData, channelContext: channelCtx };
        const enrichedVideo = enrichVideo(videoWithCtx, channelMedian);

        const enrichedRecent = recentVideos
          .map((v) => enrichVideo({ ...v, channelContext: channelCtx }, channelMedian))
          .sort((a, b) => b.views - a.views);

        // Adjacent videos
        setStatus("Finding adjacent videos...");
        const adjCtx = findAdjacentVideos(enrichedVideo, enrichedRecent);
        setAdjacentCtx(adjCtx);

        // Compute deep analysis
        setStatus("Computing deep analysis...");
        const relatedEntries = referenceStore && channelData
          ? findRelatedEntries(referenceStore, channelData.id)
          : [];
        const deepAnalysis = enrichedRecent.length >= 3
          ? computeDeepAnalysis(enrichedRecent, channelData, relatedEntries)
          : null;

        // Language CPA from recent videos
        if (enrichedRecent.length >= 3) {
          setLanguageCPA(computeLanguageCPA(enrichedRecent));
        }

        // Niche competitive ranking
        if (referenceStore && keywordBank) {
          setStatus("Computing niche ranking...");
          const ranking = computeNicheRanking(
            enrichedVideo.title,
            enrichedVideo.views,
            enrichedVideo.vrs.estimatedFullScore,
            enrichedVideo.engagement,
            enrichedVideo.channel,
            referenceStore.entries,
            keywordBank
          );
          setNicheRanking(ranking);
        }

        // ── New feature computations ──
        // Description SEO
        if (keywordBank) {
          setDescSEO(analyzeDescriptionSEO(videoData.description, videoData.title, keywordBank));
        }
        // Engagement Decay
        setEngDecay(computeEngagementDecay(enrichedVideo));
        // Thumbnail Analysis
        setThumbAnalysis(analyzeThumbnail(videoData.thumbnail, videoData.id));
        // Cross-Promotion
        setCrossPromo(detectCrossPromotion(videoData.description));

        // Reference pool aggregate features
        if (referenceStore && referenceStore.entries.length >= 3) {
          setPublishTime(computePublishTimeHeatmap(referenceStore.entries));
          setTagCorrelation(computeTagCorrelation(referenceStore.entries));
          setUploadCadence(computeUploadCadence(referenceStore.entries));
          if (keywordBank) {
            setCompetitorGap(computeCompetitorGapMatrix(
              "fundednext",
              referenceStore.entries,
              keywordBank
            ));
          }
        }

        const videoResult: AnalysisResult = {
          type: "video",
          video: enrichedVideo,
          channel: channelData,
          channelMedian,
          recentVideos: enrichedRecent,
          deepAnalysis,
          referenceContext: relatedEntries,
        };
        setResult(videoResult);

        // Expand keyword bank
        expandBank(videoData.title, videoData.description, videoData.tags);

        // Save to reference store
        const vidEntryOrEntries = buildReferenceEntry(videoResult);
        const vidEntry = Array.isArray(vidEntryOrEntries) ? vidEntryOrEntries[0] : vidEntryOrEntries;
        if (vidEntry) {
          fetch("/api/reference-store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vidEntry),
          })
            .then((r) => r.json())
            .then((res) => {
              setRefStoreStatus(res.action === "updated" ? "updated" : "saved");
              refreshReferenceStore();
            })
            .catch(() => {});
        }

        setStatus("");
      } else if (parsed.type === "tiktok") {
        // ── TikTok via Apify scraper ──
        setStatus(`Scraping TikTok${parsed.handle ? ` @${parsed.handle}` : ""}...`);
        const scrapeRes = await fetch("/api/tiktok/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: parsed.url, handle: parsed.handle, limit: 50 }),
        });
        if (!scrapeRes.ok) {
          const err = await scrapeRes.json();
          throw new Error(err.error || "TikTok scrape failed");
        }
        const scrapeData = await scrapeRes.json();
        const ttVideos: VideoData[] = scrapeData.videos;
        if (!ttVideos.length) throw new Error("No TikTok videos returned");

        // Store and run existing TikTok batch pipeline
        const store = await fetch("/api/tiktok/upload", {
          method: "POST",
          body: (() => { const fd = new FormData(); fd.append("json", JSON.stringify(ttVideos)); return fd; })(),
        }).catch(() => null);
        void store;

        const medianViews = calculateMedian(ttVideos.map((v) => v.views));
        setStatus("Computing scores...");
        const enriched = ttVideos.map((v) => enrichVideo(v, medianViews, "tiktok")).sort((a, b) => b.views - a.views);
        const relatedEntries = referenceStore ? referenceStore.entries.filter((e) => e.platform === "tiktok") : [];

        // Single video URL → promote to VideoAnalysis (same rich display as YouTube)
        const isSingleVideo = parsed.url?.includes("/video/") && enriched.length === 1;
        if (isSingleVideo) {
          const v = enriched[0];
          const ttChannel: ChannelData = {
            id: v.channelId || v.channel,
            name: v.channel,
            subs: (v as unknown as { creatorFollowers?: number }).creatorFollowers || 0,
            totalViews: v.views,
            videoCount: 1,
            uploads: null,
            avatar: "",
          };
          const deepSingle = computeDeepAnalysis([v], null, relatedEntries, "tiktok");
          const videoResult: VideoAnalysis = { type: "video", video: v, channel: ttChannel, channelMedian: v.views, recentVideos: [v], deepAnalysis: deepSingle, referenceContext: relatedEntries };
          setResult(videoResult);
          setLanguageCPA(computeLanguageCPA([v]));
        } else {
          const topPerformers = enriched.slice(0, 10);
          const creatorMap: Record<string, { views: number[]; scores: number[] }> = {};
          for (const v of enriched) {
            const h = v.channel || "unknown";
            if (!creatorMap[h]) creatorMap[h] = { views: [], scores: [] };
            creatorMap[h].views.push(v.views);
            creatorMap[h].scores.push(v.vrs.estimatedFullScore);
          }
          const competitorBreakdown = Object.entries(creatorMap)
            .map(([handle, data]) => ({
              handle,
              videoCount: data.views.length,
              avgViews: Math.round(data.views.reduce((s, v) => s + v, 0) / data.views.length),
              avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
            }))
            .sort((a, b) => b.avgViews - a.avgViews);
          const deepAnalysis = computeDeepAnalysis(enriched, null, relatedEntries, "tiktok");
          const batchResult: TikTokBatchAnalysis = { type: "tiktok-batch", videos: enriched, deepAnalysis, topPerformers, competitorBreakdown, referenceContext: relatedEntries };
          setResult(batchResult);
          setLanguageCPA(computeLanguageCPA(enriched));
          setTiktokUploadInfo({ videoCount: ttVideos.length, uploadCount: 1, time: new Date().toLocaleString() });
          const entries = buildReferenceEntry(batchResult);
          const entryArray = Array.isArray(entries) ? entries : [entries];
          if (entryArray.length > 0) {
            fetch("/api/reference-store", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entryArray) })
              .then(() => { setRefStoreStatus("saved"); refreshReferenceStore(); }).catch(() => {});
          }
        }
        setStatus("");

      } else if (parsed.type === "instagram") {
        // ── Instagram via Apify scraper ──
        setStatus(`Scraping Instagram${parsed.handle ? ` @${parsed.handle}` : ""}...`);
        const igRes = await fetch("/api/instagram/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: parsed.url && parsed.url.includes("instagram.com/") ? [parsed.url] : [],
            handle: parsed.handle,
            limit: 30,
          }),
        });
        if (!igRes.ok) {
          const err = await igRes.json();
          throw new Error(err.error || "Instagram scrape failed");
        }
        const igData = await igRes.json();
        const igVideos: VideoData[] = igData.videos;
        if (!igVideos.length) throw new Error("No Instagram posts returned");

        const medianIG = calculateMedian(igVideos.map((v) => v.views));
        setStatus("Computing scores...");
        const enrichedIG = igVideos.map((v) => enrichVideo(v, medianIG, "tiktok")).sort((a, b) => b.views - a.views);
        const igRelated = referenceStore ? referenceStore.entries.filter((e) => e.platform === "tiktok") : [];

        // Single post/reel URL → promote to VideoAnalysis (same rich display as YouTube)
        const isIgSingle = (parsed.url?.includes("/reel/") || parsed.url?.includes("/p/")) && enrichedIG.length === 1;
        if (isIgSingle) {
          const v = enrichedIG[0];
          const igChannel: ChannelData = {
            id: v.channelId || v.channel,
            name: v.channel,
            subs: (v as unknown as { creatorFollowers?: number }).creatorFollowers || 0,
            totalViews: v.views,
            videoCount: 1,
            uploads: null,
            avatar: "",
          };
          const igDeepSingle = computeDeepAnalysis([v], null, igRelated, "tiktok");
          const igVideoResult: VideoAnalysis = { type: "video", video: v, channel: igChannel, channelMedian: v.views, recentVideos: [v], deepAnalysis: igDeepSingle, referenceContext: igRelated };
          setResult(igVideoResult);
          setLanguageCPA(computeLanguageCPA([v]));
        } else {
          const igTopPerformers = enrichedIG.slice(0, 10);
          const igCreatorMap: Record<string, { views: number[]; scores: number[] }> = {};
          for (const v of enrichedIG) {
            const h = v.channel || "unknown";
            if (!igCreatorMap[h]) igCreatorMap[h] = { views: [], scores: [] };
            igCreatorMap[h].views.push(v.views);
            igCreatorMap[h].scores.push(v.vrs.estimatedFullScore);
          }
          const igBreakdown = Object.entries(igCreatorMap)
            .map(([handle, data]) => ({
              handle,
              videoCount: data.views.length,
              avgViews: Math.round(data.views.reduce((s, v) => s + v, 0) / data.views.length),
              avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
            }))
            .sort((a, b) => b.avgViews - a.avgViews);
          const igDeep = computeDeepAnalysis(enrichedIG, null, igRelated, "tiktok");
          const igBatch: TikTokBatchAnalysis = { type: "tiktok-batch", videos: enrichedIG, deepAnalysis: igDeep, topPerformers: igTopPerformers, competitorBreakdown: igBreakdown, referenceContext: igRelated };
          setResult(igBatch);
          setLanguageCPA(computeLanguageCPA(enrichedIG));
        }
        setStatus("");

      } else if (parsed.type === "unknown") {
        throw new Error("Could not detect input type. Paste a YouTube, TikTok, or Instagram URL / @handle.");
      } else {
        throw new Error(`${parsed.label} — paste a YouTube, TikTok, or Instagram URL.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("");
    }

    setLoading(false);
  };

  // ─── Instagram Save Handler ───
  const saveInstagram = async (inputs: string[]) => {
    const filtered = inputs.map((s) => s.trim()).filter(Boolean);
    if (filtered.length === 0) return;
    setInstagramStatus("Saving...");
    try {
      const res = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: filtered }),
      });
      const data = await res.json();
      setInstagramStatus(`Saved ${data.added} new · ${data.total} total queued`);
      setInstagramInput("");
    } catch {
      setInstagramStatus("Failed to save");
    }
    setTimeout(() => setInstagramStatus(""), 3000);
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#000000", color: "#E8E6E1" }}>
      {/* ── Static dot-grid background ── */}
      <div className="dot-grid-bg" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }} />

      {/* ══════════════ LEFT SIDEBAR ══════════════ */}
      <aside
        className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col overflow-y-auto z-40"
        style={{ background: "#0A0A08", borderRight: "1px solid #1C1C1A", zIndex: 40 }}
      >
        {/* Logo */}
        <div className="px-4 h-14 flex items-center gap-2.5 shrink-0" style={{ borderBottom: "1px solid #1C1C1A" }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-extrabold shrink-0"
            style={{ background: "#60A5FA", color: "#000" }}>
            FN
          </div>
          <span className="text-[13px] font-semibold tracking-tight gradient-text-brand">FundedNext Intel</span>
        </div>

        {/* Platform Nav */}
        <div className="px-2 pt-4 pb-2">
          <div className="text-[10px] font-semibold tracking-widest px-2 mb-1" style={{ color: "#6B6860", letterSpacing: "0.12em" }}>PLATFORM</div>
          {([
            { id: "youtube" as InputTab, label: "YT Long-form", icon: "▶", color: "#EF4444" },
            { id: "youtube_short" as InputTab, label: "YT Shorts", icon: "⚡", color: "#EC4899" },
            { id: "tiktok" as InputTab, label: "TikTok", icon: "♪", color: "#06B6D4" },
            { id: "instagram" as InputTab, label: "Instagram", icon: "◎", color: "#E1306C" },
          ]).map(({ id, label, icon, color }) => {
            const active = inputTab === id;
            return (
              <button
                key={id}
                onClick={() => setInputTab(id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-all text-left mb-0.5 rounded-md"
                style={{
                  background: active ? "#111110" : "transparent",
                  color: active ? "#E8E6E1" : "#6B6860",
                  borderLeft: active ? `2px solid ${color}` : "2px solid transparent",
                }}
              >
                <span style={{ color: active ? color : "#3A3835", fontSize: 11 }}>{icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        <div className="glass-divider mx-4 my-2" />

        {/* Analysis Modes */}
        <div className="px-2 py-2">
          <div className="text-[10px] font-semibold tracking-widest px-2 mb-1" style={{ color: "#6B6860", letterSpacing: "0.12em" }}>ANALYSIS MODES</div>
          <ModeSelector activeModes={activeModes} onToggle={toggleMode} onSelectAll={selectAll} onClear={clearModes} />
        </div>

        <div className="glass-divider mx-4 my-2" />

        {/* Pool Stats */}
        <div className="px-4 py-3">
          <div className="text-[10px] font-semibold tracking-widest mb-2" style={{ color: "#6B6860", letterSpacing: "0.12em" }}>REFERENCE POOL</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { value: referenceStore?.entries.filter(e => e.type === "video").length ?? 0, label: "Videos", color: "#2ECC8A" },
              { value: referenceStore ? new Set(referenceStore.entries.map(e => e.channelName)).size : 0, label: "Creators", color: "#60A5FA" },
              { value: referenceStore?.entries.filter(e => e.type === "video" && (e.durationSeconds ?? 999) <= 60).length ?? 0, label: "Shorts", color: "#EC4899" },
              { value: keywordBank?.categories.niche.length ?? 0, label: "Keywords", color: "#F59E0B" },
            ].map(({ value, label, color }) => (
              <div key={label} className="glass-card" style={{ padding: "8px 10px" }}>
                <div className="text-[18px] font-bold leading-none font-mono" style={{ color, fontFamily: "var(--font-mono)" }}>
                  {typeof value === "number" && value >= 1000 ? `${(value/1000).toFixed(1)}K` : value}
                </div>
                <div className="text-[9px] mt-0.5 uppercase tracking-wider" style={{ color: "#6B6860" }}>{label}</div>
              </div>
            ))}
          </div>
          {refStoreStatus !== "idle" && (
            <div className="mt-2 text-[10px] font-medium" style={{ color: "#2ECC8A" }}>✓ Saved to pool</div>
          )}
        </div>

        <div className="glass-divider mx-4 my-2" />

        {/* Reverse Engineer — Tools section */}
        <div className="px-2 py-2">
          <div className="text-[10px] font-semibold tracking-widest px-2 mb-1" style={{ color: "#6B6860", letterSpacing: "0.12em" }}>TOOLS</div>
          {(() => {
            const active = activePanel === "reverse-engineer";
            return (
              <button
                onClick={() => {
                  const next = active ? null : "reverse-engineer";
                  setActivePanel(next);
                  if (next === "reverse-engineer" && !activeModes.includes("D")) toggleMode("D");
                }}
                className="w-full text-left px-3 py-2.5 rounded-md transition-all"
                style={{
                  background: active ? "#111110" : "transparent",
                  color: active ? "#E8E6E1" : "#6B6860",
                  borderLeft: active ? "2px solid #F59E0B" : "2px solid transparent",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px]" style={{ color: active ? "#F59E0B" : "#3A3835" }}>⚙</span>
                  <div className="flex-1">
                    <div className="text-[12px] font-medium" style={{ color: active ? "#E8E6E1" : "#9E9C97" }}>Reverse Engineer</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "#4A4845" }}>Script · Hook · Title · Algorithm</div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#1C1C1A", color: "#9E9C97" }}>D</span>
                </div>
              </button>
            );
          })()}
        </div>

        <div className="glass-divider mx-4 my-2" />

        {/* Nav buttons → open panels in main content */}
        <div className="px-2 py-2 space-y-0.5">
          {([
            { id: "libraries" as const, label: "Libraries", icon: "◧", desc: "Keywords · Hashtags · Competitors" },
            { id: "ref-tools" as const, label: "Reference Tools", icon: "⊞", desc: "Upload · Browse · Build pool" },
          ]).map(({ id, label, icon, desc }) => {
            const active = activePanel === id;
            return (
              <button
                key={id}
                onClick={() => setActivePanel(active ? null : id)}
                className="w-full text-left px-3 py-2.5 rounded-md transition-all"
                style={{
                  background: active ? "#111110" : "transparent",
                  borderLeft: active ? "2px solid #60A5FA" : "2px solid transparent",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px]" style={{ color: active ? "#60A5FA" : "#3A3835" }}>{icon}</span>
                  <span className="text-[12px] font-medium" style={{ color: active ? "#E8E6E1" : "#9E9C97" }}>{label}</span>
                  <span className="ml-auto text-[10px]" style={{ color: "#4A4845", display: "inline-block", transition: "transform 0.15s", transform: active ? "rotate(90deg)" : "none" }}>›</span>
                </div>
                <div className="text-[10px] mt-0.5 ml-6" style={{ color: "#4A4845" }}>{desc}</div>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />
      </aside>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <main className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: 240 }}>

        {/* ── Sticky top search bar ── */}
        <div
          className="sticky top-0 z-30 px-6 py-3 flex items-center gap-3"
          style={{ background: "#000000", borderBottom: "1px solid #1C1C1A", position: "relative", zIndex: 30 }}
        >
          {/* Search input — adapts to active platform */}
          {inputTab === "youtube" && (
            <div className="flex-1">
              <UrlInput onAnalyze={analyze} loading={loading} status={status} error={error} />
            </div>
          )}

          {inputTab === "youtube_short" && (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={youtubeShortInput}
                onChange={e => setYoutubeShortInput(e.target.value)}
                placeholder="https://youtube.com/shorts/VIDEO_ID or @channel"
                className="glass-input flex-1 rounded-md px-4 py-2.5 text-[13px] outline-none"
                style={{ color: "#E8E6E1" }}
                onKeyDown={e => {
                  if (e.key === "Enter" && youtubeShortInput.trim()) {
                    analyze(youtubeShortInput.trim());
                  }
                }}
              />
              <button
                onClick={() => { if (youtubeShortInput.trim()) analyze(youtubeShortInput.trim()); }}
                disabled={loading || !youtubeShortInput.trim()}
                className="rounded-md px-5 py-2.5 text-[13px] font-semibold shrink-0 transition-opacity"
                style={{ background: "#EC4899", color: "#fff", opacity: (loading || !youtubeShortInput.trim()) ? 0.4 : 1 }}
              >
                {loading ? "…" : "Analyze"}
              </button>
            </div>
          )}

          {inputTab === "tiktok" && (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={tiktokInputVal}
                onChange={e => setTiktokInputVal(e.target.value)}
                placeholder="https://tiktok.com/@handle or @username"
                className="glass-input flex-1 rounded-md px-4 py-2.5 text-[13px]" style={{ color: "#E8E6E1" }}
                onKeyDown={e => {
                  if (e.key === "Enter" && tiktokInputVal.trim()) {
                    const v = tiktokInputVal.trim();
                    analyze(v.includes("tiktok.com") ? v : `https://www.tiktok.com/@${v.replace(/^@/, "")}`);
                  }
                }}
              />
              <button
                onClick={() => {
                  const v = tiktokInputVal.trim();
                  if (v) analyze(v.includes("tiktok.com") ? v : `https://www.tiktok.com/@${v.replace(/^@/, "")}`);
                }}
                disabled={loading || !tiktokInputVal.trim()}
                className="rounded-md px-5 py-2.5 text-[13px] font-semibold shrink-0 transition-opacity"
                style={{ background: "#06B6D4", color: "#000", opacity: (loading || !tiktokInputVal.trim()) ? 0.4 : 1 }}
              >
                {loading ? "…" : "Analyze"}
              </button>
              <div className="shrink-0">
                <CsvUpload onUpload={analyzeTikTok} loading={loading} lastUpload={tiktokUploadInfo} />
              </div>
            </div>
          )}

          {inputTab === "instagram" && (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={instagramInput}
                onChange={e => setInstagramInput(e.target.value)}
                placeholder="@handle or https://instagram.com/reel/..."
                className="glass-input flex-1 rounded-md px-4 py-2.5 text-[13px]" style={{ color: "#E8E6E1" }}
                onKeyDown={e => {
                  if (e.key === "Enter" && instagramInput.trim()) {
                    const v = instagramInput.trim();
                    const normalized = v.includes("instagram.com") ? v : `https://www.instagram.com/${v.replace(/^@/, "")}/`;
                    analyze(normalized);
                  }
                }}
              />
              <button
                onClick={() => {
                  const v = instagramInput.trim();
                  if (!v) return;
                  const normalized = v.includes("instagram.com") ? v : `https://www.instagram.com/${v.replace(/^@/, "")}/`;
                  analyze(normalized);
                }}
                disabled={loading || !instagramInput.trim()}
                className="rounded-md px-5 py-2.5 text-[13px] font-semibold shrink-0 transition-opacity"
                style={{ background: "#E1306C", color: "#fff", opacity: (loading || !instagramInput.trim()) ? 0.4 : 1 }}
              >
                {loading ? "…" : "Analyze"}
              </button>
              <button
                onClick={() => saveInstagram(instagramInput.split("\n"))}
                disabled={!instagramInput.trim()}
                className="rounded-md px-4 py-2.5 text-[13px] font-medium shrink-0"
                style={{ background: "#111110", color: "#9E9C97", border: "1px solid #252523" }}
              >
                Queue
              </button>
            </div>
          )}

          {/* Status / error chips */}
          {status && (
            <span className="glass-pill text-[11px] shrink-0 px-3 py-1 rounded-md" style={{ color: "#2ECC8A" }}>
              {status}
            </span>
          )}
          {error && (
            <span className="glass-pill text-[11px] shrink-0 px-3 py-1 rounded-md" style={{ color: "#EF4444" }}>
              {error}
            </span>
          )}
          {instagramStatus && (
            <span className="glass-pill text-[11px] shrink-0 px-3 py-1 rounded-md" style={{ color: "#2ECC8A" }}>
              {instagramStatus}
            </span>
          )}
        </div>

        {/* ── Page content ── */}
        <div className="flex-1 p-6" style={{ position: "relative", zIndex: 2 }}>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-lg h-24" style={{ background: "#0D0D0B", border: "1px solid #252523", animation: `glowPulse ${1.8 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <div className="rounded-lg h-48" style={{ background: "#0D0D0B", border: "1px solid #252523", animation: "glowPulse 2.4s ease-in-out infinite 0.6s" }} />
              <div className="rounded-lg h-32" style={{ background: "#0D0D0B", border: "1px solid #252523", animation: "glowPulse 2.1s ease-in-out infinite 0.9s" }} />
            </div>
          )}

          {/* ── Reverse Engineer panel ── */}
          {activePanel === "reverse-engineer" && (
            <div className="mb-6 fade-up">
              <ReverseEngineerPanel
                platform={inputTab === "youtube_short" ? "youtube_short" : inputTab}
                result={result}
                loading={loading}
                onAnalyze={(input) => {
                  const normalized =
                    inputTab === "tiktok" && !input.includes("tiktok.com")
                      ? `https://www.tiktok.com/@${input.replace(/^@/, "")}`
                      : inputTab === "instagram" && !input.includes("instagram.com")
                        ? `https://www.instagram.com/${input.replace(/^@/, "")}/`
                        : inputTab === "youtube_short" && !input.includes("youtube.com") && !input.includes("youtu.be")
                          ? input.startsWith("@") ? `https://www.youtube.com/${input}` : `https://www.youtube.com/shorts/${input}`
                          : input;
                  analyze(normalized);
                }}
                onRetry={() => { if (lastUrl) analyze(lastUrl); }}
              />
            </div>
          )}

          {/* ── Tool panels (Libraries / Reference Tools) ── */}
          {activePanel === "libraries" && (
            <div className="mb-6 space-y-4 fade-up">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[15px] font-semibold" style={{ color: "#E8E6E1" }}>Libraries</h2>
                <button onClick={() => setActivePanel(null)} className="text-[11px] px-3 py-1 rounded-md" style={{ background: "#111110", color: "#9E9C97", border: "1px solid #252523" }}>✕ Close</button>
              </div>
              {keywordBank && <KeywordBankManager bank={keywordBank} onChange={(updated) => setKeywordBank(updated)} />}
              {hashtagBank && <HashtagBankManager bank={hashtagBank} onChange={setHashtagBank} />}
              <CompetitorBankManager competitors={competitors} onChange={setCompetitors} />
              <CreatorBlocklist refreshKey={blocklistKey} onChange={() => refreshReferenceStore()} />
            </div>
          )}

          {activePanel === "ref-tools" && (
            <div className="mb-6 space-y-4 fade-up">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[15px] font-semibold" style={{ color: "#E8E6E1" }}>Reference Tools</h2>
                <button onClick={() => setActivePanel(null)} className="text-[11px] px-3 py-1 rounded-md" style={{ background: "#111110", color: "#9E9C97", border: "1px solid #252523" }}>✕ Close</button>
              </div>
              <ReferenceUpload onUploadComplete={() => { setRefStoreStatus("saved"); refreshReferenceStore(); }} />
              {referenceStore && referenceStore.entries.length > 0 && (
                <ReferenceSearch
                  entries={referenceStore.entries}
                  onRemove={(ids) => {
                    setReferenceStore(prev => prev ? { ...prev, entries: prev.entries.filter(e => !ids.includes(e.id)) } : prev);
                  }}
                  onBlockCreator={() => { setBlocklistKey(k => k + 1); refreshReferenceStore(); }}
                />
              )}
              {keywordBank && (
                <ReferencePoolBuilder
                  bank={keywordBank}
                  onComplete={() => { setRefStoreStatus("saved"); refreshReferenceStore(); }}
                  onBatchSaved={() => refreshReferenceStore()}
                />
              )}
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && activePanel === null && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <div className="text-[56px]" style={{ opacity: 0.08, filter: "grayscale(1)" }}>
                {inputTab === "youtube" ? "▶" : inputTab === "tiktok" ? "♪" : "◎"}
              </div>
              <div className="text-center">
                <div className="text-[18px] font-semibold mb-2" style={{ color: "#E8E6E1" }}>
                  {inputTab === "youtube" ? "Analyze any YouTube video or channel" : inputTab === "tiktok" ? "Analyze TikTok creators" : inputTab === "youtube_short" ? "Analyze YouTube Shorts" : "Analyze Instagram accounts"}
                </div>
                <div className="text-[13px] max-w-[400px] leading-relaxed" style={{ color: "#6B6860" }}>
                  {inputTab === "youtube" ? "Paste a video URL, channel URL, or @handle above. Get view forecast, virality score, and growth signals." : inputTab === "tiktok" ? "Enter a handle or profile URL to pull creator analytics and virality signals." : inputTab === "youtube_short" ? "Paste a Shorts URL or @channel to analyze short-form performance." : "Enter a handle or reel URL to pull Instagram analytics."}
                </div>
              </div>
              {/* Quick stat cards when pool has data */}
              {referenceStore && referenceStore.entries.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3 w-full max-w-lg">
                  {[
                    { label: "Videos in Pool", value: referenceStore.entries.length, color: "#2ECC8A", tip: "Total reference videos analyzed" },
                    { label: "Avg Views", value: Math.round(referenceStore.entries.reduce((s, e) => s + (e.metrics?.views || 0), 0) / Math.max(referenceStore.entries.length, 1)).toLocaleString(), color: "#60A5FA", tip: "Mean views across the reference pool" },
                    { label: "Creators", value: new Set(referenceStore.entries.map(e => e.channelName)).size, color: "#F59E0B", tip: "Unique creators tracked" },
                  ].map(({ label, value, color, tip }) => (
                    <div
                      key={label}
                      title={tip}
                      className="glass-card cursor-default"
                      style={{ padding: "16px" }}
                    >
                      <div className="text-[22px] font-bold font-mono" style={{ color, fontFamily: "var(--font-mono)" }}>{value}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "#6B6860" }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Video result: metric cards + forecast + panels ── */}
          {result?.type === "video" && (() => {
            const v = result.video;
            const ch = result.channel;
            const metrics = [
              { label: "Total Views", value: v.views.toLocaleString(), color: "#2ECC8A", tip: "Total lifetime views on this video" },
              { label: "Likes", value: v.likes.toLocaleString(), color: "#60A5FA", tip: "Total likes" },
              { label: "Engagement", value: `${v.engagement.toFixed(2)}%`, color: "#F59E0B", tip: "Likes + comments as % of views" },
              { label: "Velocity", value: `${v.velocity.toLocaleString()}/d`, color: "#6366F1", tip: "Average views per day since publish" },
              ...(ch ? [{ label: "Subscribers", value: (ch.subs / 1000).toFixed(0) + "K", color: "#EF4444", tip: "Channel subscriber count" }] : []),
              ...(ch ? [{ label: "Ch. Median", value: result.channelMedian.toLocaleString(), color: "#06B6D4", tip: "Median views per video on this channel" }] : []),
            ];
            return (
              <div className="space-y-5">
                {/* Metric cards row */}
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                  {metrics.map(({ label, value, color, tip }) => (
                    <div
                      key={label}
                      title={tip}
                      className="glass-card cursor-default"
                      style={{ padding: "16px" }}
                    >
                      <div className="text-[11px] mb-1.5" style={{ color: "#6B6860" }}>{label}</div>
                      <div className="text-[22px] font-bold leading-none font-mono" style={{ color, fontFamily: "var(--font-mono)" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Forecast panel (chart-forward) */}
                <ViewForecastPanel video={v} forecastDate={forecastDate} onDateChange={setForecastDate} />

                {/* Full analysis panels */}
                <VideoResult
                  video={v}
                  channel={ch}
                  channelMedian={result.channelMedian}
                  recentVideos={result.recentVideos}
                  activeModes={activeModes}
                  url={lastUrl}
                  deepAnalysis={result.deepAnalysis}
                  referenceContext={result.referenceContext}
                  adjacentVideos={adjacentCtx}
                  nicheRanking={nicheRanking}
                  languageCPA={languageCPA}
                  referenceCount={referenceStore?.entries.length || 0}
                  descriptionSEO={descSEO}
                  engagementDecay={engDecay}
                  thumbnailAnalysis={thumbAnalysis}
                  crossPromotion={crossPromo}
                  keywordBank={keywordBank}
                  publishTimeHeatmap={publishTime}
                  competitorGap={competitorGap}
                  tagCorrelation={tagCorrelation}
                  uploadCadence={uploadCadence}
                />
              </div>
            );
          })()}

          {/* Channel result */}
          {result?.type === "channel" && (
            <ChannelResult
              health={result.health}
              activeModes={activeModes}
              deepAnalysis={result.deepAnalysis}
              referenceContext={result.referenceContext}
            />
          )}

          {/* TikTok / Instagram batch result */}
          {result?.type === "tiktok-batch" && (() => {
            const videos = result.videos;
            const totalViews = videos.reduce((s, v) => s + v.views, 0);
            const avgEng = videos.reduce((s, v) => s + v.engagement, 0) / Math.max(videos.length, 1);
            const topVideo = videos[0];
            const batchMetrics = [
              { label: "Videos Analyzed", value: videos.length.toLocaleString(), color: "#2ECC8A", tip: "Number of posts scraped" },
              { label: "Total Views", value: (totalViews / 1000).toFixed(0) + "K", color: "#60A5FA", tip: "Combined view count across all videos" },
              { label: "Avg Engagement", value: `${avgEng.toFixed(2)}%`, color: "#F59E0B", tip: "Average engagement rate across all posts" },
              { label: "Top Views", value: topVideo ? (topVideo.views / 1000).toFixed(0) + "K" : "—", color: "#6366F1", tip: "Highest view count in this batch" },
              { label: "Creators", value: new Set(videos.map(v => v.channel)).size.toLocaleString(), color: "#EF4444", tip: "Unique creators in this batch" },
            ];
            return (
              <div className="space-y-5">
                {/* Metric cards */}
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                  {batchMetrics.map(({ label, value, color, tip }) => (
                    <div
                      key={label}
                      title={tip}
                      className="glass-card cursor-default"
                      style={{ padding: "16px" }}
                    >
                      <div className="text-[11px] mb-1.5" style={{ color: "#6B6860" }}>{label}</div>
                      <div className="text-[22px] font-bold leading-none font-mono" style={{ color, fontFamily: "var(--font-mono)" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Forecast for top video */}
                {topVideo && (
                  <ViewForecastPanel video={topVideo} forecastDate={forecastDate} onDateChange={setForecastDate} />
                )}

                <TikTokBatchResult result={result} activeModes={activeModes} />
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}
