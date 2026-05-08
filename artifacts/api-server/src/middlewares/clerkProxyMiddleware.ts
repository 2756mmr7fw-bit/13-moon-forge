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
