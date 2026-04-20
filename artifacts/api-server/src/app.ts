import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { userIdMiddleware } from "./middlewares/userId";
import { rateLimit } from "express-rate-limit";

const app: Express = express();

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

// Clerk proxy must come before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());
app.use(userIdMiddleware);

// ─── Rate limiting ───────────────────────────────────────────────────────────

// Global: 300 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: (req) => req.path === "/api/health",
});

// AI routes: 60 requests per hour per IP (generous but bounded)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Try again in an hour." },
});

// Secrets write ops: 30 per 15 minutes (prevents bulk scraping)
const secretsWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many secret operations. Please wait." },
});

// Auth-adjacent endpoints: 10 per 5 minutes per IP
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait 5 minutes." },
});

app.use("/api", globalLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/forge", aiLimiter);
app.use("/api/flint", aiLimiter);
app.use("/api/sage", aiLimiter);
app.use("/api/hawk", aiLimiter);
app.use("/api/moon", aiLimiter);
app.use(["/api/secrets/import", "/api/secrets"], (req, res, next) => {
  if (req.method === "POST" || req.method === "DELETE") return secretsWriteLimiter(req, res, next);
  next();
});
app.use("/api/payments/checkout", authLimiter);

app.use("/api", router);

if (process.env["NODE_ENV"] === "production") {
  const staticDir = path.join(__dirname, "public");
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
