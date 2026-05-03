import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const STATIC_DIR = path.join(__dirname, "dist", "public");
const API_HOST = "localhost";
const API_PORT = 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

function proxyToApi(req, res) {
  console.log(`[forge-server] proxy → ${req.method} ${req.url}`);
  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` },
  };

  const proxy = http.request(options, (apiRes) => {
    console.log(`[forge-server] proxy ← ${apiRes.statusCode} ${req.url}`);
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res, { end: true });
  });

  proxy.on("error", (err) => {
    console.error(`[forge-server] proxy error ${req.url}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API server unavailable", path: req.url }));
    }
  });

  req.pipe(proxy, { end: true });
}

function serveStatic(urlPath, res) {
  const decoded = decodeURIComponent(urlPath);
  const candidate = path.join(STATIC_DIR, decoded);

  if (!candidate.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(candidate, (err, stat) => {
    if (!err && stat.isFile()) {
      const ext = path.extname(candidate).toLowerCase();
      const ct = MIME[ext] || "application/octet-stream";
      const isAsset = decoded.startsWith("/assets/");
      res.writeHead(200, {
        "Content-Type": ct,
        ...(isAsset ? { "Cache-Control": "public, max-age=31536000, immutable" } : {}),
      });
      fs.createReadStream(candidate).pipe(res, { end: true });
    } else {
      serveIndex(res);
    }
  });
}

function serveIndex(res) {
  const indexPath = path.join(STATIC_DIR, "index.html");
  fs.readFile(indexPath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end("index.html not found");
    } else {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(data);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api") || pathname.startsWith("/api/")) {
    return proxyToApi(req, res);
  }

  serveStatic(pathname, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[forge-server] listening on port ${PORT}`);
});
