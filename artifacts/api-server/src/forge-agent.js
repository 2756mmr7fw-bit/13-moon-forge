#!/usr/bin/env node
// ╔═══════════════════════════════════════════╗
// ║   🔥 Forge Agent — 13 Moon Forge          ║
// ║   forge.13moonforge.ai                    ║
// ╚═══════════════════════════════════════════╝
//
// Download: curl -o forge.js https://13moonforge.ai/api/help/forge-agent.js
// Run:      node forge.js
// Inspect:  node forge.js inspect https://myapp.com
//
// Requires: Node.js 18+  (https://nodejs.org)

const https = require("https");
const http = require("http");
const readline = require("readline");
const { execSync, spawnSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Config ─────────────────────────────────────────────────────────────────────
const VERSION = "2.0.0";
const CONFIG_PATH = path.join(os.homedir(), ".forge-agent.json");
const FORGE_HOST = "13moonforge.ai";
const FORGE_BASE = "/api/help/cli-chat";
const PLAYWRIGHT_DIR = path.join(os.homedir(), ".forge-playwright");

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch { return {}; }
}
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function rl(prompt) {
  const iface = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => iface.question(prompt, ans => { iface.close(); res(ans.trim()); }));
}

function rlPassword(prompt) {
  return new Promise(resolve => {
    const iface = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(prompt);
    let val = "";
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (ch) => {
      if (ch === "\n" || ch === "\r") {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        iface.close();
        process.stdout.write("\n");
        resolve(val);
      } else if (ch === "\u0003") {
        process.exit();
      } else if (ch === "\u007f") {
        if (val.length > 0) { val = val.slice(0, -1); process.stdout.write("\b \b"); }
      } else {
        val += ch;
        process.stdout.write("*");
      }
    };
    process.stdin.on("data", onData);
  });
}

const C = { green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m", dim: "\x1b[2m", reset: "\x1b[0m", bold: "\x1b[1m", magenta: "\x1b[35m" };
function print(text, color) { process.stdout.write((C[color] || "") + text + C.reset); }
function println(text, color) { print(text + "\n", color); }

function run(cmd, cwd) {
  try {
    return { ok: true, out: execSync(cmd, { cwd: cwd || process.cwd(), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim() };
  } catch (e) {
    return { ok: false, out: e.stderr?.toString?.().trim() || e.message };
  }
}

// ── Project detection ──────────────────────────────────────────────────────────
function detectProject(dir) {
  const info = { dir, type: "unknown", name: path.basename(dir), envVars: [], gitUrl: null, hasGit: false };
  try {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      info.name = pkg.name || info.name;
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps["next"]) info.type = "Next.js";
      else if (deps["vite"] || deps["@vitejs/plugin-react"]) info.type = "React + Vite";
      else if (deps["react"]) info.type = "React";
      else if (deps["express"]) info.type = "Express API";
      else info.type = "Node.js";
    } else if (fs.existsSync(path.join(dir, "requirements.txt"))) {
      info.type = "Python";
    } else if (fs.existsSync(path.join(dir, "go.mod"))) {
      info.type = "Go";
    } else if (fs.existsSync(path.join(dir, "Cargo.toml"))) {
      info.type = "Rust";
    } else if (fs.existsSync(path.join(dir, "index.html"))) {
      info.type = "Static HTML";
    }
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split("\n");
      for (const line of lines) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq > 0) info.envVars.push(t.slice(0, eq).trim());
      }
    }
    const gitCheck = run("git remote get-url origin", dir);
    if (gitCheck.ok) { info.hasGit = true; info.gitUrl = gitCheck.out; }
    else { const g = run("git rev-parse --git-dir", dir); info.hasGit = g.ok; }
  } catch { /* best-effort */ }
  return info;
}

// ── GitHub API ─────────────────────────────────────────────────────────────────
function githubRequest(method, endpoint, data, token) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const req = https.request({
      hostname: "api.github.com", path: endpoint, method,
      headers: {
        "Authorization": `Bearer ${token}`, "User-Agent": "forge-agent/1.1",
        "Accept": "application/vnd.github.v3+json", "Content-Type": "application/json",
        ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
      },
    }, (res) => {
      let buf = "";
      res.on("data", d => buf += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function createGithubRepo(name, token, isPrivate = true) {
  const r = await githubRequest("POST", "/user/repos", { name, private: isPrivate, auto_init: false }, token);
  if (r.status === 201) return { ok: true, url: r.data.clone_url, htmlUrl: r.data.html_url };
  return { ok: false, error: r.data?.message || "Failed" };
}

async function getGithubUser(token) {
  const r = await githubRequest("GET", "/user", null, token);
  if (r.status === 200) return r.data.login;
  return null;
}

// ── Forge API streaming ────────────────────────────────────────────────────────
function forgeChat(messages, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ messages });
    const isHttps = FORGE_HOST !== "localhost";
    const lib = isHttps ? https : http;
    const port = isHttps ? 443 : 80;
    const req = lib.request({
      hostname: FORGE_HOST, port, path: FORGE_BASE, method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`, "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      if (res.statusCode === 401) { reject(new Error("AUTH_FAILED")); return; }
      if (res.statusCode === 404) { reject(new Error("ENDPOINT_NOT_FOUND")); return; }
      let accumulated = "";
      print("\n", "");
      print("Forge: ", "yellow");
      res.on("data", (chunk) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "chunk" && ev.text) { process.stdout.write(ev.text); accumulated += ev.text; }
          } catch { /* skip */ }
        }
      });
      res.on("end", () => { print("\n", ""); resolve(accumulated); });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── GET from Forge API ────────────────────────────────────────────────────────
function forgeGet(apiPath, token) {
  return new Promise((resolve, reject) => {
    const isHttps = FORGE_HOST !== "localhost";
    const lib = isHttps ? https : http;
    const req = lib.request({
      hostname: FORGE_HOST, port: isHttps ? 443 : 80, path: apiPath, method: "GET",
      headers: { "Authorization": `Bearer ${token}` },
    }, (res) => {
      let buf = "";
      res.on("data", d => buf += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ── POST JSON to Forge API ─────────────────────────────────────────────────────
function forgePost(path, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const isHttps = FORGE_HOST !== "localhost";
    const lib = isHttps ? https : http;
    const req = lib.request({
      hostname: FORGE_HOST, port: isHttps ? 443 : 80, path, method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`, "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      let buf = "";
      res.on("data", d => buf += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Tool execution ─────────────────────────────────────────────────────────────
async function handleTool(name, args, cfg) {
  switch (name) {
    case "check_project": {
      const dir = args.path || process.cwd();
      if (!fs.existsSync(dir)) return `Directory not found: ${dir}`;
      return JSON.stringify(detectProject(dir), null, 2);
    }
    case "git_init": {
      const dir = args.path || process.cwd();
      const r1 = run("git init", dir);
      if (!r1.ok) return `git init failed: ${r1.out}`;
      const r2 = run('git add -A && git commit -m "Initial commit from Forge Agent"', dir);
      return r2.ok ? "Git initialized and first commit created." : `Committed but: ${r2.out}`;
    }
    case "git_push": {
      const { path: dir, remoteUrl } = args;
      if (remoteUrl) { run(`git remote remove origin`, dir); run(`git remote add origin ${remoteUrl}`, dir); }
      run("git add -A", dir);
      run('git commit -m "Auto-commit from Forge Agent" --allow-empty', dir);
      const r = run("git push -u origin main 2>&1 || git push -u origin master 2>&1", dir);
      return r.ok ? "Pushed successfully." : `Push failed: ${r.out}`;
    }
    case "create_github_repo": {
      if (!cfg.githubToken) return "No GitHub token configured.";
      const r = await createGithubRepo(args.name, cfg.githubToken, args.private !== false);
      if (r.ok) { saveConfig({ ...loadConfig(), lastRepoUrl: r.url }); return `Created: ${r.htmlUrl}\nClone URL: ${r.url}`; }
      return `Failed: ${r.error}`;
    }
    case "read_env": {
      const dir = args.path || process.cwd();
      const envPath = path.join(dir, ".env");
      if (!fs.existsSync(envPath)) return "No .env file found.";
      const keys = [];
      for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("="); if (eq > 0) keys.push(t.slice(0, eq).trim());
      }
      return `Found ${keys.length} env vars: ${keys.join(", ")}`;
    }
    case "list_files": {
      const dir = args.path || process.cwd();
      try { return fs.readdirSync(dir).filter(f => !f.startsWith(".") && f !== "node_modules").join("\n"); }
      catch (e) { return `Cannot list: ${e.message}`; }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ── FORGE INSPECTOR — Browser-based app testing ──────────────────────────────
// ════════════════════════════════════════════════════════════════════════════════

async function ensurePlaywright() {
  // Check if playwright is available in our dedicated dir
  const pwModulePath = path.join(PLAYWRIGHT_DIR, "node_modules", "playwright");
  if (fs.existsSync(pwModulePath)) {
    println("  ✓ Browser tools ready", "green");
    return pwModulePath;
  }

  println("  Installing browser tools (one-time setup, ~200MB)...", "dim");
  println("  This downloads a dedicated browser for Forge — won't touch your other software.\n", "dim");

  // Create the playwright dir
  if (!fs.existsSync(PLAYWRIGHT_DIR)) fs.mkdirSync(PLAYWRIGHT_DIR, { recursive: true });

  // Write a minimal package.json
  fs.writeFileSync(path.join(PLAYWRIGHT_DIR, "package.json"), JSON.stringify({ name: "forge-playwright", version: "1.0.0", private: true }, null, 2));

  // Install playwright
  println("  Downloading Playwright...", "dim");
  const installResult = spawnSync("npm", ["install", "playwright", "--no-save"], {
    cwd: PLAYWRIGHT_DIR, stdio: "inherit", encoding: "utf8",
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(PLAYWRIGHT_DIR, "browsers") },
  });

  if (installResult.status !== 0) {
    throw new Error("Failed to install Playwright. Make sure npm is installed.");
  }

  // Install chromium
  println("\n  Downloading Chromium browser...", "dim");
  const chromiumResult = spawnSync("node", [
    path.join(PLAYWRIGHT_DIR, "node_modules", ".bin", "playwright"),
    "install", "chromium"
  ], {
    cwd: PLAYWRIGHT_DIR, stdio: "inherit",
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(PLAYWRIGHT_DIR, "browsers") },
  });

  if (chromiumResult.status !== 0) {
    throw new Error("Failed to install Chromium.");
  }

  println("\n  ✓ Browser tools installed successfully\n", "green");
  return pwModulePath;
}

function getPlaywright() {
  const pwPath = path.join(PLAYWRIGHT_DIR, "node_modules", "playwright");
  if (!fs.existsSync(pwPath)) throw new Error("Playwright not installed. Run inspect first to install.");
  return require(pwPath);
}

// ── Viewport definitions ───────────────────────────────────────────────────────
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 390,  height: 844 },
};

async function inspectApp(appUrl, options = {}) {
  const {
    token, loginUrl, username, password, pages = [], appName = appUrl,
    saveScreenshots = true, appId, recheckOf, headless = false,
    viewports: viewportList = ["desktop"], customAssertions = [], baselines = [],
    environment = "production", buildSha = null, failOnErrors = false,
    jsonOutput = false, perfBudgetMs = null,
  } = options;

  const crypto = require("crypto");

  // Output directory for screenshots
  const outDir = path.join(os.homedir(), "forge-inspection", new Date().toISOString().slice(0, 10));
  if (saveScreenshots) fs.mkdirSync(outDir, { recursive: true });

  const findings = [];
  const screenshots = [];
  const allConsoleErrors = [];
  const allNetworkFailures = [];
  const allPerformanceMetrics = {};
  const allAxeViolations = {};
  const allAssertionResults = [];
  const visualDiffs = [];

  function finding(type, message, page, detail) {
    const f = { type, message, page, detail, ts: Date.now() };
    findings.push(f);
    const icon = { ok: "✓", warn: "⚠", error: "✗", info: "•", step: "→" }[type] || "•";
    const color = { ok: "green", warn: "yellow", error: "red", info: "cyan", step: "dim" }[type] || "reset";
    print(`  ${icon} `, color);
    if (page) print(`[${page}] `, "dim");
    println(message, color === "dim" ? "reset" : "reset");
    if (detail) println(`    ${detail}`, "dim");
  }

  println("\n  ╔══════════════════════════════════════════╗", "magenta");
  println("  ║   🔍 Forge Inspector                     ║", "magenta");
  println(`  ║   ${appName.slice(0, 40).padEnd(40)} ║`, "magenta");
  println("  ╚══════════════════════════════════════════╝\n", "magenta");

  // Ensure playwright
  try {
    await ensurePlaywright();
  } catch (e) {
    println(`  ✗ Could not set up browser: ${e.message}`, "red");
    println("  Make sure npm is installed (https://nodejs.org)", "dim");
    return;
  }

  // Set browser path env
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(PLAYWRIGHT_DIR, "browsers");
  const { chromium } = getPlaywright();

  finding("step", `Starting browser inspection of ${appUrl}`);

  let browser, context, mainPage;
  try {
    browser = await chromium.launch({
      headless,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      slowMo: headless ? 0 : 150,
    });

    const primaryViewport = VIEWPORTS[viewportList[0]] || VIEWPORTS.desktop;
    context = await browser.newContext({
      viewport: primaryViewport,
      userAgent: "ForgeInspector/2.0 (13moonforge.ai)",
    });

    // Capture console errors and network failures globally
    context.on("page", pg => {
      pg.on("console", msg => {
        if (msg.type() === "error") allConsoleErrors.push({ text: msg.text(), url: pg.url(), ts: Date.now() });
      });
      pg.on("pageerror", err => {
        allConsoleErrors.push({ text: err.message, url: pg.url(), ts: Date.now() });
      });
      pg.on("response", resp => {
        const st = resp.status();
        if (st >= 400) allNetworkFailures.push({ url: resp.url(), status: st, page: pg.url() });
      });
    });

    mainPage = await context.newPage();

    // ── Check app is reachable ─────────────────────────────────────────────────
    finding("step", "Checking app is reachable...");
    try {
      const response = await mainPage.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      const status = response?.status() ?? 0;
      if (status >= 400) {
        finding("error", `App returned HTTP ${status}`, "/");
      } else {
        finding("ok", `App is up — HTTP ${status}`, "/");
      }
    } catch (e) {
      finding("error", `App is not reachable: ${e.message}`);
      await browser.close();
      return;
    }

    // ── Screenshot homepage ────────────────────────────────────────────────────
    await new Promise(r => setTimeout(r, 1500));
    const homeTitle = await mainPage.title();
    finding("info", `Home title: "${homeTitle}"`, "/");

    if (saveScreenshots) {
      const ssPath = path.join(outDir, "01-homepage.png");
      await mainPage.screenshot({ path: ssPath, fullPage: true });
      const ssData = fs.readFileSync(ssPath).toString("base64");
      screenshots.push({ page: "/", label: "Homepage", path: ssPath, data: ssData });
      finding("ok", `Screenshot saved`, "/");
    }

    // ── Log in ─────────────────────────────────────────────────────────────────
    if (username && password) {
      finding("step", `Logging in as "${username}"...`);

      const loginTarget = loginUrl || `${appUrl.replace(/\/$/, "")}/login`;

      // Navigate to login page if not already there
      const currentUrl = mainPage.url();
      const isOnLogin = currentUrl.includes("login") || currentUrl.includes("signin") || currentUrl.includes("sign-in");
      if (!isOnLogin) {
        try {
          await mainPage.goto(loginTarget, { waitUntil: "domcontentloaded", timeout: 10000 });
        } catch { /* might redirect */ }
      }

      await new Promise(r => setTimeout(r, 1000));

      // Try to find and fill login form
      try {
        // Find username/email field
        const emailSelectors = [
          'input[type="email"]',
          'input[name="email"]',
          'input[name="username"]',
          'input[name="user"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="username" i]',
          'input[autocomplete="email"]',
          'input[autocomplete="username"]',
        ];

        let emailField = null;
        for (const sel of emailSelectors) {
          try {
            emailField = await mainPage.waitForSelector(sel, { timeout: 2000 });
            if (emailField) break;
          } catch { /* try next */ }
        }

        if (!emailField) {
          finding("warn", "Could not find username/email field on login page");
        } else {
          await emailField.fill(username);
          finding("ok", "Filled username/email field");
        }

        // Find password field
        const pwField = await mainPage.$('input[type="password"]');
        if (!pwField) {
          finding("warn", "Could not find password field on login page");
        } else {
          await pwField.fill(password);
          finding("ok", "Filled password field");
        }

        // Screenshot before submit
        if (saveScreenshots) {
          const ssPath = path.join(outDir, "02-login-filled.png");
          await mainPage.screenshot({ path: ssPath });
          screenshots.push({ page: "login", label: "Login form filled", path: ssPath, data: fs.readFileSync(ssPath).toString("base64") });
        }

        // Submit — try Enter key first, then submit button
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Log in")',
          'button:has-text("Sign in")',
          'button:has-text("Login")',
          'button:has-text("Continue")',
        ];

        let submitted = false;
        for (const sel of submitSelectors) {
          try {
            const btn = await mainPage.$(sel);
            if (btn) {
              await btn.click();
              submitted = true;
              finding("ok", "Clicked submit button");
              break;
            }
          } catch { /* try next */ }
        }

        if (!submitted) {
          await pwField?.press("Enter");
          finding("info", "Pressed Enter to submit");
        }

        // Wait for navigation
        await mainPage.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 2000));

        const afterUrl = mainPage.url();
        const afterTitle = await mainPage.title();

        if (afterUrl.includes("login") || afterUrl.includes("signin") || afterTitle.toLowerCase().includes("sign in") || afterTitle.toLowerCase().includes("log in")) {
          finding("warn", `Still on login page — check credentials`, "login", `Current URL: ${afterUrl}`);

          // Check for error messages on page
          const errorText = await mainPage.$eval("body", el => {
            const texts = [];
            for (const el2 of el.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"]')) {
              texts.push(el2.textContent?.trim());
            }
            return texts.filter(Boolean).join(" | ");
          }).catch(() => "");
          if (errorText) finding("error", `Error on page: ${errorText}`, "login");
        } else {
          finding("ok", `Logged in — now on "${afterTitle}"`, "login");

          if (saveScreenshots) {
            const ssPath = path.join(outDir, "03-after-login.png");
            await mainPage.screenshot({ path: ssPath, fullPage: true });
            screenshots.push({ page: "post-login", label: "After login", path: ssPath, data: fs.readFileSync(ssPath).toString("base64") });
          }
        }

      } catch (e) {
        finding("warn", `Login automation hit an issue: ${e.message}`, "login");
        finding("info", "Continuing inspection as current session...");
      }
    }

    // ── Inspect each page ──────────────────────────────────────────────────────
    const allPages = [...new Set(pages)].filter(Boolean);
    if (allPages.length === 0) {
      // Auto-discover links from current page
      finding("step", "No pages specified — auto-discovering links...");
      try {
        const links = await mainPage.$$eval("a[href]", els =>
          els.map(el => el.getAttribute("href"))
            .filter(h => h && h.startsWith("/") && !h.startsWith("//") && h.length > 1)
            .filter(h => !h.match(/\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|css|js)$/i))
        );
        const uniqueLinks = [...new Set(links)].slice(0, 8);
        allPages.push(...uniqueLinks);
        finding("info", `Found ${uniqueLinks.length} pages to check: ${uniqueLinks.join(", ")}`);
      } catch { /* no auto-discover */ }
    }

    for (let i = 0; i < allPages.length; i++) {
      const pagePath = allPages[i];
      const pageUrl = pagePath.startsWith("http") ? pagePath : `${appUrl.replace(/\/$/, "")}${pagePath.startsWith("/") ? "" : "/"}${pagePath}`;

      finding("step", `Inspecting ${pageUrl}...`, pagePath);

      try {
        const response = await mainPage.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        await new Promise(r => setTimeout(r, 1500));

        const status = response?.status() ?? 0;
        if (status >= 400) {
          finding("error", `HTTP ${status}`, pagePath);
          continue;
        }

        const title = await mainPage.title();
        finding("ok", `Loaded — "${title}" (HTTP ${status})`, pagePath);

        // ── Performance metrics ──────────────────────────────────────────────
        const perf = await mainPage.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          const paints = Object.fromEntries(performance.getEntriesByType("paint").map(p => [p.name, Math.round(p.startTime)]));
          return nav ? {
            ttfb: Math.round(nav.responseStart - nav.requestStart),
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            loadTime: Math.round(nav.loadEventEnd - nav.startTime),
            firstPaint: paints["first-paint"] ?? null,
            firstContentfulPaint: paints["first-contentful-paint"] ?? null,
          } : null;
        }).catch(() => null);

        if (perf) {
          allPerformanceMetrics[pagePath] = perf;
          const lcpLabel = perf.firstContentfulPaint !== null ? `FCP ${perf.firstContentfulPaint}ms` : "";
          const ttfbLabel = `TTFB ${perf.ttfb}ms`;
          const loadLabel = `Load ${perf.loadTime}ms`;
          finding("info", `Perf: ${[ttfbLabel, lcpLabel, loadLabel].filter(Boolean).join(" · ")}`, pagePath);
          if (perf.loadTime > 5000) finding("warn", `Slow page load: ${perf.loadTime}ms (target <3000ms)`, pagePath);
          else if (perf.loadTime > 3000) finding("warn", `Page load borderline slow: ${perf.loadTime}ms`, pagePath);
          if (perf.ttfb > 800) finding("warn", `High TTFB: ${perf.ttfb}ms (target <600ms)`, pagePath);
        }

        // ── Visible error text check ─────────────────────────────────────────
        const bodyText = await mainPage.$eval("body", el => el.innerText).catch(() => "");
        const errorPatterns = [
          /something went wrong/i, /application error/i, /500 internal server/i,
          /cannot read properties/i, /is not defined/i, /failed to fetch/i,
          /econnrefused/i, /network error/i, /chunk load error/i,
        ];
        for (const pat of errorPatterns) {
          if (pat.test(bodyText)) {
            const match = bodyText.match(pat);
            const idx = bodyText.toLowerCase().indexOf(match[0].toLowerCase());
            const snippet = bodyText.slice(Math.max(0, idx - 30), idx + 100).replace(/\s+/g, " ").trim();
            finding("warn", `Error text detected on page`, pagePath, snippet);
            break;
          }
        }

        // ── Empty content check ──────────────────────────────────────────────
        const mainContent = await mainPage.$eval("main, #root, #app, [role='main'], .main-content", el => el.innerText?.trim()).catch(() => null);
        if (mainContent !== null && mainContent.length < 20) {
          finding("warn", "Main content area appears empty or not rendered", pagePath);
        }

        // ── Broken images ────────────────────────────────────────────────────
        const brokenImages = await mainPage.$$eval("img", imgs =>
          imgs.filter(img => !img.complete || img.naturalWidth === 0)
              .map(img => img.src || img.getAttribute("src")).filter(Boolean).slice(0, 5)
        ).catch(() => []);
        if (brokenImages.length > 0) {
          finding("warn", `${brokenImages.length} broken image(s)`, pagePath, brokenImages.join(", "));
        }

        // ── Accessibility scan (axe-core) ────────────────────────────────────
        try {
          await mainPage.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.0/axe.min.js" });
          const violations = await mainPage.evaluate(async () => {
            const r = await axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] } });
            return r.violations.map(v => ({
              id: v.id, impact: v.impact, description: v.description,
              nodes: v.nodes.length, help: v.help, helpUrl: v.helpUrl,
            }));
          });
          if (violations.length > 0) {
            allAxeViolations[pagePath] = violations;
            const critical = violations.filter(v => v.impact === "critical").length;
            const serious = violations.filter(v => v.impact === "serious").length;
            finding(critical > 0 || serious > 0 ? "warn" : "info",
              `Accessibility: ${violations.length} violation${violations.length !== 1 ? "s" : ""} (${critical} critical, ${serious} serious)`,
              pagePath,
              violations.slice(0, 3).map(v => `${v.impact}: ${v.help}`).join(" | "),
            );
          } else {
            finding("ok", "Accessibility: no WCAG violations found", pagePath);
          }
        } catch { /* axe injection failed — likely strict CSP */ }

        // ── Custom assertions ────────────────────────────────────────────────
        for (const assertion of customAssertions) {
          try {
            let passed = false;
            if (assertion.selector) {
              passed = await mainPage.$(assertion.selector).then(el => el !== null).catch(() => false);
            } else if (assertion.text) {
              passed = await mainPage.evaluate(t => document.body.innerText.includes(t), assertion.text).catch(() => false);
            }
            allAssertionResults.push({ label: assertion.label || assertion.text || assertion.selector, passed, page: pagePath });
            if (!passed) finding("warn", `Assertion failed: "${assertion.label || assertion.text || assertion.selector}"`, pagePath);
            else finding("ok", `Assertion passed: "${assertion.label || assertion.text || assertion.selector}"`, pagePath);
          } catch (e) {
            allAssertionResults.push({ label: assertion.label || assertion.text || assertion.selector, passed: false, error: e.message, page: pagePath });
          }
        }

        // ── Desktop screenshot + visual regression ───────────────────────────
        if (saveScreenshots) {
          const safeName = pagePath.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30) || "page";
          const ssPath = path.join(outDir, `${String(i + 4).padStart(2, "0")}-${safeName}-desktop.png`);
          const ssBuffer = await mainPage.screenshot({ path: ssPath, fullPage: true });
          const ssData = (ssBuffer || fs.readFileSync(ssPath)).toString("base64");
          const ssHash = crypto.createHash("sha256").update(ssData).digest("hex").slice(0, 16);
          screenshots.push({ page: pagePath, label: pagePath, viewport: "desktop", path: ssPath, data: ssData, hash: ssHash });

          // Compare against baseline
          const baseline = baselines.find(b => b.page === pagePath && b.viewport === "desktop");
          if (baseline) {
            if (baseline.screenshotHash && !baseline.screenshotHash.startsWith(ssHash.slice(0, 8))) {
              finding("warn", `Visual change detected vs. approved baseline`, pagePath, `Approve new look at 13moonforge.ai/app-inspector`);
              visualDiffs.push({ page: pagePath, viewport: "desktop", changed: true, hash: ssHash, baselineHash: baseline.screenshotHash });
            } else {
              finding("ok", `Visual regression: matches baseline`, pagePath);
              visualDiffs.push({ page: pagePath, viewport: "desktop", changed: false, hash: ssHash });
            }
          } else {
            visualDiffs.push({ page: pagePath, viewport: "desktop", noBaseline: true, hash: ssHash });
          }

          finding("ok", `Screenshot saved → ${ssPath}`, pagePath);
        }

        // ── Additional viewports (tablet, mobile) — screenshot only ──────────
        for (const vp of viewportList.slice(1)) {
          const vpSize = VIEWPORTS[vp];
          if (!vpSize) continue;
          try {
            await mainPage.setViewportSize(vpSize);
            await new Promise(r => setTimeout(r, 500));
            const safeName = pagePath.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30) || "page";
            const ssPath = saveScreenshots ? path.join(outDir, `${String(i + 4).padStart(2, "0")}-${safeName}-${vp}.png`) : null;
            const ssBuffer = ssPath ? await mainPage.screenshot({ path: ssPath, fullPage: true }) : await mainPage.screenshot({ fullPage: true });
            const ssData = ssBuffer.toString("base64");
            const ssHash = crypto.createHash("sha256").update(ssData).digest("hex").slice(0, 16);
            screenshots.push({ page: pagePath, label: `${pagePath} (${vp})`, viewport: vp, path: ssPath, data: ssData, hash: ssHash });
            finding("ok", `${vp.charAt(0).toUpperCase() + vp.slice(1)} screenshot saved`, pagePath);

            // Visual regression for this viewport
            const baseline = baselines.find(b => b.page === pagePath && b.viewport === vp);
            if (baseline && baseline.screenshotHash && !baseline.screenshotHash.startsWith(ssHash.slice(0, 8))) {
              finding("warn", `Visual change on ${vp}: differs from approved baseline`, pagePath);
              visualDiffs.push({ page: pagePath, viewport: vp, changed: true, hash: ssHash, baselineHash: baseline.screenshotHash });
            } else if (baseline) {
              visualDiffs.push({ page: pagePath, viewport: vp, changed: false, hash: ssHash });
            }
          } catch { /* viewport resize failed, skip */ }
          // Restore to primary viewport
          await mainPage.setViewportSize(VIEWPORTS[viewportList[0]] || VIEWPORTS.desktop).catch(() => {});
        }

      } catch (e) {
        finding("error", `Failed to load: ${e.message}`, pagePath);
      }
    }

    // ── Console errors summary ─────────────────────────────────────────────────
    if (allConsoleErrors.length > 0) {
      finding("warn", `${allConsoleErrors.length} JavaScript error(s) in browser console`);
      allConsoleErrors.slice(0, 3).forEach(e => finding("error", e.text.slice(0, 120), null, null));
    } else {
      finding("ok", "No JavaScript console errors detected");
    }

    // ── Network failures summary ───────────────────────────────────────────────
    const significantNetFails = allNetworkFailures.filter(f => !f.url.includes("axe") && !f.url.includes("analytics"));
    if (significantNetFails.length > 0) {
      finding("warn", `${significantNetFails.length} failed network request(s)`);
      significantNetFails.slice(0, 3).forEach(f => finding("error", `HTTP ${f.status}: ${f.url.slice(0, 80)}`, null, null));
    } else {
      finding("ok", "No failed network requests detected");
    }

  } catch (e) {
    finding("error", `Inspector crashed: ${e.message}`);
  } finally {
    if (browser) {
      // Keep browser open a moment so user can see the last state
      await new Promise(r => setTimeout(r, 2000));
      await browser.close();
    }
  }

  const errors = findings.filter(f => f.type === "error").length;
  const warns = findings.filter(f => f.type === "warn").length;
  const oks = findings.filter(f => f.type === "ok").length;

  // ── Accessibility summary ──────────────────────────────────────────────────
  const totalAxeViolations = Object.values(allAxeViolations).reduce((s, v) => s + v.length, 0);
  if (totalAxeViolations > 0) {
    println(`\n  ♿ Accessibility: ${totalAxeViolations} WCAG violation${totalAxeViolations !== 1 ? "s" : ""} across ${Object.keys(allAxeViolations).length} page${Object.keys(allAxeViolations).length !== 1 ? "s" : ""}`, "yellow");
  } else {
    println(`\n  ♿ Accessibility: WCAG compliant — no violations`, "green");
  }

  // ── Performance summary ────────────────────────────────────────────────────
  const perfPages = Object.values(allPerformanceMetrics);
  if (perfPages.length > 0) {
    const avgLoad = Math.round(perfPages.reduce((s, p) => s + (p.loadTime ?? 0), 0) / perfPages.length);
    const slowPages = perfPages.filter(p => (p.loadTime ?? 0) > 3000).length;
    println(`  ⚡ Performance: avg load ${avgLoad}ms${slowPages > 0 ? `, ${slowPages} slow page${slowPages !== 1 ? "s" : ""}` : ""}`, avgLoad > 3000 ? "yellow" : "green");
  }

  // ── Visual regression summary ──────────────────────────────────────────────
  const changedScreens = visualDiffs.filter(d => d.changed).length;
  const noBaselineScreens = visualDiffs.filter(d => d.noBaseline).length;
  if (changedScreens > 0) println(`  👁  Visual: ${changedScreens} page${changedScreens !== 1 ? "s" : ""} differ from baseline`, "yellow");
  else if (noBaselineScreens > 0) println(`  👁  Visual: no baselines set — run 'node forge.js approve' to set them`, "dim");
  else if (visualDiffs.length > 0) println(`  👁  Visual: all pages match baselines`, "green");

  // ── Custom assertions summary ──────────────────────────────────────────────
  if (allAssertionResults.length > 0) {
    const passed = allAssertionResults.filter(a => a.passed).length;
    println(`  ✔  Assertions: ${passed}/${allAssertionResults.length} passed`, passed < allAssertionResults.length ? "yellow" : "green");
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  println("\n  ─────────────────────────────────────────", "dim");
  println("  Inspection complete", "bold");
  if (errors > 0) println(`  ✗ ${errors} error${errors !== 1 ? "s" : ""}`, "red");
  if (warns > 0) println(`  ⚠ ${warns} warning${warns !== 1 ? "s" : ""}`, "yellow");
  println(`  ✓ ${oks} passed`, "green");
  if (saveScreenshots) println(`\n  Screenshots saved to:\n  ${outDir}`, "dim");

  // ── Perf budget check ──────────────────────────────────────────────────────
  if (perfBudgetMs && Object.keys(allPerformanceMetrics).length > 0) {
    const slowPages = Object.entries(allPerformanceMetrics)
      .filter(([, m]) => m.domContentLoaded && m.domContentLoaded > perfBudgetMs)
      .map(([page]) => page);
    if (slowPages.length > 0) {
      finding("error", `Performance budget exceeded: ${slowPages.length} page${slowPages.length !== 1 ? "s" : ""} load > ${perfBudgetMs}ms`);
      slowPages.forEach(p => {
        const ms = allPerformanceMetrics[p]?.domContentLoaded;
        finding("error", `  Load time ${ms}ms > budget ${perfBudgetMs}ms`, p);
      });
    }
  }

  // ── Send report to Forge UI ────────────────────────────────────────────────
  let reportId = null;
  if (token) {
    print("\n  Quill is writing up the issues...", "dim");
    try {
      const result = await forgePost("/api/inspector/cli-report", {
        appName,
        appUrl,
        appId: appId ?? undefined,
        recheckOf: recheckOf ?? undefined,
        environment,
        buildSha: buildSha ?? undefined,
        findings: findings.map(({ type, message, page, detail }) => ({ type, message, page, detail })),
        screenshots: screenshots.map(s => ({ page: s.page, label: s.label, viewport: s.viewport ?? "desktop", data: s.data, hash: s.hash })),
        consoleErrors: allConsoleErrors,
        networkFailures: significantNetFails ?? allNetworkFailures.filter(f => !f.url.includes("axe")),
        performanceMetrics: allPerformanceMetrics,
        accessibilityViolations: allAxeViolations,
        assertionResults: allAssertionResults,
        visualDiffs,
        inspectedAt: new Date().toISOString(),
        pagesChecked: allPages.length,
        errorCount: errors,
        warnCount: warns,
      }, token);

      if (result.status === 200 || result.status === 201) {
        reportId = result.data?.reportId ?? null;
        println("\n  ✓ Quill's full report is ready.", "green");
        println("  View at: https://13moonforge.ai/app-inspector", "green");
        if (reportId) println(`  Report ID: ${reportId}`, "dim");
        if (result.data?.quillDoc) {
          println("\n  ─── Quill's Summary ─────────────────────────────────", "dim");
          const doc = result.data.quillDoc;
          println(doc.length > 600 ? doc.slice(0, 600) + "\n  ...(full report in app)" : doc, "reset");
          println("  ──────────────────────────────────────────────────────", "dim");
        }
      } else {
        println("\n  (Could not sync to Forge — screenshots saved locally)", "dim");
      }
    } catch { println("\n  (Could not reach Forge — screenshots saved locally)", "dim"); }
  }

  // ── JSON output for CI ──────────────────────────────────────────────────────
  if (jsonOutput) {
    const summary = {
      appName, appUrl, environment,
      buildSha: buildSha ?? null,
      passed: errors === 0,
      errorCount: errors,
      warnCount: warns,
      okCount: oks,
      pagesChecked: allPages.length,
      reportId,
      inspectedAt: new Date().toISOString(),
    };
    process.stdout.write("\n__FORGE_JSON__" + JSON.stringify(summary) + "\n");
  }

  // ── Fail-on-errors exit code (for CI) ──────────────────────────────────────
  if (failOnErrors && errors > 0) {
    println(`\n  ✗ Exiting with code 1 — ${errors} error${errors !== 1 ? "s" : ""} found (--fail-on-errors)`, "red");
    process.exit(1);
  }

  println("\n", "");
}

// ── Fetch saved apps from Forge ────────────────────────────────────────────────
async function fetchSavedApps(token) {
  try {
    const r = await forgeGet("/api/inspector/cli-apps", token);
    if (r.status === 200 && Array.isArray(r.data.apps)) return r.data.apps;
    return [];
  } catch { return []; }
}

// ── Fetch recheck data (last failing pages for an app) ─────────────────────────
async function fetchRecheckData(token, appName) {
  try {
    const qs = appName ? `?appName=${encodeURIComponent(appName)}` : "";
    const r = await forgeGet(`/api/inspector/cli-recheck-data${qs}`, token);
    if (r.status === 200 && r.data.found) return r.data;
    return null;
  } catch { return null; }
}

// ── Recheck mode — re-inspect only previously failing pages ───────────────────
async function runRecheckMode(args, cfg) {
  println("\n  🔁 Forge Recheck Mode\n", "magenta");

  const appName = args[0] || null;
  println(`  Fetching last inspection${appName ? ` for "${appName}"` : ""}...`, "dim");

  const data = await fetchRecheckData(cfg.token, appName);
  if (!data) {
    println("  No previous inspection found. Run 'node forge.js inspect <url>' first.\n", "yellow");
    return;
  }

  const { appName: name, appUrl, appId, reportId, failingPages, errorCount, warnCount } = data;

  println(`\n  App: ${name}`, "bold");
  println(`  URL: ${appUrl}`, "dim");
  println(`  Previous run: ${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warnCount} warning${warnCount !== 1 ? "s" : ""}`, "yellow");

  if (failingPages.length === 0) {
    println("  No failing pages from last run — nothing to recheck!\n", "green");
    return;
  }

  println(`\n  Rechecking ${failingPages.length} failing page${failingPages.length !== 1 ? "s" : ""}:`, "dim");
  failingPages.forEach(p => println(`    • ${p}`, "dim"));
  println("", "");

  const proceed = await rl("  Enter password to log in (or press Enter to skip login): ");
  const username = await rl("  Username/email (or Enter to skip): ");
  let password = null;
  if (username) password = await rlPassword(`  Password for ${username}: `);

  await inspectApp(appUrl, {
    token: cfg.token,
    username: username || undefined,
    password: password || undefined,
    pages: failingPages,
    appName: name,
    appId,
    recheckOf: reportId,
    saveScreenshots: true,
  });
}

// ── Show saved apps menu and let user pick ────────────────────────────────────
async function pickAppsFromMenu(apps) {
  println("\n  Your saved apps:\n", "bold");
  apps.forEach((app, i) => {
    print(`  ${String(i + 1).padStart(2)}. `, "dim");
    print(app.name, "bold");
    println(`  ${app.url}`, "dim");
  });
  println("\n  Enter numbers or names (e.g. 1,3 or 'My App, Blog'). 'all' to inspect everything.\n", "dim");
  const input = await rl("  Which apps? ");

  if (input.toLowerCase() === "all") return apps;

  // Try number selection
  const nums = input.split(/[,\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= apps.length);
  if (nums.length > 0) return nums.map(n => apps[n - 1]);

  // Try name matching
  const names = input.split(",").map(n => n.trim().toLowerCase());
  return apps.filter(app => names.some(n => app.name.toLowerCase().includes(n)));
}

// ── Parse inspect command line args ───────────────────────────────────────────
async function runInspectMode(args, cfg) {
  // Check for direct URL
  const directUrl = args.find(a => a.startsWith("http"));

  // Parse flags
  const getArg = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };
  const getFlagValue = (prefix) => {
    const a = args.find(x => x.startsWith(prefix + "="));
    return a ? a.slice(prefix.length + 1) : null;
  };
  const hasFlag = (flag) => args.includes(flag);

  // Named apps (first positional arg that isn't a flag or URL)
  const appNamesArg = args.find(a => !a.startsWith("--") && !a.startsWith("http"));
  const saveScreenshots = !hasFlag("--no-screenshots");
  const headless = hasFlag("--headless") || hasFlag("--ci");
  const viewports = (getArg("--viewports") || getFlagValue("--viewports") || "desktop").split(",").map(v => v.trim()).filter(Boolean);
  const environment = getArg("--env") || getFlagValue("--env") || "production";
  const buildSha = getArg("--build-sha") || getFlagValue("--build-sha") || (process.env.GITHUB_SHA ?? null);
  const failOnErrors = hasFlag("--fail-on-errors") || hasFlag("--fail-on-error");
  const jsonOutput = hasFlag("--json") || hasFlag("--json-output");
  const perfBudgetRaw = getArg("--perf-budget") || getFlagValue("--perf-budget");
  const perfBudgetMs = perfBudgetRaw ? parseInt(perfBudgetRaw) : null;

  // ── Direct URL mode ────────────────────────────────────────────────────────
  if (directUrl) {
    const loginUrl = getArg("--login-url");
    const username = getArg("--username");
    const appName = getArg("--name") || directUrl;
    const pages = (getArg("--pages") || "").split(",").map(p => p.trim()).filter(Boolean);
    let password = null;
    if (username && !headless) password = await rlPassword(`  Password for ${username}: `);
    await inspectApp(directUrl, {
      token: cfg.token, loginUrl, username, password, pages, appName,
      saveScreenshots, headless, viewports,
      environment, buildSha, failOnErrors, jsonOutput, perfBudgetMs,
    });
    return;
  }

  // ── Named app(s) or interactive menu ──────────────────────────────────────
  println("  Fetching your saved apps...", "dim");
  const allApps = await fetchSavedApps(cfg.token);

  if (allApps.length === 0) {
    println("\n  No apps saved yet. Add them at:\n  https://13moonforge.ai/app-inspector\n", "yellow");
    println("  Or run directly: node forge.js inspect https://myapp.com\n", "dim");
    return;
  }

  let appsToInspect = [];

  if (appNamesArg) {
    // Match by names from command line arg: "My App, Blog, Store"
    const names = appNamesArg.split(",").map(n => n.trim().toLowerCase()).filter(Boolean);
    appsToInspect = allApps.filter(app =>
      names.some(n => app.name.toLowerCase().includes(n) || app.url.toLowerCase().includes(n))
    );
    if (appsToInspect.length === 0) {
      println(`\n  No apps matched "${appNamesArg}". Your saved apps:`, "yellow");
      allApps.forEach(a => println(`    • ${a.name}`, "dim"));
      println("", "");
      appsToInspect = await pickAppsFromMenu(allApps);
    }
  } else {
    appsToInspect = await pickAppsFromMenu(allApps);
  }

  if (appsToInspect.length === 0) {
    println("  No apps selected.\n", "yellow");
    return;
  }

  println(`\n  Inspecting ${appsToInspect.length} app${appsToInspect.length !== 1 ? "s" : ""} in sequence...\n`, "bold");

  // ── Inspect each app ──────────────────────────────────────────────────────
  for (let i = 0; i < appsToInspect.length; i++) {
    const app = appsToInspect[i];
    if (appsToInspect.length > 1) {
      println(`\n  [${ i + 1}/${appsToInspect.length}] ${app.name}`, "bold");
      println("  ─────────────────────────────────────────", "dim");
    }

    // Get password for this app if it has a login
    let password = null;
    if (app.loginMethod === "form" && app.username) {
      password = await rlPassword(`  Password for ${app.username} @ ${app.name}: `);
    }

    // Fetch baselines for this app (for visual regression)
    let appBaselines = [];
    try {
      const blResult = await forgeGet(`/api/inspector/baselines-for-compare?appId=${encodeURIComponent(app.id)}`, cfg.token);
      if (blResult.status === 200 && Array.isArray(blResult.data?.baselines)) appBaselines = blResult.data.baselines;
    } catch { /* no baselines */ }

    const appViewports = Array.isArray(app.viewports) && app.viewports.length > 0 ? app.viewports : ["desktop"];
    const appAssertions = Array.isArray(app.customAssertions) ? app.customAssertions : [];

    await inspectApp(app.url, {
      token: cfg.token,
      loginUrl: app.loginUrl,
      username: app.username,
      password,
      pages: app.pages ?? [],
      appName: app.name,
      appId: app.id,
      saveScreenshots,
      headless,
      viewports: appViewports,
      customAssertions: appAssertions,
      baselines: appBaselines,
      environment,
      buildSha,
      failOnErrors,
      jsonOutput,
      perfBudgetMs,
    });

    if (i < appsToInspect.length - 1) {
      println("\n  Pausing 3 seconds before next app...", "dim");
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (appsToInspect.length > 1) {
    println(`\n  ✓ All ${appsToInspect.length} apps inspected. Reports available at:\n  https://13moonforge.ai/app-inspector\n`, "green");
  }
}

// ── Interactive inspect trigger ────────────────────────────────────────────────
async function handleInspectIntent(input, cfg) {
  // User typed something like "inspect https://myapp.com"
  const urlMatch = input.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) {
    println("  Tell me the full URL to inspect (e.g. https://myapp.com)", "yellow");
    const url = await rl("  App URL: ");
    if (!url) return;
    return handleInspectIntent(`inspect ${url}`, cfg);
  }

  const appUrl = urlMatch[0];
  println(`\n  Forge Inspector — ${appUrl}\n`, "magenta");

  const username = await rl("  Login email/username (leave empty to skip login): ");
  let password = null;
  if (username) password = await rlPassword("  Password: ");

  const pagesInput = await rl("  Pages to check (e.g. /dashboard,/settings — or press Enter to auto-discover): ");
  const pages = pagesInput.split(",").map(p => p.trim()).filter(Boolean);

  await inspectApp(appUrl, {
    token: cfg.token,
    username: username || undefined,
    password: password || undefined,
    pages,
    appName: appUrl,
    saveScreenshots: true,
  });
}

// ── Generate GitHub Actions workflow file ─────────────────────────────────────
async function runGenerateWorkflow(args) {
  const appNameArg = args[0] || "";
  const outFile = ".github/workflows/forge-inspector.yml";
  const yaml = `# Forge Inspector — Auto-generated by Forge Agent v${VERSION}
# Runs on every push to main and weekly. Fails if any errors are found.
# Setup: add FORGE_TOKEN to your repository secrets.
# Get your token at: https://13moonforge.ai/get-forge

name: Forge Inspector

on:
  push:
    branches: [main, master]
  schedule:
    - cron: "0 9 * * 1"  # Every Monday 9 AM UTC
  workflow_dispatch:

jobs:
  inspect:
    name: Forge App Inspection
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Download Forge CLI
        run: curl -fsSL -o forge.js https://13moonforge.ai/api/help/forge-agent.js

      - name: Install Playwright system deps
        run: |
          mkdir -p ~/.forge-playwright
          cd ~/.forge-playwright
          npm init -y
          npm install playwright
          PLAYWRIGHT_BROWSERS_PATH=~/.forge-playwright/browsers npx playwright install-deps chromium
          PLAYWRIGHT_BROWSERS_PATH=~/.forge-playwright/browsers npx playwright install chromium

      - name: Configure token
        run: |
          echo '{"token":"'\${{ secrets.FORGE_TOKEN }}'"}' > ~/.forge-agent.json

      - name: Run inspection
        env:
          GITHUB_SHA: \${{ github.sha }}
        run: |
          node forge.js inspect ${appNameArg ? `"${appNameArg}"` : "all"} --headless --no-screenshots --fail-on-errors --env production --build-sha=\${{ github.sha }}

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: forge-inspection-\${{ github.run_number }}
          path: ~/forge-inspection/
          retention-days: 30
`;

  fs.mkdirSync(".github/workflows", { recursive: true });
  fs.writeFileSync(outFile, yaml);

  println("\n  ✓ GitHub Actions workflow generated!", "green");
  println(`  File: ${outFile}`, "dim");
  println("\n  Next steps:", "bold");
  println("  1. Add FORGE_TOKEN to your GitHub repo secrets:", "dim");
  println("     Settings → Secrets → Actions → New repository secret", "dim");
  println("  2. Get your token at: https://13moonforge.ai/get-forge", "dim");
  println("  3. Commit and push the workflow file:", "dim");
  println(`     git add ${outFile} && git commit -m "Add Forge Inspector workflow" && git push`, "dim");
  println("\n  The workflow will run on every push to main and fail the build if issues are found.\n", "dim");
}

// ── Approve visual baselines — send current screenshots as new baselines ───────
async function runApproveMode(args, cfg) {
  println("\n  👁  Forge Baseline Approval\n", "magenta");

  const appName = args[0] || null;
  println(`  Fetching last inspection${appName ? ` for "${appName}"` : ""}...`, "dim");

  const qs = appName ? `?appName=${encodeURIComponent(appName)}` : "";
  const r = await forgeGet(`/api/inspector/cli-recheck-data${qs}`, cfg.token).catch(() => null);
  if (!r || r.status !== 200 || !r.data?.found) {
    println("  No recent inspection found. Run an inspection first.\n", "yellow");
    return;
  }

  const { appName: name, appId } = r.data;
  if (!appId) { println("  Cannot approve: app not found in your saved apps.\n", "yellow"); return; }

  // Fetch last report screenshots from API
  const rr = await forgeGet(`/api/inspector/cli-reports?appId=${encodeURIComponent(appId)}`, cfg.token).catch(() => null);
  if (!rr || rr.status !== 200 || !rr.data?.reports?.length) {
    println("  No reports found for this app.\n", "yellow"); return;
  }

  const latestReport = rr.data.reports[0];
  const screenshots = latestReport.screenshots ?? [];
  if (screenshots.length === 0) {
    println("  No screenshots in last report to approve.\n", "yellow"); return;
  }

  println(`  Approving ${screenshots.length} screenshot${screenshots.length !== 1 ? "s" : ""} as visual baselines for ${name}...`, "dim");

  let approved = 0;
  for (const ss of screenshots) {
    if (!ss.data) continue;
    try {
      const result = await forgePost("/api/inspector/baselines", {
        appId, page: ss.page, viewport: ss.viewport ?? "desktop", screenshotData: ss.data,
      }, cfg.token);
      if (result.status === 200) {
        approved++;
        println(`  ✓ Baseline approved: ${ss.page} (${ss.viewport ?? "desktop"})`, "green");
      }
    } catch { /* skip */ }
  }

  println(`\n  ✓ ${approved} baseline${approved !== 1 ? "s" : ""} saved. Future inspections will compare against these.\n`, "green");
}

// ── Monitor daemon — check schedules and run inspections on a cron ─────────────
async function runMonitorMode(args, cfg) {
  const intervalOverride = parseInt(args.find(a => !a.startsWith("--")) ?? "") || null;

  println("\n  🕐 Forge Monitor — continuous inspection daemon\n", "magenta");
  println("  Checking your scheduled apps...", "dim");
  println("  Press Ctrl+C to stop.\n", "dim");

  let iteration = 0;
  while (true) {
    iteration++;
    try {
      const r = await forgeGet("/api/inspector/cli-schedules", cfg.token);
      if (r.status !== 200) { await new Promise(res => setTimeout(res, 30000)); continue; }

      const { due } = r.data;
      if (due.length === 0) {
        if (iteration === 1) println("  No scheduled inspections due yet.", "dim");
      } else {
        println(`\n  ${due.length} inspection${due.length !== 1 ? "s" : ""} due:`, "bold");
        for (const { app, id: scheduleId, intervalMinutes } of due) {
          if (!app) continue;
          println(`\n  Running scheduled inspection of ${app.name}...`, "dim");
          try {
            const baselines = await forgeGet(`/api/inspector/baselines-for-compare?appId=${encodeURIComponent(app.id)}`, cfg.token)
              .then(b => b.data?.baselines ?? []).catch(() => []);
            await inspectApp(app.url, {
              token: cfg.token, loginUrl: app.loginUrl, username: app.username,
              pages: app.pages ?? [], appName: app.name, appId: app.id,
              saveScreenshots: false, headless: true,
              viewports: app.viewports ?? ["desktop"],
              customAssertions: app.customAssertions ?? [],
              baselines,
            });
            await forgePost("/api/inspector/cli-schedule-done", { scheduleId, hadErrors: false }, cfg.token).catch(() => {});
          } catch (e) {
            println(`  ✗ Scheduled inspection failed: ${e.message}`, "red");
            await forgePost("/api/inspector/cli-schedule-done", { scheduleId, hadErrors: true }, cfg.token).catch(() => {});
          }
        }
      }
    } catch (e) {
      println(`  Monitor error: ${e.message}`, "dim");
    }

    // Sleep until next check (default: 1 minute between polls)
    const sleepMs = (intervalOverride ?? 1) * 60 * 1000;
    await new Promise(res => setTimeout(res, sleepMs));
  }
}

// ── Status — show health summary of all saved apps ────────────────────────────
async function runStatusMode(cfg) {
  println("\n  📊  Forge Status — App Health Overview\n", "magenta");
  println("  Fetching dashboard...", "dim");

  try {
    const r = await forgeGet("/api/inspector/dashboard", cfg.token);
    if (r.status !== 200 || !r.data?.appsHealth) {
      println("  No apps found. Add apps at https://13moonforge.ai/app-inspector\n", "yellow");
      return;
    }

    const { appsHealth, totalOpenIssues, appsAtRisk, reportsThisWeek } = r.data;

    if (appsHealth.length === 0) {
      println("  No apps saved yet. Add apps at https://13moonforge.ai/app-inspector\n", "yellow");
      return;
    }

    println(`  ${"APP".padEnd(28)} ${"HEALTH".padStart(7)} ${"ERRORS".padStart(7)} ${"WARNS".padStart(6)} ${"LAST INSPECTED".padStart(18)}`, "dim");
    println("  " + "─".repeat(70), "dim");

    for (const app of appsHealth) {
      const score = app.healthScore;
      const scoreStr = score === null ? "  n/a" : String(score).padStart(5) + "%";
      const scoreColor = score === null ? "dim" : score >= 90 ? "green" : score >= 60 ? "yellow" : "red";
      const errors = app.lastErrors !== null ? String(app.lastErrors).padStart(7) : "      -";
      const warns = app.lastWarns !== null ? String(app.lastWarns).padStart(6) : "     -";
      const lastRun = app.lastInspectedAt
        ? new Date(app.lastInspectedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).padStart(18)
        : "         Not yet run";
      print(`  ${app.name.slice(0, 27).padEnd(27)} `, "reset");
      print(scoreStr.padStart(7), scoreColor);
      print(errors, app.lastErrors > 0 ? "red" : "reset");
      print(warns, app.lastWarns > 0 ? "yellow" : "reset");
      println(lastRun, "dim");
    }

    println("\n  " + "─".repeat(70), "dim");
    println(`\n  Apps: ${appsHealth.length} | Open issues: ${totalOpenIssues} | At risk: ${appsAtRisk} | Reports this week: ${reportsThisWeek}`, "dim");
    println("\n  View full dashboard: https://13moonforge.ai/app-inspector\n", "dim");
  } catch (e) {
    println(`  Could not fetch status: ${e.message}\n`, "red");
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const cliArgs = process.argv.slice(2);

  // ── generate-workflow: output GitHub Actions YAML ─────────────────────────
  if (cliArgs[0] === "generate-workflow") {
    await runGenerateWorkflow(cliArgs.slice(1));
    return;
  }

  // ── Commands that need a token ─────────────────────────────────────────────
  const needsTokenCmds = ["inspect", "recheck", "approve", "monitor", "status"];
  if (needsTokenCmds.includes(cliArgs[0])) {
    const cmd = cliArgs[0];

    print("\n  ╔══════════════════════════════════════╗\n", "magenta");
    if (cmd === "recheck") print("  ║   🔁  Forge Recheck  v" + VERSION + "           ║\n", "magenta");
    else if (cmd === "approve") print("  ║   👁  Forge Approve  v" + VERSION + "           ║\n", "magenta");
    else if (cmd === "monitor") print("  ║   🕐  Forge Monitor  v" + VERSION + "           ║\n", "magenta");
    else if (cmd === "status") print("  ║   📊  Forge Status   v" + VERSION + "           ║\n", "magenta");
    else print("  ║   🔍  Forge Inspector  v" + VERSION + "         ║\n", "magenta");
    print("  ║   13moonforge.ai                     ║\n", "magenta");
    print("  ╚══════════════════════════════════════╝\n\n", "magenta");

    let cfg = loadConfig();
    if (!cfg.token) {
      print("  You need a CLI token to connect to The Forge.\n", "dim");
      print("  Get one at: https://13moonforge.ai/get-forge\n\n", "dim");
      const token = await rl("  Paste your CLI token: ");
      if (!token) { print("No token — exiting.\n", "red"); process.exit(1); }
      cfg.token = token;
      saveConfig(cfg);
      print("  ✓ Token saved\n\n", "green");
    }

    if (cmd === "recheck") await runRecheckMode(cliArgs.slice(1), cfg);
    else if (cmd === "approve") await runApproveMode(cliArgs.slice(1), cfg);
    else if (cmd === "monitor") await runMonitorMode(cliArgs.slice(1), cfg);
    else if (cmd === "status") await runStatusMode(cfg);
    else await runInspectMode(cliArgs.slice(1), cfg);
    return;
  }

  print("\n  ╔══════════════════════════════════════╗\n", "green");
  print("  ║   🔥  Forge Agent  v" + VERSION + "            ║\n", "green");
  print("  ║   13moonforge.ai                     ║\n", "green");
  print("  ╚══════════════════════════════════════╝\n\n", "green");

  let cfg = loadConfig();

  if (!cfg.token) {
    print("  You need a CLI token to connect to The Forge.\n", "dim");
    print("  Get one at: https://13moonforge.ai/get-forge\n\n", "dim");
    const token = await rl("  Paste your CLI token: ");
    if (!token) { print("No token — exiting.\n", "red"); process.exit(1); }
    cfg.token = token;
    saveConfig(cfg);
    print("  ✓ Token saved to ~/.forge-agent.json\n\n", "green");
  }

  print("  Connected to 13 Moon Forge\n", "dim");
  print("  Forge is ready. Type what you need, or 'quit' to exit.\n", "dim");
  print("  Tip: say 'inspect https://myapp.com' to run a full browser inspection.\n\n", "dim");

  const history = [];

  while (true) {
    const input = await rl("\x1b[36mYou: \x1b[0m");
    if (!input) continue;
    if (["quit", "exit", "bye", "q"].includes(input.toLowerCase())) {
      print("\n  Forge out. Your server is ready when you are.\n\n", "green");
      break;
    }

    // Inspect intent
    if (input.toLowerCase().startsWith("inspect")) {
      await handleInspectIntent(input, cfg);
      continue;
    }

    // GitHub token
    if (input.toLowerCase().includes("github token") || input.startsWith("ghp_") || input.startsWith("github_pat_")) {
      const tok = input.replace(/^github token[:\s]*/i, "").trim();
      if (tok.startsWith("ghp_") || tok.startsWith("github_pat_")) {
        cfg.githubToken = tok;
        saveConfig(cfg);
        const username = await getGithubUser(tok);
        print(`\nForge: `, "yellow");
        print(`GitHub token saved${username ? ` — logged in as ${username}` : ""}.\n\n`, "reset");
        history.push({ role: "user", content: input });
        history.push({ role: "assistant", content: `GitHub token saved${username ? ` — logged in as ${username}` : ""}.` });
        continue;
      }
    }

    let contextNote = "";
    const pathMatch = input.match(/(?:at|in|from|folder|directory)[:\s]+([~/\\.][^\s,]+)/i);
    if (pathMatch) {
      const dir = pathMatch[1].replace("~", os.homedir());
      if (fs.existsSync(dir)) {
        const info = detectProject(dir);
        contextNote = `\n[CONTEXT: Project at ${dir} — Type: ${info.type}, Name: ${info.name}, Git: ${info.hasGit ? info.gitUrl || "initialized" : "not initialized"}, Env vars: ${info.envVars.length > 0 ? info.envVars.join(", ") : "none found"}]`;
      }
    }

    history.push({ role: "user", content: input + contextNote });

    try {
      const reply = await forgeChat(history.slice(-12), cfg.token);
      history.push({ role: "assistant", content: reply });

      if (reply.toLowerCase().includes("github.com") && cfg.githubToken && reply.toLowerCase().includes("create")) {
        const nameMatch = reply.match(/repo[:\s]+([a-z0-9_-]+)/i) || reply.match(/called[:\s]+([a-z0-9_-]+)/i);
        if (nameMatch) {
          const yn = await rl(`\n  Should I create the GitHub repo "${nameMatch[1]}" now? (yes/no): `);
          if (yn.toLowerCase().startsWith("y")) {
            print(`\n  Creating repo ${nameMatch[1]}...\n`, "dim");
            const r = await createGithubRepo(nameMatch[1], cfg.githubToken);
            if (r.ok) {
              print(`  ✓ Created: ${r.htmlUrl}\n`, "green");
              history.push({ role: "user", content: `The repo was created: ${r.htmlUrl}` });
            } else {
              print(`  ✗ Failed: ${r.error}\n`, "red");
            }
          }
        }
      }
      print("\n", "");
    } catch (e) {
      if (e.message === "AUTH_FAILED") {
        print("\nForge: ", "red");
        print("Your CLI token is invalid. Get a new one at https://13moonforge.ai/get-forge\n\n", "reset");
        delete cfg.token;
        saveConfig(cfg);
        process.exit(1);
      } else {
        print(`\nForge: Connection error — ${e.message}\n\n`, "red");
      }
    }
  }
}

main().catch(err => {
  print(`\nFatal error: ${err.message}\n`, "red");
  process.exit(1);
});
