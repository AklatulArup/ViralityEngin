// ═══════════════════════════════════════════════════════════════════════════
// HUMANIZE ERRORS — turn raw upstream failure messages into plain-English
// guidance for the red error banner in the Dashboard.
// ═══════════════════════════════════════════════════════════════════════════
//
// Upstream scrape endpoints (Apify-backed TikTok / IG / X) return raw JSON
// error strings when they fail. Showing that raw JSON in the UI is ugly
// ("Apify error: 402 — { \"error\": { \"type\": \"not-enough-usage-to-run-
// paid-actor\", \"message\": \"By launching this job...\" } }") and doesn't
// tell the RM how to fix it.
//
// This helper pattern-matches known failure shapes and returns a clean
// user-facing message + an optional actionable hint. Unrecognised errors
// pass through unchanged so nothing downstream breaks if a new upstream
// format appears.
//
// RULES OF CHANGE
// ---------------
// - New patterns: add a new `match` block. Order matters — more specific
//   patterns (e.g. "402 + not-enough-usage") must come before broader ones
//   (e.g. bare "402").
// - Never throw from this function. It's called from a catch handler; any
//   exception would mask the original error and confuse the user.
// - The returned string is displayed in a one-line banner. Keep it under
//   ~200 chars and avoid line breaks.

export interface HumanizedError {
  message: string;
  // Optional short action string for a follow-up call-to-action, e.g. a
  // URL or a hint. Currently only consumed by log output, not rendered.
  action?: string;
  // The original raw message, preserved so developer tools (console logs,
  // error reporters) can still see what actually happened.
  raw: string;
}

export function humanizeError(raw: unknown): HumanizedError {
  const s =
    typeof raw === "string" ? raw :
    raw instanceof Error ? (raw.message || raw.toString()) :
    raw != null ? String(raw) :
    "";

  // ── Missing API keys (local dev or env vars not deployed) ───────────
  if (/no (?:tiktok|instagram|x|apify|youtube|gemini) api[_\s-]*key/i.test(s)) {
    const platformMatch = s.match(/no (tiktok|instagram|x|apify|youtube|gemini) api[_\s-]*key/i);
    const platform = platformMatch ? platformMatch[1].toUpperCase() : "API";
    return {
      message:
        `${platform} API key missing. Add the env var on Vercel (Settings → Environment Variables) and redeploy, or set it in .env.local for dev.`,
      raw: s,
    };
  }

  // ── Apify-specific failures ──────────────────────────────────────────
  // Free-tier / paid-tier credit exhausted. This is the common one after
  // an account burns through its $5/month free credit.
  if (/not-enough-usage|not-enough-credit|exceed your remaining usage/i.test(s)) {
    return {
      message:
        "Apify credit exhausted. Top up at console.apify.com/billing to resume TikTok / Instagram / X analysis. YouTube is unaffected.",
      action: "https://console.apify.com/billing/subscription",
      raw: s,
    };
  }

  // Bad or revoked token. Apify surfaces 401 with "Unauthorized" or
  // "Invalid token" depending on the specific actor.
  if (/\b401\b|unauthorized|invalid[\s_-]*token/i.test(s) && /apify/i.test(s)) {
    return {
      message:
        "Apify token is invalid or expired. Regenerate at console.apify.com → Settings → Integrations, update the Vercel env var, and redeploy.",
      action: "https://console.apify.com/account#/integrations",
      raw: s,
    };
  }

  // Actor doesn't exist / was renamed / account doesn't have access.
  if (/actor[\s-]*not[\s-]*found|\b404\b.*actor/i.test(s)) {
    return {
      message:
        "Apify actor not found. The scraper id may have been renamed or your account doesn't have access. Check console.apify.com → Actors.",
      raw: s,
    };
  }

  // 402 Payment Required — generic (catches the case where the "not-enough-
  // usage" wording changes but the status code is the same).
  if (/\b402\b/.test(s)) {
    return {
      message:
        "Apify rejected the request with 402 Payment Required — usually means credit is exhausted or the actor needs a paid plan. Check console.apify.com/billing.",
      action: "https://console.apify.com/billing/subscription",
      raw: s,
    };
  }

  // 429 rate limit.
  if (/\b429\b|rate[\s_-]*limit|too[\s_-]*many[\s_-]*requests/i.test(s)) {
    return {
      message: "Rate limited. Wait 30-60s and retry. If this keeps happening, the Apify actor is saturated.",
      raw: s,
    };
  }

  // Timeout — 502, "timed out", "actor finished with status TIMED_OUT".
  if (/\b50[234]\b|timed[\s_-]*out|TIMED[_\s-]*OUT/i.test(s)) {
    return {
      message: "Scraper timed out upstream. This is usually transient — retry in 30s. If it persists, the target may be blocking the scraper.",
      raw: s,
    };
  }

  // ── Common scraper "no results" cases ────────────────────────────────
  if (/no (?:tiktok )?videos? returned|no posts? returned|empty (?:result|array)/i.test(s)) {
    return {
      message:
        "Content not found. The URL may point to a private, deleted, or region-locked post — or the account may be private. Try a different creator or video.",
      raw: s,
    };
  }

  // ── YouTube Data API quota ──────────────────────────────────────────
  if (/quotaExceeded|quota[\s_-]*exceeded|dailyLimitExceeded/i.test(s)) {
    return {
      message: "YouTube Data API daily quota exceeded (10,000 units resets midnight PT). Use a backup key if you have one, or wait for reset.",
      raw: s,
    };
  }

  // ── Gemini / LLM provider outages ────────────────────────────────────
  if (/gemini.*(?:error|unavailable|overloaded)|GoogleGenerativeAI/i.test(s)) {
    return {
      message: "Gemini is overloaded or unreachable. The forecast will run on the conformal/manual fallback path — accuracy is slightly lower until Gemini recovers.",
      raw: s,
    };
  }

  // ── KV / storage layer ───────────────────────────────────────────────
  if (/upstash|KV_REST_API|redis.*(?:connection|timeout)/i.test(s)) {
    return {
      message: "Reference pool storage (Upstash KV) is unreachable. Pool writes won't persist right now, but the forecast itself will still render.",
      raw: s,
    };
  }

  // ── No pattern matched → pass through unchanged ──────────────────────
  return { message: s || "Analyze failed — unknown error", raw: s };
}
