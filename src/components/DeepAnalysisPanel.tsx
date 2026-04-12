"use client";

import type { DeepAnalysis } from "@/lib/types";
import CollapsibleSection from "./CollapsibleSection";
import MonthlyTrajectory from "./deep/MonthlyTrajectory";
import ArchetypeMatrix from "./deep/ArchetypeMatrix";
import TitlePatterns from "./deep/TitlePatterns";
import OutlierBreakdown from "./deep/OutlierBreakdown";
import Recommendations from "./deep/Recommendations";
import ViewPredictionComponent from "./deep/ViewPrediction";

interface DeepAnalysisPanelProps {
  analysis: DeepAnalysis;
  channelName: string;
}

export default function DeepAnalysisPanel({
  analysis,
  channelName,
}: DeepAnalysisPanelProps) {
  const hasEnoughData =
    analysis.monthlyTrajectory.length > 0 ||
    analysis.recommendations.length > 0;

  if (!hasEnoughData) return null;

  return (
    <div className="space-y-2 mt-4">
      <div className="text-[10px] text-muted font-mono px-1 mb-2">
        DEEP ANALYSIS &middot; {channelName.toUpperCase()}
      </div>

      {/* Recommendations — open by default (highest immediate value) */}
      <CollapsibleSection
        title="Actionable Recommendations"
        subtitle={`${analysis.recommendations.length} recommendations based on content patterns and platform algorithms`}
        defaultOpen={true}
        accentColor="var(--color-vrs-excellent)"
      >
        <Recommendations recommendations={analysis.recommendations} />
      </CollapsibleSection>

      {/* View Prediction */}
      {analysis.viewPrediction && (
        <CollapsibleSection
          title="Predictive View Range"
          subtitle={`Next video: ${analysis.viewPrediction.low.toLocaleString()} — ${analysis.viewPrediction.high.toLocaleString()} views (expected: ${analysis.viewPrediction.expected.toLocaleString()})`}
          defaultOpen={true}
          accentColor="var(--color-accent-blue)"
        >
          <ViewPredictionComponent prediction={analysis.viewPrediction} />
        </CollapsibleSection>
      )}

      {/* Outlier Breakdown */}
      {analysis.outlierInsights.length > 0 && (
        <CollapsibleSection
          title="Outlier Breakdown"
          subtitle={`${analysis.outlierInsights.length} video(s) exceeded 3x channel median — why they went viral`}
          accentColor="var(--color-mode-c)"
        >
          <OutlierBreakdown insights={analysis.outlierInsights} />
        </CollapsibleSection>
      )}

      {/* Monthly Trajectory */}
      {analysis.monthlyTrajectory.length > 1 && (
        <CollapsibleSection
          title="Monthly Trajectory"
          subtitle="Views per video over time — trend detection"
          accentColor="var(--color-accent-blue)"
        >
          <MonthlyTrajectory buckets={analysis.monthlyTrajectory} />
        </CollapsibleSection>
      )}

      {/* Archetype Performance */}
      {analysis.archetypePerformance.length > 1 && (
        <CollapsibleSection
          title="Content Archetype Performance"
          subtitle="Which content formats perform best for this channel"
          accentColor="var(--color-mode-d)"
        >
          <ArchetypeMatrix performance={analysis.archetypePerformance} />
        </CollapsibleSection>
      )}

      {/* Title Patterns */}
      {analysis.titlePatterns.length > 0 && (
        <CollapsibleSection
          title="Title Pattern Analysis"
          subtitle="Which title structures drive the most views"
          accentColor="var(--color-mode-e)"
        >
          <TitlePatterns patterns={analysis.titlePatterns} />
        </CollapsibleSection>
      )}

      {/* Engagement Summary */}
      <CollapsibleSection
        title="Engagement Pattern"
        subtitle={`Trend: ${analysis.engagementPattern.trend} | Likes/view: ${(analysis.engagementPattern.likesPerView * 100).toFixed(2)}% | Comments/view: ${(analysis.engagementPattern.commentsPerView * 100).toFixed(2)}%`}
        accentColor="var(--color-mode-a)"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded p-3">
            <div className="text-[10px] text-muted font-mono">LIKES / VIEW</div>
            <div className="text-[18px] font-bold font-mono mt-1">
              {(analysis.engagementPattern.likesPerView * 100).toFixed(2)}%
            </div>
          </div>
          <div className="bg-surface rounded p-3">
            <div className="text-[10px] text-muted font-mono">COMMENTS / VIEW</div>
            <div className="text-[18px] font-bold font-mono mt-1">
              {(analysis.engagementPattern.commentsPerView * 100).toFixed(2)}%
            </div>
          </div>
          <div className="bg-surface rounded p-3">
            <div className="text-[10px] text-muted font-mono">HIGH ENG THRESHOLD</div>
            <div className="text-[18px] font-bold font-mono mt-1" style={{ color: "var(--color-vrs-excellent)" }}>
              {analysis.engagementPattern.highEngagementThreshold.toFixed(1)}%
            </div>
          </div>
          <div className="bg-surface rounded p-3">
            <div className="text-[10px] text-muted font-mono">TREND</div>
            <div
              className="text-[18px] font-bold font-mono mt-1 capitalize"
              style={{
                color:
                  analysis.engagementPattern.trend === "improving"
                    ? "var(--color-vrs-excellent)"
                    : analysis.engagementPattern.trend === "declining"
                      ? "var(--color-vrs-rework)"
                      : "var(--color-text-subtle)",
              }}
            >
              {analysis.engagementPattern.trend}
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
