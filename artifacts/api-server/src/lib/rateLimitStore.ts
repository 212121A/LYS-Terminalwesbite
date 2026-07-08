// Verteiltes Rate-Limit für express-rate-limit (P2-3).
//
// Der Default-MemoryStore zählt pro Function-/Server-Instanz — bei mehreren
// warmen Instanzen verwässert das Limit. Sobald `UPSTASH_REDIS_REST_URL/_TOKEN`
// gesetzt sind, liefert `makeRateLimitStore()` einen Upstash-gestützten Store
// (INCR + EXPIRE NX = fixes Fenster, PTTL → resetTime); sonst `undefined` →
// express-rate-limit nutzt seinen MemoryStore, Verhalten bleibt exakt wie bisher.
// Upstash-Netz-/HTTP-Fehler sind fail-open (nie eine legitime Zahlung blocken).

import type { Store, Options, IncrementResponse } from "express-rate-limit";

type UpstashPipelineResult = Array<{ result?: unknown; error?: string }>;

class UpstashRateLimitStore implements Store {
  private windowMs = 60_000;

  constructor(
    private readonly keyPrefix: string,
    private readonly restUrl: string,
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private redisKey(key: string): string {
    return `rl:${this.keyPrefix}:${key}`;
  }

  private endpoint(path: string): string {
    return `${this.restUrl.replace(/\/$/, "")}/${path}`;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const rk = this.redisKey(key);
    const windowSec = Math.max(1, Math.ceil(this.windowMs / 1000));
    try {
      const res = await this.fetchImpl(this.endpoint("pipeline"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", rk],
          ["EXPIRE", rk, String(windowSec), "NX"],
          ["PTTL", rk],
        ]),
      });
      if (!res.ok) throw new Error(`Upstash ${res.status}`);
      const parsed = (await res.json()) as UpstashPipelineResult;
      const totalHits = Number(parsed[0]?.result);
      if (!Number.isFinite(totalHits)) throw new Error("Upstash: unerwartete Antwort");
      const pttl = Number(parsed[2]?.result);
      const resetMs = Number.isFinite(pttl) && pttl > 0 ? pttl : this.windowMs;
      return { totalHits, resetTime: new Date(Date.now() + resetMs) };
    } catch {
      // fail-open: Upstash weg → nicht limitieren (1 Treffer im frischen Fenster).
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key: string): Promise<void> {
    // Nur relevant bei skipSuccessfulRequests (availability-PIN). Best-effort.
    try {
      await this.fetchImpl(this.endpoint(`decr/${encodeURIComponent(this.redisKey(key))}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch {
      /* best-effort */
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await this.fetchImpl(this.endpoint(`del/${encodeURIComponent(this.redisKey(key))}`), {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
      });
    } catch {
      /* best-effort */
    }
  }
}

/**
 * Store für einen express-rate-limit-Limiter. `keyPrefix` trennt die Limiter
 * voneinander (sonst teilten sie sich in Redis einen Zähler). Ohne Upstash-ENV
 * `undefined` → Default-MemoryStore (unverändertes Verhalten).
 */
export function makeRateLimitStore(
  keyPrefix: string,
  env: NodeJS.ProcessEnv = process.env
): Store | undefined {
  const restUrl = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!restUrl || !token) return undefined;
  return new UpstashRateLimitStore(keyPrefix, restUrl, token);
}
