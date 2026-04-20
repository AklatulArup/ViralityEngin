// ═══════════════════════════════════════════════════════════════════════════
// KV STORE — server-side Upstash Redis wrapper
// ═══════════════════════════════════════════════════════════════════════════
//
// Every forecast the engine produces gets persisted here so we can calibrate
// accuracy over time. Without persistent storage, each RM's browser would
// hold its own learning data in isolation — a single shared Redis lets the
// whole team contribute to one calibration pool.
//
// Design principles:
//   - SAFE: if KV env vars are missing, all methods return safely without
//     throwing. The engine keeps working; nothing gets stored.
//   - TYPED: generic getJSON/setJSON methods so callers don't stringify manually
//   - NAMESPACED: all keys prefixed "fn:virality:" so this store can share an
//     Upstash database with other apps without collisions
//   - LAZY: Redis client initialises on first call, not at module load

import { Redis } from "@upstash/redis";

const NAMESPACE = "fn:virality:";

let cached: Redis | null | undefined = undefined;  // undefined = not yet tried

function getClient(): Redis | null {
  if (cached !== undefined) return cached;

  const url   = process.env.KV_REST_API_URL   ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[kv] Upstash Redis not configured — set KV_REST_API_URL and KV_REST_API_TOKEN");
    cached = null;
    return null;
  }

  try {
    cached = new Redis({ url, token });
    return cached;
  } catch (e) {
    console.error("[kv] Failed to initialise Upstash Redis client:", e);
    cached = null;
    return null;
  }
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────

export function isKvAvailable(): boolean {
  return getClient() !== null;
}

export async function kvSet<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    if (typeof ttlSeconds === "number" && ttlSeconds > 0) {
      // Upstash supports `ex` for seconds TTL on SET. Used for e.g. the
      // 6-hour sentiment cache so entries don't accumulate forever.
      await client.set(NAMESPACE + key, JSON.stringify(value), { ex: ttlSeconds });
    } else {
      await client.set(NAMESPACE + key, JSON.stringify(value));
    }
    return true;
  } catch (e) {
    console.error(`[kv] set failed for ${key}:`, e);
    return false;
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const raw = await client.get(NAMESPACE + key);
    if (raw === null || raw === undefined) return null;
    // Upstash sometimes auto-parses JSON, sometimes returns string — handle both
    if (typeof raw === "string") {
      try { return JSON.parse(raw) as T; } catch { return raw as unknown as T; }
    }
    return raw as T;
  } catch (e) {
    console.error(`[kv] get failed for ${key}:`, e);
    return null;
  }
}

export async function kvDelete(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.del(NAMESPACE + key);
    return true;
  } catch (e) {
    console.error(`[kv] delete failed for ${key}:`, e);
    return false;
  }
}

// List operations — we use Redis lists to maintain ordered collections of IDs
// e.g. all snapshot IDs, all snapshots per platform

export async function kvListPush(key: string, value: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.rpush(NAMESPACE + key, value);
    return true;
  } catch (e) {
    console.error(`[kv] list push failed for ${key}:`, e);
    return false;
  }
}

export async function kvListRange(key: string, start = 0, stop = -1): Promise<string[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const items = await client.lrange<string>(NAMESPACE + key, start, stop);
    return items ?? [];
  } catch (e) {
    console.error(`[kv] list range failed for ${key}:`, e);
    return [];
  }
}

export async function kvListLen(key: string): Promise<number> {
  const client = getClient();
  if (!client) return 0;
  try {
    const len = await client.llen(NAMESPACE + key);
    return len ?? 0;
  } catch (e) {
    console.error(`[kv] list len failed for ${key}:`, e);
    return 0;
  }
}

// Set operations for unique membership (e.g. list of all video IDs)

export async function kvSetAdd(key: string, value: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    await client.sadd(NAMESPACE + key, value);
    return true;
  } catch (e) {
    console.error(`[kv] sadd failed for ${key}:`, e);
    return false;
  }
}

export async function kvSetMembers(key: string): Promise<string[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const members = await client.smembers(NAMESPACE + key);
    return (members ?? []) as string[];
  } catch (e) {
    console.error(`[kv] smembers failed for ${key}:`, e);
    return [];
  }
}
