import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";

export const CLERK_PROXY_PATH = "/api/__clerk";

function deriveClerkFapiUrl(publishableKey: string): string {
  try {
    const encoded = publishableKey.split("_")[2];
    if (!encoded) return "https://clerk.dev";
    const decoded = Buffer.from(encoded, "base64").toString("utf8").replace(/\$+$/, "");
    if (decoded && decoded.includes(".")) {
      return `https://${decoded}`;
    }
  } catch {
    // fall through
  }
  return "https://clerk.dev";
}

export function clerkProxyMiddleware(): RequestHandler {
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
  if (!publishableKey) {
    return (_req, _res, next) => next();
  }

  const clerkFapi = deriveClerkFapiUrl(publishableKey);

  return createProxyMiddleware({
    target: clerkFapi,
    changeOrigin: true,
    pathRewrite: (path: string) => {
      let p = path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), "");
      // The dev FAPI CDN may lag npm by a patch version.
      // Rewrite e.g. clerk-js@5.61.3 → 5.61.2 so the script loads (404 → 200).
      p = p.replace(
        /^(\/npm\/@clerk\/clerk-js@)(\d+)\.(\d+)\.(\d+)(\/)/,
        (_m, pre, maj, min, patch, post) => {
          const p2 = Math.max(0, parseInt(patch, 10) - 1);
          return `${pre}${maj}.${min}.${p2}${post}`;
        },
      );
      return p;
    },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.removeHeader("Clerk-Proxy-Url");
        proxyReq.removeHeader("Clerk-Secret-Key");
        proxyReq.removeHeader("X-Forwarded-Host");
        proxyReq.removeHeader("X-Forwarded-Port");
        proxyReq.removeHeader("X-Forwarded-Proto");
        proxyReq.removeHeader("X-Forwarded-For");
      },
    },
  }) as RequestHandler;
}
