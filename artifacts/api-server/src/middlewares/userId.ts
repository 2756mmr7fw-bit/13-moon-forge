import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { getAuth } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * Sets req.userId from (in priority order):
 * 1. Clerk session — the authenticated Clerk user ID (user_xxxxx)
 * 2. x-user-id header — anonymous persistent UUID from localStorage
 * 3. Generated anon UUID — short-lived fallback (not persisted)
 */
export function userIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const clerkAuth = getAuth(req);
  if (clerkAuth?.userId) {
    req.userId = clerkAuth.userId;
    return next();
  }

  const headerUserId = req.headers["x-user-id"];
  req.userId = typeof headerUserId === "string" && headerUserId.trim()
    ? headerUserId.trim()
    : `anon-${randomUUID()}`;
  next();
}
