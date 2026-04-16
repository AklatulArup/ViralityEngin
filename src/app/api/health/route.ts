import { NextResponse } from "next/server";

/** GET /api/health
 * Returns which API keys are loaded (masked) so you can verify Vercel env vars.
 */
export async function GET() {
  function mask(val: string | undefined): string {
    if (!val) return "❌ NOT SET";
    return "✓ " + val.slice(0, 8) + "…" + val.slice(-4);
  }

  const keys = {
    "Claude AI (Claude_AI_Summary_API_KEY)": mask(process.env.Claude_AI_Summary_API_KEY),
    "Claude AI (ANTHROPIC_API_KEY)":         mask(process.env.ANTHROPIC_API_KEY),
    "Claude AI (resolved)":                  mask(process.env.ANTHROPIC_API_KEY || process.env.Claude_AI_Summary_API_KEY),
    "YouTube (YOUTUBE_API_KEY)":             mask(process.env.YOUTUBE_API_KEY),
    "YouTube (YOUTUBE_API_KEY_2)":           mask(process.env.YOUTUBE_API_KEY_2),
    "YouTube (resolved)":                    mask(process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_2),
    "Instagram (Instagram_API_KEY_2)":       mask(process.env.Instagram_API_KEY_2),
    "Instagram (Instagram_API_Key)":         mask(process.env.Instagram_API_Key),
    "Instagram (resolved)":                  mask(process.env.Instagram_API_KEY_2 || process.env.Instagram_API_Key),
    "TikTok (TikTok_API_Key)":               mask(process.env.TikTok_API_Key),
    "TikTok (resolved)":                     mask(process.env.TikTok_API_Key),
  };

  const allCritical = !!(
    (process.env.ANTHROPIC_API_KEY || process.env.Claude_AI_Summary_API_KEY) &&
    (process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY_2)
  );

  return NextResponse.json({
    status: allCritical ? "✅ All critical keys loaded" : "⚠️ Some keys missing",
    keys,
    timestamp: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
