// /api/forecast/conformal
//
// GET  — return the current conformal quantile table (or a placeholder if
//        nothing has been computed yet).
// POST — { action: "recompute" }  rebuild the table from the snapshot pool.
//        { action: "clear"     }  wipe the table (forecast falls back to
//                                 hand-tuned bands).
//
// Table lives in KV at `config:conformal-quantiles`. Recompute is also called
// automatically at the end of /api/cron/collect-outcomes whenever new
// outcomes land, so the table stays fresh without manual intervention.

import { NextRequest, NextResponse } from "next/server";
import { isKvAvailable } from "@/lib/kv";
import {
  loadConformalTable,
  recomputeConformalTable,
  clearConformalTable,
} from "@/lib/conformal";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  if (!isKvAvailable()) {
    return NextResponse.json({ ok: false, reason: "kv_not_configured", table: null });
  }
  const table = await loadConformalTable();
  return NextResponse.json({ ok: true, table });
}

export async function POST(req: NextRequest) {
  if (!isKvAvailable()) {
    return NextResponse.json({ ok: false, reason: "kv_not_configured" });
  }

  let body: { action?: "recompute" | "clear" } = {};
  try { body = await req.json(); } catch { /* empty body = recompute */ }
  const action = body.action ?? "recompute";

  try {
    if (action === "clear") {
      await clearConformalTable();
      return NextResponse.json({ ok: true, cleared: true });
    }

    if (action === "recompute") {
      const table = await recomputeConformalTable();
      return NextResponse.json({ ok: true, table });
    }

    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[api/forecast/conformal] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
