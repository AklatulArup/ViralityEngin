// /api/forecast/tuning
//
// GET  — list currently-applied platform config overrides
// POST — apply or reject a suggested adjustment
//
// Overrides live in KV under "config:overrides" as a single JSON blob.
// The forecast engine reads this on each request and composes overrides on
// top of the default PLATFORM_CONFIG. Applied changes survive deploys.

import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, isKvAvailable } from "@/lib/kv";
import type { Platform } from "@/lib/forecast";

export const runtime = "nodejs";

export interface TuningOverride {
  platform:      Platform;
  parameter:     string;
  originalValue: number;
  newValue:      number;
  deltaPercent:  number;
  appliedAt:     string;      // ISO
  appliedBy:     string;      // 'user' | 'auto' — reserved for future
  rationale:     string;
  sampleSize:    number;
}

export interface TuningState {
  overrides: TuningOverride[];
  lastUpdated: string;
}

const KEY = "config:tuning-overrides";

// ─── GET: list current overrides ─────────────────────────────────────────

export async function GET() {
  if (!isKvAvailable()) {
    return NextResponse.json({ ok: false, reason: "kv_not_configured", overrides: [] });
  }
  const state = (await kvGet<TuningState>(KEY)) ?? { overrides: [], lastUpdated: "" };
  return NextResponse.json({ ok: true, ...state });
}

// ─── POST: apply or reject ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as "apply" | "reject" | "revert" | "clear-all";
    if (!action) return NextResponse.json({ ok: false, error: "action required" }, { status: 400 });

    if (!isKvAvailable()) {
      return NextResponse.json({ ok: false, reason: "kv_not_configured" });
    }

    const current = (await kvGet<TuningState>(KEY)) ?? { overrides: [], lastUpdated: "" };

    switch (action) {
      case "apply": {
        const override: TuningOverride = {
          platform:      body.platform,
          parameter:     body.parameter,
          originalValue: body.originalValue,
          newValue:      body.newValue,
          deltaPercent:  body.deltaPercent,
          appliedAt:     new Date().toISOString(),
          appliedBy:     "user",
          rationale:     body.rationale ?? "",
          sampleSize:    body.sampleSize ?? 0,
        };

        if (!override.platform || !override.parameter) {
          return NextResponse.json({ ok: false, error: "platform and parameter required" }, { status: 400 });
        }

        // Replace any existing override for the same platform + parameter
        const next: TuningState = {
          overrides: [
            ...current.overrides.filter(
              (o) => !(o.platform === override.platform && o.parameter === override.parameter)
            ),
            override,
          ],
          lastUpdated: new Date().toISOString(),
        };

        await kvSet(KEY, next);
        return NextResponse.json({ ok: true, applied: override, state: next });
      }

      case "revert": {
        const { platform, parameter } = body;
        const next: TuningState = {
          overrides: current.overrides.filter(
            (o) => !(o.platform === platform && o.parameter === parameter)
          ),
          lastUpdated: new Date().toISOString(),
        };
        await kvSet(KEY, next);
        return NextResponse.json({ ok: true, reverted: { platform, parameter }, state: next });
      }

      case "reject": {
        // Rejection is just a signal — we don't store it currently, so this is a no-op
        // that the UI can use to dismiss. Future: track rejections to avoid resuggesting.
        return NextResponse.json({ ok: true, rejected: true });
      }

      case "clear-all": {
        const next: TuningState = { overrides: [], lastUpdated: new Date().toISOString() };
        await kvSet(KEY, next);
        return NextResponse.json({ ok: true, cleared: true, state: next });
      }
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[api/forecast/tuning] POST error:", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
