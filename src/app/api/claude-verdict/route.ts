import { NextRequest, NextResponse } from "next/server";

// Platform-aware system prompts — each persona now has platform-specific context
// The prompt builder (below) injects the platform before calling these

const BASE_SYSTEMS: Record<string, string> = {
  algorithm:    "You are an Algorithm Analyst. Write EXACTLY 3 sentences. State what the platform algorithm is doing right now with this specific content, the key limiting or driving signal for THIS platform, and what single change would move the outcome. Use exact numbers. No fluff.",
  strategist:   "You are a Content Strategist. Write EXACTLY 3 sentences. State whether the hook and title are working citing the engagement number, the structural reason it is succeeding or failing on THIS platform, and the single highest-leverage change.",
  psychologist: "You are an Audience Psychologist. Write EXACTLY 3 sentences. State the emotional need being met citing comment density, what this audience does after watching on this platform, and the retention risk.",
  competitor:   "You are a Competitive Intelligence Analyst. Write EXACTLY 3 sentences. State where this video outperforms the reference pool, where it loses ground, and what content format is being left on the table.",
  verdict:      "You are a Chief Intelligence Officer. Write exactly 3 short paragraphs separated by a blank line. No headers. No bullets. No markdown. Paragraph 1: what the platform algorithm is doing right now and why (cite the primary signal). Paragraph 2: what will happen in the forecast window and the kill condition for THIS platform. Paragraph 3: one action to take within 48 hours and one mistake to avoid.",
  default:      "You are a content intelligence analyst. Write 2 concise paragraphs. Be specific with numbers. Reference the platform signals. No bullet points.",
};

// Platform-specific context injected into every prompt
const PLATFORM_CONTEXT: Record<string, string> = {
  youtube:
    "PLATFORM: YouTube Long-Form. Formula: AVD(50%) + CTR(30%) + Satisfaction(20%). " +
    "Kill threshold: CTR <2% sustained = Browse/Suggested sunset (search survives). AVD <30% over 90 days = removed from recommendations. " +
    "Evergreen model: search-driven views persist indefinitely. Hype button (2026) contributes to satisfaction score (channels <500K subs). " +
    "CTA priorities: keep watching (AVD) > Hype button > subscribe for series > FundedNext free trial > buy challenge. " +
    "Niche pathways: prop trading -> funded trading search -> forex education -> trading tutorials.",

  youtube_short:
    "PLATFORM: YouTube Shorts. Formula: Viewed-vs-Swiped(50%) + Loop_rate(30%) + External_shares(20%). " +
    "Kill threshold: >30% swipe-away on Frame 1 = PERMANENT burial, no recovery. No 48hr virality cap in 2026. " +
    "Frame 1 IS the thumbnail. External shares (WhatsApp/Discord) carry highest off-platform weight of all 4 platforms. " +
    "CTA priorities: external share to trading group > rewatch loop design > Long-Form bridge > FundedNext free trial. " +
    "Niche pathways: prop trading shorts -> finance shorts -> money shorts -> entrepreneur shorts.",

  tiktok:
    "PLATFORM: TikTok FYP. Formula: Completion(45%) + Rewatch(35%) + DM_send(20%). " +
    "Leaked internal points: DM=25pts, Save=15pts, Finish=8pts, Comment=8pts, Like=3pts. " +
    "Kill threshold: completion <70% in first 60 min = permanent 200-view jail. Distribution: tests 200-500 followers first, then expands. " +
    "TikTok search: 49% of US consumers use TikTok as a search engine - speak keyword in first 5s. " +
    "CTA priorities: DM send to trading group > rewatch loop > save > substantive comment > FundedNext free trial. " +
    "Niche pathways: prop trading -> day trading -> finance -> entrepreneur -> making money online.",

  instagram:
    "PLATFORM: Instagram Reels. Formula: DM_sends(40%) + Saves(30%) + 3s_hold+Watch(30%). " +
    "Mosseri confirmed (Jan 2025, Feb 2026): DM sends = #1 signal for non-follower reach. Saves = 3x weight of like. " +
    "Kill threshold: 3-sec hold <40% = 5-10x less reach immediately. Watermark = excluded from recommendations. " +
    "Tests non-followers FIRST (opposite of TikTok). Trial Reels feature measures cold-audience hold rate. " +
    "CTA priorities: DM + save dual signal > DM send > save > share to story > FundedNext free trial. " +
    "Niche pathways: prop trading -> personal finance -> financial freedom -> lifestyle.",
};

function getPlatformContext(platform?: string): string {
  if (platform === "tiktok") return PLATFORM_CONTEXT.tiktok;
  if (platform === "instagram") return PLATFORM_CONTEXT.instagram;
  if (platform === "youtube_short") return PLATFORM_CONTEXT.youtube_short;
  return PLATFORM_CONTEXT.youtube;
}

function buildSystemPrompt(persona: string, platform?: string): string {
  const base = BASE_SYSTEMS[persona] ?? BASE_SYSTEMS.default;
  const ctx = getPlatformContext(platform);
  return `${base}\n\nPLATFORM CONTEXT (use this to inform every sentence):\n${ctx}`;
}

function trim(p: string, max = 2500) {
  return p.length <= max ? p : p.slice(0, max) + "\n\n[context trimmed]";
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; persona?: string; platform?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const system = buildSystemPrompt(body.persona ?? "default", body.platform);
  const prompt = trim(body.prompt);
  const errors: string[] = [];

  // 1. Gemini (primary)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2;
  if (geminiKey) {
    for (const model of ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 450, temperature: 0.65 },
            }),
          }
        );
        const d = await r.json();
        if (!r.ok) {
          const msg = d.error?.message ?? `HTTP ${r.status}`;
          errors.push(`Gemini/${model}: ${msg.slice(0, 100)}`);
          if (r.status === 429 || msg.includes("quota") || msg.includes("not found")) continue;
          break;
        }
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (text.length > 10) return NextResponse.json({ text, source: model });
      } catch (e) { errors.push(`Gemini/${model}: ${e}`); }
    }
  } else {
    errors.push("Gemini: GEMINI_API_KEY not set");
  }

  // 2. Anthropic (fallback)
  const anthropicKey = process.env.Claude_AI_Summary_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    for (const model of ["claude-haiku-4-5-20251001", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"]) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 450,
            system,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const d = await r.json();
        if (!r.ok) { errors.push(`Anthropic/${model}: ${d.error?.message}`); continue; }
        const text = d.content?.find((b: {type:string}) => b.type === "text")?.text ?? "";
        if (text.length > 10) return NextResponse.json({ text, source: model });
      } catch (e) { errors.push(`Anthropic/${model}: ${e}`); }
    }
  } else {
    errors.push("Anthropic: no key set");
  }

  return NextResponse.json({
    error: "All AI providers failed",
    details: errors,
    fix: "Gemini quota may be exhausted (resets daily). Ensure Claude_AI_Summary_API_KEY is set in Vercel.",
  }, { status: 503 });
}
