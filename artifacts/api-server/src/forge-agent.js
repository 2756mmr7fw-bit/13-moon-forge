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
const VERSION = "1.1.0";
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

async function inspectApp(appUrl, options = {}) {
  const { token, loginUrl, username, password, pages = [], appName = appUrl, saveScreenshots = true } = options;

  // Output directory for screenshots
  const outDir = path.join(os.homedir(), "forge-inspection", new Date().toISOString().slice(0, 10));
  if (saveScreenshots) fs.mkdirSync(outDir, { recursive: true });

  const findings = [];
  const screenshots = [];

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
      headless: false, // Show the browser so user can see what's happening
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      slowMo: 200, // Slight slow-mo so it's visible
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: "ForgeInspector/1.1 (13moonforge.ai)",
    });

    // Capture console errors
    const consoleErrors = [];
    context.on("page", page => {
      page.on("console", msg => {
        if (msg.type() === "error") consoleErrors.push({ text: msg.text(), url: page.url() });
      });
      page.on("pageerror", err => {
        consoleErrors.push({ text: err.message, url: page.url() });
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

        // Check for visible error text
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

        // Check for empty main content
        const mainContent = await mainPage.$eval("main, #root, #app, [role='main'], .main-content", el => el.innerText?.trim()).catch(() => null);
        if (mainContent !== null && mainContent.length < 20) {
          finding("warn", "Main content area appears empty or not rendered", pagePath);
        }

        // Check for broken images
        const brokenImages = await mainPage.$$eval("img", imgs =>
          imgs.filter(img => !img.complete || img.naturalWidth === 0)
              .map(img => img.src || img.getAttribute("src"))
              .filter(Boolean)
              .slice(0, 5)
        ).catch(() => []);
        if (brokenImages.length > 0) {
          finding("warn", `${brokenImages.length} broken image(s)`, pagePath, brokenImages.join(", "));
        }

        // Screenshot
        if (saveScreenshots) {
          const safeName = pagePath.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30) || "page";
          const ssPath = path.join(outDir, `${String(i + 4).padStart(2, "0")}-${safeName}.png`);
          await mainPage.screenshot({ path: ssPath, fullPage: true });
          screenshots.push({ page: pagePath, label: pagePath, path: ssPath, data: fs.readFileSync(ssPath).toString("base64") });
          finding("ok", `Screenshot saved → ${ssPath}`, pagePath);
        }

      } catch (e) {
        finding("error", `Failed to load: ${e.message}`, pagePath);
      }
    }

    // ── Console errors summary ─────────────────────────────────────────────────
    if (consoleErrors.length > 0) {
      finding("warn", `${consoleErrors.length} JavaScript error(s) detected in browser console`);
      consoleErrors.slice(0, 5).forEach(e => finding("error", e.text, e.url, null));
    } else {
      finding("ok", "No JavaScript console errors detected");
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

  // ── Summary ────────────────────────────────────────────────────────────────
  const errors = findings.filter(f => f.type === "error").length;
  const warns = findings.filter(f => f.type === "warn").length;
  const oks = findings.filter(f => f.type === "ok").length;

  println("\n  ─────────────────────────────────────────", "dim");
  println("  Inspection complete", "bold");
  if (errors > 0) println(`  ✗ ${errors} error${errors !== 1 ? "s" : ""}`, "red");
  if (warns > 0) println(`  ⚠ ${warns} warning${warns !== 1 ? "s" : ""}`, "yellow");
  println(`  ✓ ${oks} passed`, "green");
  if (saveScreenshots) println(`\n  Screenshots saved to:\n  ${outDir}`, "dim");

  // ── Send report to Forge UI ────────────────────────────────────────────────
  if (token) {
    print("\n  Sending report to 13 Moon Forge...", "dim");
    try {
      const result = await forgePost("/api/agent/cli-inspect", {
        appName,
        appUrl,
        findings: findings.map(({ type, message, page, detail }) => ({ type, message, page, detail })),
        screenshots: screenshots.map(s => ({ page: s.page, label: s.label, data: s.data })),
        inspectedAt: new Date().toISOString(),
        pagesChecked: allPages.length,
        errorCount: errors,
        warnCount: warns,
      }, token);

      if (result.status === 200 || result.status === 201) {
        println("\n  ✓ Report live at: https://13moonforge.ai/app-inspector", "green");
      } else {
        println("\n  (Could not sync to Forge UI — report is saved locally)", "dim");
      }
    } catch { println("\n  (Could not reach Forge — report saved locally)", "dim"); }
  }

  println("\n", "");
}

// ── Parse inspect command line args ───────────────────────────────────────────
async function runInspectMode(args) {
  const cfg = loadConfig();

  // Ensure token
  if (!cfg.token) {
    println("  You need a CLI token to use Forge Inspector.", "dim");
    println("  Get one at: https://13moonforge.ai/get-forge\n", "dim");
    const token = await rl("  Paste your CLI token: ");
    if (!token) { println("No token — exiting.", "red"); process.exit(1); }
    cfg.token = token;
    saveConfig(cfg);
  }

  // Parse URL (first non-flag arg after "inspect")
  const appUrl = args.find(a => a.startsWith("http"));
  if (!appUrl) {
    println("  Usage: node forge.js inspect https://myapp.com [options]\n", "yellow");
    println("  Options:", "dim");
    println("    --pages /dashboard,/settings,/orders   Pages to inspect", "dim");
    println("    --login-url /login                     Login page URL", "dim");
    println("    --username me@email.com                Login username", "dim");
    println("    --name 'My App'                        App name for report", "dim");
    println("    --no-screenshots                       Skip saving screenshots\n", "dim");
    process.exit(0);
  }

  // Parse flags
  const getArg = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
  };
  const hasFlag = (flag) => args.includes(flag);

  const loginUrl = getArg("--login-url");
  const username = getArg("--username");
  const appName = getArg("--name") || appUrl;
  const pages = (getArg("--pages") || "").split(",").map(p => p.trim()).filter(Boolean);
  const saveScreenshots = !hasFlag("--no-screenshots");

  // Get password interactively if username provided
  let password = null;
  if (username) {
    password = await rlPassword(`  Password for ${username}: `);
  }

  await inspectApp(appUrl, { token: cfg.token, loginUrl, username, password, pages, appName, saveScreenshots });
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

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const cliArgs = process.argv.slice(2);

  // Inspect mode: node forge.js inspect https://myapp.com
  if (cliArgs[0] === "inspect") {
    print("\n  ╔══════════════════════════════════════╗\n", "magenta");
    print("  ║   🔍  Forge Inspector  v" + VERSION + "         ║\n", "magenta");
    print("  ║   13moonforge.ai                     ║\n", "magenta");
    print("  ╚══════════════════════════════════════╝\n\n", "magenta");
    await runInspectMode(cliArgs.slice(1));
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
