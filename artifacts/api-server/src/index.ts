import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { createRemoteWss } from "./routes/remote";
import { startUptimePoller } from "./routes/uptime";

// ─── Crash Guards ─────────────────────────────────────────────────────────────
// Prevent unhandled promise rejections and unexpected exceptions from taking
// down the entire process.  We log them as fatal-level errors so they are
// visible in Coolify / Docker logs without restarting the container.
process.on("uncaughtException", (err: Error) => {
  logger.fatal({ err }, "uncaughtException — keeping server alive");
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.fatal({ reason }, "unhandledRejection — keeping server alive");
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
const remoteWss = createRemoteWss();

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "ws://localhost");
  if (url.pathname.startsWith("/api/remote/ws/")) {
    remoteWss.handleUpgrade(req, socket, head, (ws) => {
      remoteWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  startUptimePoller();
});
