import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      aiKey?: {
        id: number;
        userId: string;
        name: string;
        keyHash: string;
        keyPrefix: string;
        monthlyTokenLimit: number;
        tokensUsedThisMonth: number;
        lastResetMonth: string | null;
        allowedModels: string;
        active: boolean;
        createdAt: Date;
      } | null;
      emailKey?: {
        id: number;
        userId: string;
        name: string;
        keyHash: string;
        keyPrefix: string;
        fromDomain: string | null;
        dailyLimit: number;
        monthlyLimit: number;
        sendsToday: number;
        sendsThisMonth: number;
        lastResetDay: string | null;
        active: boolean;
        createdAt: Date;
      } | null;
    }
  }
}

/**
 * Sets req.userId from (in priority order):
 * 1. Replit Auth session → req.user.id set by authMiddleware
 * 2. x-user-id header — anonymous persistent UUID from localStorage
 * 3. Generated anon UUID — short-lived fallback (not persisted)
 *
 * The forge_user_id is your internal canonical ID. When switching back
 * to Clerk, the identity mapping table (user_identities) maintains continuity.
 */
export function userIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Replit Auth session (set by authMiddleware)
  const authUser = req.user as { id?: string } | undefined;
  if (authUser?.id) {
    req.userId = authUser.id;
    return next();
  }

  // Anonymous persistent ID from browser localStorage
  const headerUserId = req.headers["x-user-id"];
  req.userId = typeof headerUserId === "string" && headerUserId.trim()
    ? headerUserId.trim()
    : `anon-${randomUUID()}`;

  next();
}
