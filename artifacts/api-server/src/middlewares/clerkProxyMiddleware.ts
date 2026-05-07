/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";

export const CLERK_PROXY_PATH = "/api/__clerk";

/**
 * Derives the Clerk Frontend API URL from the publishable key.
 * For Replit-managed Clerk, the key encodes the instance-specific FAPI host.
 * e.g. pk_live_Y2xlcmsuMTNtb29uZm9yZ2UuYWkk → clerk.13moonforge.ai
 */
function deriveClerkFapiUrl(publishableKey: string): string {
  try {
    const encoded = publishableKey.split("_")[2];
    if (!encoded) return "https://frontend-api.clerk.dev";
    const decoded = Buffer.from(encoded, "base64").toString("utf8").replace(/\$+$/, "");
    if (decoded && decoded.includes(".")) {
      return `https://${decoded}`;
    }
  } catch {
    // fall through
  }
  return "https://frontend-api.clerk.dev";
}

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
  const clerkFapi = deriveClerkFapiUrl(publishableKey);

  return createProxyMiddleware({
    target: clerkFapi,
    changeOrigin: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq, req) => {
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers.host || "";
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
    },
  }) as RequestHandler;
}
