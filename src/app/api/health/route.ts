import { NextResponse } from "next/server";

export async function GET() {
  function mask(val: string | undefined): string {
    if (!val) return "❌ NOT SET";
    return "✓ " + val.slice(0, 10) + "…" + val.slice(-4);
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey  = process.env.ANTHROPIC_API_KEY || process.env.Claude_AI_Summary_API_KEY;
  const youtubeKey    = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_2;

  // Quick test of OpenRouter if key exists
  let openRouterStatus = "not tested";
  if (openRouterKey) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Authorization": `Bearer ${openRouterKey}` },
      });
      openRouterStatus = r.ok ? `✅ connected (HTTP ${r.status})` : `❌ rejected (HTTP ${r.status})`;
    } catch (e) {
      openRouterStatus = `❌ network error: ${e instanceof Error ? e.message : String(e)}`;
    }
  } else {
    openRouterStatus = "❌ key not set";
  }

  return NextResponse.json({
    status: openRouterKey ? "✅ OpenRouter key present" : "❌ OPENROUTER_API_KEY missing — add to Vercel env vars",
    openrouter_connection: openRouterStatus,
    models_will_try: ["anthropic/claude-3.5-sonnet", "anthropic/claude-3-haiku", "meta-llama/llama-3.1-8b-instruct:free"],
    keys: {
      "OPENROUTER_API_KEY":        mask(openRouterKey),
      "Claude_AI_Summary_API_KEY": mask(process.env.Claude_AI_Summary_API_KEY),
      "YOUTUBE_API_KEY":           mask(process.env.YOUTUBE_API_KEY),
      "YOUTUBE_API_KEY_2":         mask(process.env.YOUTUBE_API_KEY_2),
      "YouTube resolved":          mask(youtubeKey),
      "Instagram_API_KEY_2":       mask(process.env.Instagram_API_KEY_2),
      "TikTok_API_Key":            mask(process.env.TikTok_API_Key),
    },
    timestamp: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
