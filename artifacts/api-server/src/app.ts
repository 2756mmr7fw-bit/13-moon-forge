import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import authRouter from "./routes/auth";
import { logger } from "./lib/logger";
import { userIdMiddleware } from "./middlewares/userId";
import { rateLimit } from "express-rate-limit";
import { trackRequest, trackRlHit } from "./lib/trafficTracker";
import { incrementUsage } from "./routes/quota";

const app: Express = express();

// Trust the reverse proxy (Replit's load balancer sets X-Forwarded-For)
app.set("trust proxy", 1);

// Log every incoming request immediately (before any middleware can hang)
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url?.split("?")[0] }, "→ incoming");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Hard 10-second timeout for every request
app.use((req, res, next) => {
  const tid = setTimeout(() => {
    if (!res.headersSent) {
      logger.warn({ url: req.url?.split("?")[0] }, "hard request timeout");
      res.status(504).json({ error: "Server timeout. Please try again." });
    }
  }, 10_000);
  res.on("finish", () => clearTimeout(tid));
  res.on("close", () => clearTimeout(tid));
  next();
});

app.use(compression());
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Auth middleware — reads session cookie, populates req.user
app.use(authMiddleware);
// User ID middleware — sets req.userId from session or anon header
app.use(userIdMiddleware);

// ─── Auth state check ─────────────────────────────────────────────────────────
// Use app.use() with manual URL+method check instead of app.post() to avoid
// Express 5 route-matching issues observed in production. Handles both:
//   • /api/auth/me  — direct call or after server.mjs rewrites /x-auth/me
//   • /x-auth/me   — if CDN routes the POST directly to api-server
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "POST") { next(); return; }
  const u = req.url.split("?")[0];
  if (u === "/api/auth/me" || u === "/x-auth/me") {
    res.json({ user: req.user ?? null });
    return;
  }
  next();
});

// ─── Rate limiting ───────────────────────────────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: (req) => req.path === "/api/health",
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Try again in an hour." },
});

const secretsWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many secret operations. Please wait." },
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait 5 minutes." },
});

// ─── Request tracking (feeds /api/monitor/status) ───────────────────────────
const AI_GROUPS = new Set(["forge", "flint", "sage", "hawk", "ai", "moon"]);
app.use("/api", (req, res, next) => {
  const seg = req.path.split("/")[1] ?? "other";
  const group = AI_GROUPS.has(seg) ? "ai" :
    seg === "secrets" ? "secrets" :
    ["deploy", "registry", "coolify"].includes(seg) ? "deploy" :
    seg === "monitor" ? "monitor" : "other";
  trackRequest(group);
  res.on("finish", () => { if (res.statusCode === 429) trackRlHit(); });
  next();
});

const AI_TRACKED_PATHS = ["/api/forge", "/api/flint", "/api/sage", "/api/hawk", "/api/moon",
  "/api/screen-coach", "/api/computer-advisor/analyze", "/api/site-forge/generate"];
app.use(AI_TRACKED_PATHS, (req, _res, next) => {
  if (req.method === "POST") incrementUsage(req.userId).catch(() => {});
  next();
});

app.use("/api", globalLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/forge", aiLimiter);
app.use("/api/flint", aiLimiter);
app.use("/api/sage", aiLimiter);
app.use("/api/hawk", aiLimiter);
app.use("/api/moon", aiLimiter);
app.use("/api/screen-coach", aiLimiter);
app.use("/api/site-forge", aiLimiter);
app.use(["/api/secrets/import", "/api/secrets"], (req, res, next) => {
  if (req.method === "POST" || req.method === "DELETE") return secretsWriteLimiter(req, res, next);
  next();
});
app.use("/api/payments/checkout", authLimiter);

app.use("/api", authRouter);
app.use("/api", router);

// ─── Static frontend serving (Docker/VPS) ────────────────────────────────────
// In Replit deployment server.mjs handles this. In Docker the api-server serves
// the pre-built frontend that the Dockerfile copies into dist/public/.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.join(__dirname, "public");

app.use(
  express.static(STATIC_DIR, {
    maxAge: "7d",
    immutable: true,
    index: false,
  }),
);

app.get(/^\/(?!api\/).*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"), (err) => {
    if (err && !res.headersSent) res.status(404).send("Not found");
  });
});

export default app;
