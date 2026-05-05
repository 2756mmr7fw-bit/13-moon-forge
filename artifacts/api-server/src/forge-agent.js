#!/usr/bin/env node
// ╔═══════════════════════════════════════════╗
// ║   🔥 Forge Agent — 13 Moon Forge          ║
// ║   forge.13moonforge.ai                    ║
// ╚═══════════════════════════════════════════╝
//
// Download: curl -o forge.js https://13moonforge.ai/api/help/forge-agent.js
// Run:      node forge.js
//
// Requires: Node.js 18+  (https://nodejs.org)

const https = require("https");
const http = require("http");
const readline = require("readline");
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Config ─────────────────────────────────────────────────────────────────────
const VERSION = "1.0.0";
const CONFIG_PATH = path.join(os.homedir(), ".forge-agent.json");
const FORGE_HOST = "13moonforge.ai";
const FORGE_BASE = "/api/help/cli-chat";

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

function print(text, color) {
  const C = { green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m", dim: "\x1b[2m", reset: "\x1b[0m", bold: "\x1b[1m" };
  process.stdout.write((C[color] || "") + text + C.reset);
}

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

    // Read .env
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

    // Check git
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
      hostname: "api.github.com",
      path: endpoint,
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "forge-agent/1.0",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
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
      hostname: FORGE_HOST,
      port,
      path: FORGE_BASE,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
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
            if (ev.type === "chunk" && ev.text) {
              process.stdout.write(ev.text);
              accumulated += ev.text;
            }
          } catch { /* skip */ }
        }
      });

      res.on("end", () => {
        print("\n", "");
        resolve(accumulated);
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
      const info = detectProject(dir);
      return JSON.stringify(info, null, 2);
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
      if (remoteUrl) {
        run(`git remote remove origin`, dir);
        run(`git remote add origin ${remoteUrl}`, dir);
      }
      run("git add -A", dir);
      run('git commit -m "Auto-commit from Forge Agent" --allow-empty', dir);
      const r = run("git push -u origin main 2>&1 || git push -u origin master 2>&1", dir);
      return r.ok ? "Pushed successfully." : `Push failed: ${r.out}`;
    }
    case "create_github_repo": {
      if (!cfg.githubToken) return "No GitHub token configured. Ask user to provide one.";
      const r = await createGithubRepo(args.name, cfg.githubToken, args.private !== false);
      if (r.ok) {
        saveConfig({ ...loadConfig(), lastRepoUrl: r.url });
        return `Created: ${r.htmlUrl}\nClone URL: ${r.url}`;
      }
      return `Failed: ${r.error}`;
    }
    case "read_env": {
      const dir = args.path || process.cwd();
      const envPath = path.join(dir, ".env");
      if (!fs.existsSync(envPath)) return "No .env file found in that directory.";
      const content = fs.readFileSync(envPath, "utf8");
      const keys = [];
      for (const line of content.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq > 0) keys.push(t.slice(0, eq).trim());
      }
      return `Found ${keys.length} environment variables: ${keys.join(", ")}`;
    }
    case "list_files": {
      const dir = args.path || process.cwd();
      try {
        const entries = fs.readdirSync(dir).filter(f => !f.startsWith(".") && f !== "node_modules");
        return entries.join("\n");
      } catch (e) { return `Cannot list: ${e.message}`; }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  print("\n  ╔══════════════════════════════════════╗\n", "green");
  print("  ║   🔥  Forge Agent  v" + VERSION + "            ║\n", "green");
  print("  ║   13moonforge.ai                     ║\n", "green");
  print("  ╚══════════════════════════════════════╝\n\n", "green");

  let cfg = loadConfig();

  // Auth
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
  print("  Tip: say 'check my project at /path/to/folder' to get started.\n\n", "dim");

  const history = [];

  while (true) {
    const input = await rl("\x1b[36mYou: \x1b[0m");
    if (!input) continue;
    if (["quit", "exit", "bye", "q"].includes(input.toLowerCase())) {
      print("\n  Forge out. Your server is ready when you are.\n\n", "green");
      break;
    }

    // Handle GitHub token setup inline
    if (input.toLowerCase().includes("github token") || input.toLowerCase().startsWith("ghp_") || input.toLowerCase().startsWith("github_pat_")) {
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

    // Inject project context if user mentions a path
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

      // Check if Forge mentioned creating a repo and we have a GitHub token
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
        print("Your CLI token is invalid or expired. Get a new one at https://13moonforge.ai/get-forge\n\n", "reset");
        delete cfg.token;
        saveConfig(cfg);
        process.exit(1);
      } else if (e.message === "ENDPOINT_NOT_FOUND") {
        print("\nForge: ", "red");
        print("Couldn't reach the Forge API. Check your internet connection.\n\n", "reset");
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
