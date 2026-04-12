"use client";

import { useState, useEffect } from "react";
import type {
  ModeId,
  VideoData,
  ChannelData,
  EnrichedVideo,
  ChannelHealth,
  AnalysisResult,
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
  HookPatternLibrary,
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
import { analyzeHookPatterns } from "@/lib/hook-patterns";
import ModeSelector from "./ModeSelector";
import UrlInput from "./UrlInput";
import VideoResult from "./VideoResult";
import ChannelResult from "./ChannelResult";
import CsvUpload from "./CsvUpload";
import TikTokBatchResult from "./TikTokBatchResult";
import ReferenceSearch from "./ReferenceSearch";
import ReferenceUpload from "./ReferenceUpload";
import ReferencePoolBuilder from "./ReferencePoolBuilder";
import BulkImporter from "./BulkImporter";
import KeywordBankManager from "./KeywordBankManager";
import CreatorBlocklist from "./CreatorBlocklist";
import TrendsPanel from "./TrendsPanel";
import SentimentPanel from "./SentimentPanel";
import { analyzePoolSentiment, type TitleSentimentAnalysis } from "@/lib/sentiment";

type InputTab = "youtube" | "tiktok";

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
  const [hookPatterns, setHookPatterns] = useState<HookPatternLibrary | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<TitleSentimentAnalysis | null>(null);

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
  }, []);

  const refreshReferenceStore = () => {
    fetch("/api/reference-store")
      .then((r) => r.json())
      .then((store: ReferenceStore) => setReferenceStore(store))
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
    setHookPatterns(null);
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
    setHookPatterns(null);
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
          setHookPatterns(analyzeHookPatterns(referenceStore.entries));
          setSentimentAnalysis(analyzePoolSentiment(
            referenceStore.entries,
            keywordBank?.categories.competitors || []
          ));
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
      } else if (parsed.type === "unknown") {
        throw new Error("Could not detect input type. Paste a YouTube video URL or @channel handle.");
      } else {
        throw new Error(`${parsed.label} analysis coming soon. Currently YouTube only.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setStatus("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-xs font-extrabold text-black"
          style={{
            background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-blue))",
          }}
        >
          FN
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-bold">FundedNext Platform Intelligence</div>
          <div className="text-[9px] text-muted font-mono">
            WEIGHTED VRS &middot; LIVE YOUTUBE API &middot; TIKTOK CSV &middot;{" "}
            {activeModes.length} MODES &middot; BASELINE: {formatNumber(GLOBAL_BASELINE.medianViews)} MEDIAN
            {keywordBank && (
              <> &middot; {keywordBank.categories.niche.length} KEYWORDS</>
            )}
          </div>
        </div>
        {referenceStore && (
          <div className="flex items-center gap-1.5">
            <div
              className="text-[9px] font-mono px-2 py-1 rounded"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: refStoreStatus === "idle" ? "var(--color-text-muted)" : "var(--color-accent)",
              }}
            >
              {referenceStore.entries.length} REF
              {refStoreStatus !== "idle" && (
                <span style={{ color: "var(--color-vrs-excellent)" }}>
                  {" "}&middot; {refStoreStatus.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mode selector */}
      <ModeSelector
        activeModes={activeModes}
        onToggle={toggleMode}
        onSelectAll={selectAll}
        onClear={clearModes}
      />

      {/* Input tabs + area */}
      <div className="px-4 pt-3 max-w-[960px] mx-auto">
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setInputTab("youtube")}
            className="text-[10px] font-mono px-3 py-1.5 rounded-t transition-colors"
            style={{
              background: inputTab === "youtube" ? "var(--color-surface)" : "transparent",
              color: inputTab === "youtube" ? "var(--color-accent)" : "var(--color-text-muted)",
              borderBottom: inputTab === "youtube" ? "2px solid var(--color-accent)" : "2px solid transparent",
            }}
          >
            YouTube URL
          </button>
          <button
            onClick={() => setInputTab("tiktok")}
            className="text-[10px] font-mono px-3 py-1.5 rounded-t transition-colors"
            style={{
              background: inputTab === "tiktok" ? "var(--color-surface)" : "transparent",
              color: inputTab === "tiktok" ? "var(--color-accent)" : "var(--color-text-muted)",
              borderBottom: inputTab === "tiktok" ? "2px solid var(--color-accent)" : "2px solid transparent",
            }}
          >
            TikTok CSV
          </button>
        </div>

        {inputTab === "youtube" ? (
          <UrlInput onAnalyze={analyze} loading={loading} status={status} error={error} />
        ) : (
          <div className="space-y-2">
            <CsvUpload onUpload={analyzeTikTok} loading={loading} lastUpload={tiktokUploadInfo} />
            {status && <div className="text-[10px] text-muted font-mono">{status}</div>}
            {error && <div className="text-[10px] font-mono" style={{ color: "var(--color-vrs-rework)" }}>{error}</div>}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="p-4 max-w-[960px] mx-auto">
        {!result && !loading && (
          <div className="text-center py-12 text-muted">
            <div className="text-4xl mb-3">&#x26A1;</div>
            <div className="text-[15px] font-semibold mb-1.5">
              {inputTab === "youtube" ? "Paste a YouTube URL to begin" : "Upload a TikTok CSV to begin"}
            </div>
            <div className="text-[11px] text-border-light max-w-[380px] mx-auto leading-relaxed">
              {inputTab === "youtube" ? (
                <>
                  Video URL &rarr; content analysis + weighted VRS scoring
                  <br />
                  Channel URL &rarr; creator health + outlier detection + baseline
                </>
              ) : (
                <>
                  CSV upload &rarr; batch TRS scoring + competitor breakdown
                  <br />
                  Supports Apify, Piloterr, and native TikTok exports
                </>
              )}
            </div>
          </div>
        )}

        {result?.type === "video" && (
          <VideoResult
            video={result.video}
            channel={result.channel}
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
            hookPatterns={hookPatterns}
            sentimentAnalysis={sentimentAnalysis}
          />
        )}

        {result?.type === "channel" && (
          <ChannelResult
            health={result.health}
            activeModes={activeModes}
            deepAnalysis={result.deepAnalysis}
            referenceContext={result.referenceContext}
          />
        )}

        {result?.type === "tiktok-batch" && (
          <TikTokBatchResult result={result} activeModes={activeModes} />
        )}

        {/* ── Bulk Importer: CSV / URL dump + auto-discography ── */}
        <div className="mt-6">
          <BulkImporter
            onComplete={(added) => {
              if (added > 0) {
                setRefStoreStatus("saved");
                refreshReferenceStore();
              }
            }}
          />
        </div>

        {/* ── Intelligence Tools ── */}
        {keywordBank && (
          <div className="mt-3.5 space-y-3.5">
            <TrendsPanel bank={keywordBank} />
            <ReferencePoolBuilder
              bank={keywordBank}
              onComplete={(added) => {
                if (added > 0) {
                  setRefStoreStatus("saved");
                  refreshReferenceStore();
                }
              }}
            />
          </div>
        )}

        {/* ── Reference Pool Browser ── */}
        {referenceStore && referenceStore.entries.length > 0 && (
          <div className="mt-3.5 space-y-3.5">
            <ReferenceSearch
              entries={referenceStore.entries}
              onRemove={(ids) => {
                setReferenceStore((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    entries: prev.entries.filter((e) => !ids.includes(e.id)),
                  };
                });
              }}
              onBlockCreator={() => {
                setBlocklistKey((k) => k + 1);
                refreshReferenceStore();
              }}
            />
          </div>
        )}

        {/* ── Pool Management Tools ── */}
        <div className="mt-3.5 space-y-3.5">
          <ReferenceUpload
            onUploadComplete={() => {
              setRefStoreStatus("saved");
              refreshReferenceStore();
            }}
          />

          {/* Keyword Bank Manager */}
          {keywordBank && (
            <KeywordBankManager
              bank={keywordBank}
              onChange={(updated) => setKeywordBank(updated)}
            />
          )}

          {/* Creator Blocklist */}
          <CreatorBlocklist
            refreshKey={blocklistKey}
            onChange={() => refreshReferenceStore()}
          />
        </div>
      </div>
    </div>
  );
}
