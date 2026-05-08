import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.get("/healthz", (req: Request, res: Response) => {
  // Vary: Cookie makes the CDN create separate cache entries for requests with
  // and without session cookies.  The deployment health-check has no cookie, so
  // only the no-cookie variant ends up cached.  Requests from signed-in browsers
  // are therefore CDN misses and reach this handler live — giving real-time auth
  // state without relying on POST (which Replit's platform can intercept).
  res.set("Vary", "Cookie, Accept-Encoding");
  res.set("Cache-Control", "no-cache");

  const user = req.user ?? null;
  const oidcClientId = process.env.OIDC_CLIENT_ID ?? process.env.REPL_ID ?? null;
  const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
  const domains = process.env.REPLIT_DOMAINS?.split(",").map((d) => d.trim()) ?? [];
  const appUrl = process.env.APP_URL ?? (domains[0] ? `https://${domains[0]}` : null);

  const buildId = process.env.BUILD_ID ?? "local";

  res.json({
    status: "ok",
    v: "2026-05-10",
    buildId,
    user,
    oidcClientId,
    issuerUrl,
    appUrl,
  });
});

export default router;
