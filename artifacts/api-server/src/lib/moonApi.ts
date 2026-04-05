const MOON_API_KEY = process.env.MOON_API_KEY ?? "";
const MOON_BASE = "https://thepeoplestownsq.com/api/moon";
const SUBSCRIBE_URL = "https://thepeoplestownsq.com/ai-education";

export interface MoonVerifyResult {
  active: boolean;
  messagesRemaining: number;
  moon: string;
}

export interface MoonAccess {
  allowed: boolean;
  moon: string | null;
  messagesRemaining: number;
  subscribeUrl: string;
  error?: string;
}

/**
 * Verify a single Moon subscription for a user.
 * Returns { active, messagesRemaining } or throws on network error.
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

    if (!res.ok) {
      return { active: false, messagesRemaining: 0, moon };
    }

    const data = (await res.json()) as {
      active?: boolean;
      messagesRemaining?: number;
    };

    return {
      active: data.active === true,
      messagesRemaining: typeof data.messagesRemaining === "number" ? data.messagesRemaining : 0,
      moon,
    };
  } catch {
    // Network failure — fail open with 0 messages (deny AI)
    return { active: false, messagesRemaining: 0, moon };
  }
}

/**
 * Check whether a user has access to either forge or flint.
 * Returns the first active Moon with messages remaining.
 */
export async function checkForgeAccess(userId: string): Promise<MoonAccess> {
  if (!MOON_API_KEY) {
    // No key configured — allow (dev mode)
    return { allowed: true, moon: "forge", messagesRemaining: 999, subscribeUrl: SUBSCRIBE_URL };
  }

  const [forgeResult, flintResult] = await Promise.all([
    verifyMoon(userId, "forge"),
    verifyMoon(userId, "flint"),
  ]);

  // Use forge if active, fallback to flint
  const active =
    (forgeResult.active && forgeResult.messagesRemaining > 0)
      ? forgeResult
      : (flintResult.active && flintResult.messagesRemaining > 0)
        ? flintResult
        : null;

  if (!active) {
    return {
      allowed: false,
      moon: null,
      messagesRemaining: 0,
      subscribeUrl: SUBSCRIBE_URL,
      error: forgeResult.messagesRemaining === 0 && forgeResult.active
        ? "You've used all your messages this month."
        : "You need an active Forge or Flint subscription to use AI features.",
    };
  }

  return {
    allowed: true,
    moon: active.moon,
    messagesRemaining: active.messagesRemaining,
    subscribeUrl: SUBSCRIBE_URL,
  };
}

/**
 * Check whether a user has access specifically for Flint.
 */
export async function checkFlintAccess(userId: string): Promise<MoonAccess> {
  if (!MOON_API_KEY) {
    return { allowed: true, moon: "flint", messagesRemaining: 999, subscribeUrl: SUBSCRIBE_URL };
  }

  const [flintResult, forgeResult] = await Promise.all([
    verifyMoon(userId, "flint"),
    verifyMoon(userId, "forge"),
  ]);

  // Prefer flint, fallback to forge
  const active =
    (flintResult.active && flintResult.messagesRemaining > 0)
      ? flintResult
      : (forgeResult.active && forgeResult.messagesRemaining > 0)
        ? forgeResult
        : null;

  if (!active) {
    return {
      allowed: false,
      moon: null,
      messagesRemaining: 0,
      subscribeUrl: SUBSCRIBE_URL,
      error: flintResult.messagesRemaining === 0 && flintResult.active
        ? "You've used all your messages this month."
        : "You need an active Forge or Flint subscription to use AI features.",
    };
  }

  return {
    allowed: true,
    moon: active.moon,
    messagesRemaining: active.messagesRemaining,
    subscribeUrl: SUBSCRIBE_URL,
  };
}

/**
 * Deduct one message from a Moon subscription.
 */
export async function deductMoonMessage(userId: string, moonName: string): Promise<void> {
  if (!MOON_API_KEY) return;

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
    // Best-effort — don't fail the response if deduct fails
  }
}
