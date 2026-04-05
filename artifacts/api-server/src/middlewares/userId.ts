import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * Extracts a userId from:
 * 1. x-user-id request header (set by the frontend from localStorage)
 * 2. Falls back to generating a short-lived one (not persisted — client should send it)
 *
 * This is a lightweight identity layer before full Replit Auth is added.
 * The userId is used only for Moon subscription verification.
 */
export function userIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerUserId = req.headers["x-user-id"];
  req.userId = typeof headerUserId === "string" && headerUserId.trim()
    ? headerUserId.trim()
    : `anon-${randomUUID()}`;
  next();
}
