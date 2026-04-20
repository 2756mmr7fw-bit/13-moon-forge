// ─── Traffic Tracker ─────────────────────────────────────────────────────────
// In-memory per-minute request tracker. Rotates every 60 seconds.
// Tracks: total requests, rate-limit hits, per-route-group breakdown.

interface Bucket {
  requests: number;
  rlHits: number;
  routes: Record<string, number>;
  startedAt: number;
}

function emptyBucket(): Bucket {
  return { requests: 0, rlHits: 0, routes: {}, startedAt: Date.now() };
}

let current: Bucket  = emptyBucket();
let previous: Bucket = emptyBucket();
let peakRpm          = 0;
let uptimeStart      = Date.now();

setInterval(() => {
  const elapsedSec = (Date.now() - current.startedAt) / 1000;
  const scaledRpm  = elapsedSec > 0
    ? Math.round((current.requests / elapsedSec) * 60)
    : 0;
  if (scaledRpm > peakRpm) peakRpm = scaledRpm;

  previous = current;
  current  = emptyBucket();
}, 60_000);

export function trackRequest(routeGroup: string): void {
  current.requests++;
  current.routes[routeGroup] = (current.routes[routeGroup] ?? 0) + 1;
}

export function trackRlHit(): void {
  current.rlHits++;
}

export type TrafficLevel = "normal" | "elevated" | "high" | "critical";

function computeLevel(rpm: number): TrafficLevel {
  if (rpm >= 200) return "critical";
  if (rpm >= 80)  return "high";
  if (rpm >= 40)  return "elevated";
  return "normal";
}

export function getTrafficStats() {
  const elapsedSec  = Math.max(1, (Date.now() - current.startedAt) / 1000);
  const estimatedRpm = Math.round((current.requests / elapsedSec) * 60);
  const level = computeLevel(estimatedRpm);

  return {
    estimatedRpm,
    requestsThisMinute: current.requests,
    rlHitsThisMinute:   current.rlHits,
    peakRpm,
    routes: { ...current.routes },
    previousMinute: {
      requests: previous.requests,
      rlHits:   previous.rlHits,
    },
    level,
    uptimeMs: Date.now() - uptimeStart,
  };
}
