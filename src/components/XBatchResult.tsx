"use client";

import React, { useState } from "react";
import { formatNumber } from "@/lib/formatters";
import type { XPostData } from "@/lib/types";

interface XBatchResultProps {
  posts: XPostData[];
}

// X algorithm weights (from open-source code)
const SIGNAL_WEIGHTS = {
  replies:   27,
  quotes:    50,
  bookmarks: 20,
  reposts:   2,
  likes:     1,
};

function getXRSColor(score: number): string {
  if (score >= 80) return "#2ECC8A";
  if (score >= 60) return "#60A5FA";
  if (score >= 40) return "#F59E0B";
  if (score >= 20) return "#F97316";
  return "#FF4D6A";
}

function getXRSLabel(score: number): string {
  if (score >= 80) return "Viral on X";
  if (score >= 60) return "Strong performer";
  if (score >= 40) return "Circulating";
  if (score >= 20) return "Contained";
  return "Suppressed";
}

// Compute XRS 0–100 from post data
function computeXRS(post: XPostData): number {
  const v = Math.max(1, post.views);
  // Weighted engagement per 1000 views
  const wEng =
    (post.replies   / v * 1000 * SIGNAL_WEIGHTS.replies)   +
    (post.quotes    / v * 1000 * SIGNAL_WEIGHTS.quotes)     +
    (post.bookmarks / v * 1000 * SIGNAL_WEIGHTS.bookmarks)  +
    (post.reposts   / v * 1000 * SIGNAL_WEIGHTS.reposts)    +
    (post.likes     / v * 1000 * SIGNAL_WEIGHTS.likes);

  // Normalise: 50 weighted engagement per 1k views = 100 XRS
  const score = Math.min(100, Math.round(wEng / 50 * 100));

  // Penalty for external links
  const linkPenalty = post.hasLink ? 15 : 0;

  return Math.max(0, score - linkPenalty);
}

export default function XBatchResult({ posts }: XBatchResultProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"xrs" | "views" | "replies" | "quotes">("xrs");

  if (!posts || posts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-secondary)" }}>
        No posts found.
      </div>
    );
  }

  const withXRS = posts.map(p => ({ ...p, xrs: computeXRS(p) }));

  const sorted = [...withXRS].sort((a, b) => {
    if (sortBy === "xrs")     return b.xrs - a.xrs;
    if (sortBy === "views")   return b.views - a.views;
    if (sortBy === "replies") return b.replies - a.replies;
    if (sortBy === "quotes")  return b.quotes - a.quotes;
    return b.xrs - a.xrs;
  });

  const avgXRS     = Math.round(withXRS.reduce((s, p) => s + p.xrs, 0) / withXRS.length);
  const avgViews   = Math.round(withXRS.reduce((s, p) => s + p.views, 0) / withXRS.length);
  const avgReplies = Math.round(withXRS.reduce((s, p) => s + p.replies, 0) / withXRS.length);
  const topPost    = sorted[0];
  const hasLinks   = withXRS.filter(p => p.hasLink).length;

  // Signal breakdown across all posts
  const totalV = Math.max(1, withXRS.reduce((s, p) => s + p.views, 0));
  const sigReplies   = withXRS.reduce((s, p) => s + p.replies, 0)   / totalV * 1000;
  const sigQuotes    = withXRS.reduce((s, p) => s + p.quotes, 0)    / totalV * 1000;
  const sigBookmarks = withXRS.reduce((s, p) => s + p.bookmarks, 0) / totalV * 1000;
  const sigReposts   = withXRS.reduce((s, p) => s + p.reposts, 0)   / totalV * 1000;
  const sigLikes     = withXRS.reduce((s, p) => s + p.likes, 0)     / totalV * 1000;

  const xrsColor = getXRSColor(avgXRS);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Summary header ── */}
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, color: "#fff",
          }}>𝕏</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {posts[0]?.authorName || posts[0]?.authorHandle}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              @{posts[0]?.authorHandle} · {formatNumber(posts[0]?.authorFollowers ?? 0)} followers
              {posts[0]?.authorVerified ? " · ✓ Verified" : ""}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: xrsColor, lineHeight: 1 }}>{avgXRS}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
              avg XRS · {getXRSLabel(avgXRS)}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { label: "Posts analysed", value: posts.length.toString(), color: "#60A5FA" },
            { label: "Avg views",      value: formatNumber(avgViews),   color: "#2ECC8A" },
            { label: "Avg replies",    value: avgReplies.toString(),    color: "#A78BFA" },
            { label: "Links in body",  value: `${hasLinks} / ${posts.length}`, color: hasLinks > 0 ? "#FF4D6A" : "#2ECC8A" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              padding: "10px 12px",
            }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Signal weight breakdown ── */}
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "14px 18px",
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Signal breakdown — weighted by X algorithm (open-source confirmed weights)
        </div>

        {[
          { label: "Replies",   raw: sigReplies,   weight: SIGNAL_WEIGHTS.replies,   color: "#A78BFA", note: "27× a like — #1 signal" },
          { label: "Quotes",    raw: sigQuotes,    weight: SIGNAL_WEIGHTS.quotes,    color: "#60A5FA", note: "50× a like — highest weight" },
          { label: "Bookmarks", raw: sigBookmarks, weight: SIGNAL_WEIGHTS.bookmarks, color: "#F59E0B", note: "20× a like — utility signal" },
          { label: "Reposts",   raw: sigReposts,   weight: SIGNAL_WEIGHTS.reposts,   color: "#2ECC8A", note: "2× a like" },
          { label: "Likes",     raw: sigLikes,     weight: SIGNAL_WEIGHTS.likes,     color: "#9E9C97", note: "baseline — lowest weight" },
        ].map(sig => {
          const weighted = sig.raw * sig.weight;
          const maxWeighted = Math.max(sigQuotes * 50, 0.001);
          const barW = Math.min(100, (weighted / maxWeighted) * 100);
          return (
            <div key={sig.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{sig.label}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {sig.raw.toFixed(2)}/1k views · ×{sig.weight} = {weighted.toFixed(1)} pts — {sig.note}
                </span>
              </div>
              <div style={{ background: "var(--color-border-tertiary)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${barW}%`, height: "100%", background: sig.color, borderRadius: 4, transition: "width 0.4s" }} />
              </div>
            </div>
          );
        })}

        {hasLinks > 0 && (
          <div style={{
            background: "rgba(255,77,106,0.06)", border: "0.5px solid rgba(255,77,106,0.2)",
            borderRadius: "var(--border-radius-md)", padding: "8px 12px", marginTop: 8,
          }}>
            <span style={{ fontSize: 12, color: "#FF4D6A", fontWeight: 500 }}>⚠ {hasLinks} post{hasLinks > 1 ? "s have" : " has"} an external link in the post body.</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 6 }}>
              X applies a −75 score penalty (−150 effective likes) per link. Move to the first reply.
            </span>
          </div>
        )}
      </div>

      {/* ── Top post highlight ── */}
      {topPost && (
        <div style={{
          background: "var(--color-background-secondary)",
          border: `0.5px solid ${getXRSColor(topPost.xrs)}30`,
          borderRadius: "var(--border-radius-lg)",
          padding: "14px 18px",
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Top performing post (XRS {topPost.xrs} · {getXRSLabel(topPost.xrs)})
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12, color: "var(--color-text-primary)" }}>
            {topPost.text}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: "Views",     value: formatNumber(topPost.views),     color: "#9E9C97" },
              { label: "Replies",   value: topPost.replies.toString(),      color: "#A78BFA" },
              { label: "Quotes",    value: topPost.quotes.toString(),       color: "#60A5FA" },
              { label: "Bookmarks", value: topPost.bookmarks.toString(),    color: "#F59E0B" },
              { label: "Reposts",   value: topPost.reposts.toString(),      color: "#2ECC8A" },
              { label: "Likes",     value: formatNumber(topPost.likes),     color: "#9E9C97" },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
          <a href={topPost.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "#60A5FA", textDecoration: "none" }}>
            View on X ↗
          </a>
        </div>
      )}

      {/* ── Post list ── */}
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        overflow: "hidden",
      }}>
        {/* Sort bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)",
          background: "var(--color-background-primary)",
        }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginRight: 4 }}>Sort:</span>
          {(["xrs", "views", "replies", "quotes"] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              style={{
                padding: "3px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer",
                background: sortBy === s ? "var(--color-background-info)" : "transparent",
                border: `0.5px solid ${sortBy === s ? "var(--color-border-info)" : "var(--color-border-tertiary)"}`,
                color: sortBy === s ? "var(--color-text-info)" : "var(--color-text-secondary)",
                fontWeight: sortBy === s ? 600 : 400,
              }}>
              {s === "xrs" ? "XRS" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {sorted.map((post, i) => {
          const isExp = expanded === post.id;
          const color = getXRSColor(post.xrs);
          return (
            <div key={post.id} style={{
              borderBottom: i < sorted.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
            }}>
              <button
                onClick={() => setExpanded(isExp ? null : post.id)}
                style={{
                  width: "100%", textAlign: "left", background: "transparent",
                  border: "none", cursor: "pointer", padding: "12px 16px",
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}
              >
                {/* XRS badge */}
                <div style={{
                  minWidth: 42, height: 42, borderRadius: 8, flexShrink: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  background: `${color}12`, border: `0.5px solid ${color}30`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color, lineHeight: 1 }}>{post.xrs}</div>
                  <div style={{ fontSize: 8, color, opacity: 0.7, marginTop: 1 }}>XRS</div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Post text preview */}
                  <div style={{
                    fontSize: 12.5, lineHeight: 1.55, color: "var(--color-text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: isExp ? "none" : 2,
                    WebkitBoxOrient: "vertical", marginBottom: 6,
                  }}>
                    {post.text}
                  </div>

                  {/* Metrics row */}
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {[
                      { l: "👁",  v: formatNumber(post.views),    t: "Views" },
                      { l: "💬",  v: post.replies.toString(),     t: "Replies (27×)" },
                      { l: "🔁",  v: post.quotes.toString(),      t: "Quotes (50×)" },
                      { l: "🔖",  v: post.bookmarks.toString(),   t: "Bookmarks (20×)" },
                      { l: "♻",   v: post.reposts.toString(),     t: "Reposts" },
                      { l: "♥",   v: formatNumber(post.likes),   t: "Likes" },
                    ].map(m => (
                      <div key={m.t} title={m.t} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 10 }}>{m.l}</span>
                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{m.v}</span>
                      </div>
                    ))}
                    {post.hasLink && (
                      <span style={{ fontSize: 10, color: "#FF4D6A", padding: "1px 6px", borderRadius: 4, background: "rgba(255,77,106,0.1)" }}>
                        Link in body (−reach)
                      </span>
                    )}
                    {post.isThread && (
                      <span style={{ fontSize: 10, color: "#60A5FA", padding: "1px 6px", borderRadius: 4, background: "rgba(96,165,250,0.1)" }}>
                        Thread
                      </span>
                    )}
                  </div>

                  {isExp && (
                    <div style={{ marginTop: 8 }}>
                      <a href={post.url} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: "#60A5FA", textDecoration: "none" }}>
                        View on X ↗
                      </a>
                      <span style={{ fontSize: 10, color: "var(--color-text-secondary)", marginLeft: 10 }}>
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", flexShrink: 0, marginTop: 2 }}>
                  {isExp ? "▲" : "▼"}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── X Strategy note ── */}
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "12px 16px",
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 8 }}>
          X Algorithm — Key Rules (open-source confirmed)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            "Reply that gets author to reply back = +75 pts (150× a like) — reply to EVERY comment in first 30 min",
            "Quote tweet = +25 pts (50× a like) — contrarian takes invite public responses",
            "External links in post body = −75 pts — always put links in first reply",
            "Posts lose 50% visibility every 6 hours — the entire window is 6 hours, not 24",
            "2+ hashtags reduces reach by ~40% — maximum 1-2 highly targeted tags",
          ].map((rule, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-text-secondary)", marginTop: 6, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.55 }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
