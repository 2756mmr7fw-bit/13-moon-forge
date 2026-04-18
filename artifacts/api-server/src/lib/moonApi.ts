// Supports both old (MOON_API_KEY) and new (TSQ_MOON_API_KEY) secret names
const MOON_API_KEY = process.env.TSQ_MOON_API_KEY ?? process.env.MOON_API_KEY ?? "";
const TSQ_BASE = process.env.TSQ_BASE_URL ?? "https://thepeoplestownsq.com";
const MOON_BASE = `${TSQ_BASE}/api/moon`;
const SUBSCRIBE_URL = "https://thepeoplestownsq.com/ai-education";

// Admin user IDs bypass quota deduction
const ADMIN_USER_IDS = new Set(["54504320", "54489134"]);

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

    if (!res.ok) return { active: false, messagesRemaining: 0, moon };

    const data = (await res.json()) as { active?: boolean; messagesRemaining?: number };
    return {
      active: data.active === true,
      messagesRemaining: typeof data.messagesRemaining === "number" ? data.messagesRemaining : 0,
      moon,
    };
  } catch {
    return { active: false, messagesRemaining: 0, moon };
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
  if (!MOON_API_KEY) {
    // No key configured — allow (dev mode)
    return { allowed: true, moon: primary, messagesRemaining: 999, subscribeUrl: SUBSCRIBE_URL };
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
      messagesRemaining: 0,
      subscribeUrl: SUBSCRIBE_URL,
      error: outOfMessages
        ? "You've used all your messages this month."
        : "You need an active subscription to use this AI feature.",
    };
  }

  return {
    allowed: true,
    moon: active.moon,
    messagesRemaining: active.messagesRemaining,
    subscribeUrl: SUBSCRIBE_URL,
  };
}

// ─── Moon-specific access checks ───────────────────────────────────────────────

/** Forge (#3) — Builder. Fallback: Sage (#7) */
export async function checkForgeAccess(userId: string): Promise<MoonAccess> {
  return checkMoonAccess(userId, "forge", "sage");
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
 * Admin users bypass deduction.
 */
export async function deductMoonMessage(userId: string, moonName: string): Promise<void> {
  if (!MOON_API_KEY) return;
  if (ADMIN_USER_IDS.has(userId)) return; // admins bypass quota

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
 * Proxy a full chat request to Town Square's /api/moon/chat.
 * Returns { reply, messagesRemaining } or throws.
 */
export async function moonChat(
  userId: string,
  moon: string,
  messages: { role: string; content: string }[],
): Promise<{ reply: string; messagesRemaining: number }> {
  const res = await fetch(`${TSQ_BASE}/api/moon/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-moon-api-key": MOON_API_KEY,
    },
    body: JSON.stringify({ userId, moonName: moon, messages }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Moon chat failed: ${res.status}`);
  }

  return res.json() as Promise<{ reply: string; messagesRemaining: number }>;
}

/** Get full subscription status for a user. */
export async function getUserMoonStatus(userId: string) {
  if (!MOON_API_KEY) return null;
  try {
    const res = await fetch(`${MOON_BASE}/user/${encodeURIComponent(userId)}/status`, {
      headers: { "x-moon-api-key": MOON_API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
