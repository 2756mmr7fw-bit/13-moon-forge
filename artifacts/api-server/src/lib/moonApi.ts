// TPTS Moon API integration
// Outbound key: TPTS_MOON_API_KEY (sent as x-moon-api-key to thepeoplestownsq.com)
// Inbound key:  TPTS_INBOUND_KEY  (TPTS sends this as x-api-key on webhooks to us)
const MOON_API_KEY = process.env.TPTS_MOON_API_KEY ?? process.env.TSQ_MOON_API_KEY ?? process.env.MOON_API_KEY ?? "";
const TSQ_BASE = process.env.TSQ_BASE_URL ?? "https://thepeoplestownsq.com";
const MOON_BASE = `${TSQ_BASE}/api/moon`;

export const TPTS_INBOUND_KEY = (process.env.TPTS_INBOUND_KEY ?? "").trim();

// Admin user IDs bypass quota deduction
const ADMIN_USER_IDS = new Set(["54504320", "54489134"]);

// Moons available in Forge Builder (per TPTS integration package)
export const FORGE_MOONS = ["forge", "flint"] as const;

export interface MoonVerifyResult {
  active: boolean;
  isBundle: boolean;
  messagesRemaining: number;
  moon: string;
}

export interface MoonAccess {
  allowed: boolean;
  moon: string | null;
  isBundle: boolean;
  messagesRemaining: number;
  subscribeUrl: string;
  error?: string;
}

/**
 * Build the subscribe deep-link URL for a moon, optionally with a return_to.
 */
export function getMoonSubscribeUrl(moon: string, returnTo?: string): string {
  const base = `${TSQ_BASE}/moons/${moon}?ref=${moon}`;
  return returnTo ? `${base}&return_to=${encodeURIComponent(returnTo)}` : base;
}

/**
 * Verify a single Moon subscription for a user.
 */
async function verifyMoon(userId: string, moon: string): Promise<MoonVerifyResult> {
  try {
    const res = await fetch(
      `${MOON_BASE}/verify?userId=${encodeURIComponent(userId)}&moon=${moon}`,
      {
        headers: { "x-moon-api-key": MOON_API_KEY },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return { active: false, isBundle: false, messagesRemaining: 0, moon };

    const data = (await res.json()) as {
      active?: boolean;
      isBundle?: boolean;
      messagesRemaining?: number;
    };

    // Bundle holders share a pool — treat isBundle: true as always active
    const isBundle = data.isBundle === true;
    const active = data.active === true || isBundle;
    const messagesRemaining = isBundle
      ? 9999
      : typeof data.messagesRemaining === "number"
        ? data.messagesRemaining
        : 0;

    return { active, isBundle, messagesRemaining, moon };
  } catch {
    return { active: false, isBundle: false, messagesRemaining: 0, moon };
  }
}

/**
 * Generic access check — tries primary Moon first, falls back to secondary.
 */
async function checkMoonAccess(
  userId: string,
  primary: string,
  fallback: string,
): Promise<MoonAccess> {
  const subscribeUrl = getMoonSubscribeUrl(primary);

  if (!MOON_API_KEY) {
    // No key configured — allow (dev mode)
    return { allowed: true, moon: primary, isBundle: false, messagesRemaining: 999, subscribeUrl };
  }

  const [primaryResult, fallbackResult] = await Promise.all([
    verifyMoon(userId, primary),
    verifyMoon(userId, fallback),
  ]);

  const active =
    primaryResult.active && primaryResult.messagesRemaining > 0 ? primaryResult
    : fallbackResult.active && fallbackResult.messagesRemaining > 0 ? fallbackResult
    : null;

  if (!active) {
    const outOfMessages = primaryResult.active && primaryResult.messagesRemaining === 0;
    return {
      allowed: false,
      moon: null,
      isBundle: false,
      messagesRemaining: 0,
      subscribeUrl,
      error: outOfMessages
        ? "You've used all your messages this month."
        : "You need an active subscription to use this AI feature.",
    };
  }

  return {
    allowed: true,
    moon: active.moon,
    isBundle: active.isBundle,
    messagesRemaining: active.messagesRemaining,
    subscribeUrl,
  };
}

// ─── Moon-specific access checks ───────────────────────────────────────────────

/** Forge (#3) — Builder. Fallback: Flint (bundle partner) */
export async function checkForgeAccess(userId: string): Promise<MoonAccess> {
  return checkMoonAccess(userId, "forge", "flint");
}

/** Quill (#5) — Writing & copy. Fallback: Forge (#3) */
export async function checkQuillAccess(userId: string): Promise<MoonAccess> {
  return checkMoonAccess(userId, "quill", "forge");
}

/** Creed (#6) — Legal & IP rights. Fallback: Forge (#3) */
export async function checkCreedAccess(userId: string): Promise<MoonAccess> {
  return checkMoonAccess(userId, "creed", "forge");
}

/** Sage (#7) — Teacher & explainer. Fallback: Forge (#3) */
export async function checkSageAccess(userId: string): Promise<MoonAccess> {
  return checkMoonAccess(userId, "sage", "forge");
}

/** Hawk (#2) — Finder & sourcer. Fallback: Forge (#3) */
export async function checkHawkAccess(userId: string): Promise<MoonAccess> {
  return checkMoonAccess(userId, "hawk", "forge");
}

/** Flint (#13) — Spark & brainstorm. Fallback: Forge (#3) */
export async function checkFlintAccess(userId: string): Promise<MoonAccess> {
  return checkMoonAccess(userId, "flint", "forge");
}

/**
 * Deduct one message from a Moon subscription.
 * Admin users and bundle holders bypass deduction (TPTS handles bundle math).
 */
export async function deductMoonMessage(userId: string, moonName: string): Promise<void> {
  if (!MOON_API_KEY) return;
  if (ADMIN_USER_IDS.has(userId)) return;

  try {
    await fetch(`${MOON_BASE}/deduct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-moon-api-key": MOON_API_KEY,
      },
      body: JSON.stringify({ userId, moonName, count: 1 }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Best-effort — don't fail the AI response if deduct fails
  }
}

/**
 * List all moons a user owns.
 * GET /api/moon/subscriptions?userId=<id>
 */
export async function getUserSubscriptions(userId: string): Promise<unknown> {
  if (!MOON_API_KEY) return null;
  try {
    const res = await fetch(
      `${MOON_BASE}/subscriptions?userId=${encodeURIComponent(userId)}`,
      {
        headers: { "x-moon-api-key": MOON_API_KEY },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
