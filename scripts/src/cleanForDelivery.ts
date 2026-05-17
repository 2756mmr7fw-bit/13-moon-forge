#!/usr/bin/env tsx
/**
 * Clean a project directory for client delivery.
 *
 * Strips Replit-specific files, monorepo references, and dev URLs, then
 * produces a zip suitable for sending to a client alongside their GitHub repo.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run clean-for-delivery -- \
 *     --src ./path/to/source \
 *     --out ./deliveries/client-site.zip \
 *     --client "Acme Co" \
 *     --domain acmeco.com
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

interface Args {
  src: string;
  out: string;
  client: string;
  domain?: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const src = get("--src");
  const out = get("--out");
  const client = get("--client");
  const domain = get("--domain");
  if (!src || !out || !client) {
    console.error("Usage: clean-for-delivery --src <dir> --out <zip> --client <name> [--domain <site>]");
    process.exit(1);
  }
  return { src, out, client, domain };
}

const STRIP_PATHS = [
  ".replit",
  "replit.nix",
  "replit.md",
  ".replit-artifact",
  ".upm",
  ".cache",
  ".local",
  ".agents",
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".pnpm-store",
];

const REPLIT_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /[a-z0-9-]+\.janeway\.replit\.dev/gi, reason: "replit dev domain" },
  { pattern: /[a-z0-9-]+\.replit\.dev/gi, reason: "replit dev domain" },
  { pattern: /[a-z0-9-]+\.replit\.app/gi, reason: "replit app domain" },
  { pattern: /\bREPLIT_[A-Z_]+\b/g, reason: "replit env var" },
  { pattern: /@vitejs\/plugin-replit[a-z-]*/gi, reason: "replit vite plugin" },
  { pattern: /@workspace\/[a-z0-9-]+/gi, reason: "workspace monorepo import" },
];

function copyClean(src: string, dest: string): { copied: number; skipped: number } {
  let copied = 0, skipped = 0;
  function walk(s: string, d: string) {
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      const base = path.basename(s);
      if (STRIP_PATHS.includes(base)) { skipped++; return; }
      fs.mkdirSync(d, { recursive: true });
      for (const entry of fs.readdirSync(s)) walk(path.join(s, entry), path.join(d, entry));
    } else {
      const base = path.basename(s);
      if (STRIP_PATHS.includes(base)) { skipped++; return; }
      fs.copyFileSync(s, d);
      copied++;
    }
  }
  walk(src, dest);
  return { copied, skipped };
}

function scanAndReplace(dir: string, domain?: string): { hits: number; files: string[] } {
  let hits = 0;
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const ext = path.extname(entry.name).toLowerCase();
      if (![".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".html", ".css", ".env", ".toml", ".yml", ".yaml", ".sh"].includes(ext)) continue;
      let content = fs.readFileSync(full, "utf8");
      let touched = false;
      for (const { pattern } of REPLIT_PATTERNS) {
        if (pattern.test(content)) {
          content = content.replace(pattern, (m) => {
            hits++;
            if (domain && /replit\.(dev|app)|janeway/i.test(m)) return domain;
            return `/* CLEANED: ${m} */`;
          });
          touched = true;
        }
      }
      if (touched) { fs.writeFileSync(full, content); files.push(full); }
    }
  }
  walk(dir);
  return { hits, files };
}

function writeReadme(dir: string, client: string, domain?: string) {
  const md = `# ${client} — Website Code

This is the source code for your website, delivered by **13 Moon Forge**.

## Ownership

- **You own this code.** All of it. No license restrictions back to me.
- **You own your domain.** It's registered in your name.
- **You can take this anywhere.** Any hosting provider can run it.

## What's in this archive

- The full source code of your site
- This README
- A package.json with the dependencies you'll need

## How to host this yourself (if you ever leave my hosting)

1. **Install Node.js** (version 20 or later) from nodejs.org
2. **Install dependencies**:
   \`\`\`
   npm install
   \`\`\`
3. **Build the site**:
   \`\`\`
   npm run build
   \`\`\`
4. **Deploy**: The \`dist\` folder contains the production-ready site. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, a regular web server, etc.).

## Your live site

${domain ? `Currently hosted at: **https://${domain}**` : "Hosting URL will be provided separately."}

## Need help?

Email: ezekiel@thepeoplestownsq.com  
Site: https://13moonforge.ai

---
Delivered ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.
`;
  fs.writeFileSync(path.join(dir, "README.md"), md);
}

function zipDir(src: string, out: string) {
  const outAbs = path.resolve(out);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  const cwd = path.dirname(src);
  const base = path.basename(src);
  const result = spawnSync("zip", ["-r", outAbs, base], { cwd, stdio: "pipe" });
  if (result.error || result.status !== 0) {
    console.error("zip command failed. Is `zip` installed on your system?");
    if (result.stderr) console.error(result.stderr.toString());
    throw result.error ?? new Error(`zip exited with code ${result.status}`);
  }
}

function main() {
  const { src, out, client, domain } = parseArgs();
  const srcAbs = path.resolve(src);
  const workspaceRoot = path.resolve(process.cwd());
  if (!srcAbs.startsWith(workspaceRoot + path.sep) && srcAbs !== workspaceRoot) {
    console.error(`Refusing to operate outside the workspace root.\n  src: ${srcAbs}\n  workspace: ${workspaceRoot}`);
    process.exit(1);
  }
  if (!fs.existsSync(srcAbs)) {
    console.error(`Source directory not found: ${srcAbs}`);
    process.exit(1);
  }

  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "forge-deliver-"));
  const clientSlug = client.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";
  const stagingDir = path.join(stagingRoot, clientSlug);
  fs.mkdirSync(stagingDir, { recursive: true });

  console.log(`[1/4] Copying ${srcAbs} → staging…`);
  const { copied, skipped } = copyClean(srcAbs, stagingDir);
  console.log(`      ${copied} files copied, ${skipped} replit-related entries stripped`);

  console.log(`[2/4] Scrubbing replit/monorepo references…`);
  const { hits, files } = scanAndReplace(stagingDir, domain);
  console.log(`      ${hits} replacements across ${files.length} files`);

  console.log(`[3/4] Writing client README…`);
  writeReadme(stagingDir, client, domain);

  console.log(`[4/4] Zipping → ${out}`);
  zipDir(stagingDir, out);
  fs.rmSync(stagingRoot, { recursive: true, force: true });

  console.log(`\nDone. Clean archive at: ${path.resolve(out)}`);
}

main();
