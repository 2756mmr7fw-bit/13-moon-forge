import { Router, type Request, type Response, type NextFunction } from "express";
import type { EntitlementStore } from "./store";
import type {
  EntitlementRecord,
  IntegrationStatusResponse,
  LookupResponse,
  MoonWebhookPayload,
  NotFoundLookupResponse,
  WebhookAckResponse,
  WebhookErrorResponse,
} from "./types";

export interface ReceiverConfig {
  apiKey: string;
  relevantMoons: string[];
  appName: string;
  store: EntitlementStore;
  version?: string;
  onApplied?: (event: MoonWebhookPayload, record: EntitlementRecord) => void | Promise<void>;
}

function requireApiKey(expected: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no key is configured (dev mode), allow everything through
    if (!expected) return next();

    const provided = (req.header("x-api-key") ?? "").trim();

    // Safe diagnostics — logs length + prefix only, never the full key
    (req as any).log?.info(
      {
        envKeyLen: expected.length,
        envKeyPrefix: expected.slice(0, 10),
        providedKeyLen: provided.length,
        providedKeyPrefix: provided.slice(0, 10),
        match: provided === expected,
      },
      "moonReceiver: api key check",
    );

    if (provided !== expected) {
      const body: WebhookErrorResponse = { ok: false, error: "unauthorized" };
      res.status(401).json(body);
      return;
    }
    next();
  };
}

function isMoonEvent(s: unknown): s is MoonWebhookPayload["event"] {
  return (
    s === "purchased" ||
    s === "granted" ||
    s === "refilled" ||
    s === "refunded" ||
    s === "expired" ||
    s === "cancelled"
  );
}

function parsePayload(body: unknown): MoonWebhookPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.userId !== "string" || !b.userId) return null;
  if (typeof b.moon !== "string" || !b.moon) return null;
  if (!isMoonEvent(b.event)) return null;
  return {
    event: b.event,
    userId: b.userId,
    moon: b.moon,
    isBundle: b.isBundle === true,
    messagesRemaining:
      typeof b.messagesRemaining === "number" ? b.messagesRemaining : undefined,
    expiresAt:
      typeof b.expiresAt === "string"
        ? b.expiresAt
        : b.expiresAt === null
          ? null
          : undefined,
    reason: typeof b.reason === "string" ? b.reason : undefined,
  };
}

function moonsAfterEvent(
  payload: MoonWebhookPayload,
  prior: EntitlementRecord | null,
  relevantMoons: string[],
): { moons: string[]; isActive: boolean } {
  const grantingEvents: MoonWebhookPayload["event"][] = ["purchased", "granted"];
  const revokingEvents: MoonWebhookPayload["event"][] = ["refunded", "expired", "cancelled"];
  const isGrant = grantingEvents.includes(payload.event);
  const isRevoke = revokingEvents.includes(payload.event);

  if (isGrant) {
    const granted = payload.isBundle ? relevantMoons.slice() : [payload.moon];
    const merged = new Set<string>(prior?.moons ?? []);
    for (const m of granted) {
      if (relevantMoons.includes(m)) merged.add(m);
    }
    return { moons: Array.from(merged), isActive: merged.size > 0 };
  }

  if (isRevoke) {
    if (payload.isBundle) {
      return { moons: [], isActive: false };
    }
    const remaining = (prior?.moons ?? []).filter((m) => m !== payload.moon);
    return { moons: remaining, isActive: remaining.length > 0 };
  }

  // refilled — keep existing moons
  return {
    moons: prior?.moons ?? (relevantMoons.includes(payload.moon) ? [payload.moon] : []),
    isActive: prior?.isActive ?? false,
  };
}

export function createReceiverRouter(config: ReceiverConfig): Router {
  const router = Router();
  const auth = requireApiKey(config.apiKey);
  const version = config.version ?? "1.0.0";

  // GET /api/moon/integration-status
  router.get("/moon/integration-status", auth, (_req, res) => {
    const body: IntegrationStatusResponse = {
      ok: true,
      app: config.appName,
      version,
      relevantMoons: config.relevantMoons.slice(),
    };
    res.json(body);
  });

  // POST /api/moon/webhook
  router.post("/moon/webhook", auth, async (req, res) => {
    const payload = parsePayload(req.body);
    if (!payload) {
      const body: WebhookErrorResponse = { ok: false, error: "invalid-payload" };
      res.status(400).json(body);
      return;
    }

    const isRelevant =
      payload.isBundle ||
      payload.moon === "bundle" ||
      config.relevantMoons.includes(payload.moon);

    if (!isRelevant) {
      const body: WebhookAckResponse = {
        ok: true,
        entitled: false,
        userId: payload.userId,
        moons: [],
      };
      res.json(body);
      return;
    }

    const prior = await config.store.get(payload.userId);
    const { moons, isActive } = moonsAfterEvent(payload, prior, config.relevantMoons);

    const record: EntitlementRecord = {
      userId: payload.userId,
      moons,
      isActive,
      messagesRemaining:
        payload.event === "refilled" ||
        payload.event === "purchased" ||
        payload.event === "granted"
          ? (payload.messagesRemaining ?? prior?.messagesRemaining)
          : isActive
            ? prior?.messagesRemaining
            : undefined,
      expiresAt:
        payload.event === "purchased" || payload.event === "granted"
          ? (payload.expiresAt ?? prior?.expiresAt ?? null)
          : isActive
            ? (prior?.expiresAt ?? null)
            : null,
      updatedAt: new Date().toISOString(),
    };

    if (isActive) {
      await config.store.upsert(record);
    } else {
      await config.store.clear(payload.userId);
    }

    (req as any).log?.info(
      { event: payload.event, userId: payload.userId, moon: payload.moon, isActive, moons },
      "moonReceiver: entitlement applied",
    );

    if (config.onApplied) {
      try {
        await config.onApplied(payload, record);
      } catch (err) {
        console.error("[moonReceiver] onApplied hook threw:", err);
      }
    }

    const ack: WebhookAckResponse = {
      ok: true,
      entitled: isActive,
      userId: payload.userId,
      moons,
    };
    res.json(ack);
  });

  // GET /api/moon/lookup-user/:userId
  router.get<{ userId: string }>("/moon/lookup-user/:userId", auth, async (req, res) => {
    const userId = req.params.userId;
    const record = await config.store.get(userId);

    if (!record || !record.isActive) {
      const body: NotFoundLookupResponse = {
        userId,
        isActive: false,
        moons: [],
        found: false,
      };
      res.status(404).json(body);
      return;
    }

    const body: LookupResponse = {
      userId: record.userId,
      isActive: record.isActive,
      moons: record.moons,
      messagesRemaining: record.messagesRemaining,
      expiresAt: record.expiresAt ?? null,
    };
    res.json(body);
  });

  return router;
}
