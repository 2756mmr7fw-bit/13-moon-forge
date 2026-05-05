import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import * as cheerio from "cheerio";

const router = Router();

// ── Cookie jar helper ─────────────────────────────────────────────────────────

function parseCookies(headers: Headers): Record<string, string> {
  const cookies: Record<string, string> = {};
  const raw = headers.getSetCookie?.() ?? [];
  for (const cookie of raw) {
    const [pair] = cookie.split(";");
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    cookies[name] = value;
  }
  return cookies;
}

function cookieHeader(jar: Record<string, string>): string {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

function mergeCookies(jar: Record<string, string>, fresh: Record<string, string>) {
  return { ...jar, ...fresh };
}

// ── SSE writer ────────────────────────────────────────────────────────────────

type Finding = {
  type: "info" | "warn" | "error" | "ok" | "step";
  page?: string;
  message: string;
  detail?: string;
};

function emit(res: ReturnType<typeof router.post extends (...args: infer A) => infer R ? never : never>, finding: Finding) {
  // We'll use the raw response object
}

// ── HTTP fetch with timeout ───────────────────────────────────────────────────

async function safeFetch(url: string, opts: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── HTML analysis ─────────────────────────────────────────────────────────────

interface PageAnalysis {
  statusCode: number;
  title: string;
  h1s: string[];
  links: string[];
  images: string[];
  forms: string[];
  errorIndicators: string[];
  visibleText: string;
}

function analyzeHtml(html: string, baseUrl: string): PageAnalysis {
  const $ = cheerio.load(html);

  // Remove scripts and styles for text extraction
  $("script, style, noscript").remove();

  const title = $("title").first().text().trim();
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
      links.push(href.startsWith("http") ? href : new URL(href, baseUrl).href);
    }
  });

  const images: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    const alt = $(el).attr("alt") ?? "(no alt)";
    images.push(`${src} [alt: ${alt}]`);
  });

  const forms: string[] = [];
  $("form").each((_, el) => {
    const action = $(el).attr("action") ?? "(no action)";
    const method = $(el).attr("method") ?? "GET";
    const inputs = $(el).find("input[name]").map((__, inp) => $(inp).attr("name")).get();
    forms.push(`${method.toUpperCase()} ${action} — fields: ${inputs.join(", ")}`);
  });

  // Detect common error indicators
  const bodyText = $("body").text();
  const errorIndicators: string[] = [];
  const errorPatterns = [
    /error/i, /exception/i, /not found/i, /500/i, /403/i, /401/i,
    /something went wrong/i, /undefined/i, /null/i, /traceback/i,
    /cannot read/i, /is not defined/i, /failed to fetch/i, /econnrefused/i,
    /missing.*env/i, /invalid.*token/i, /unauthorized/i,
  ];
  for (const pat of errorPatterns) {
    const match = bodyText.match(pat);
    if (match) {
      const idx = bodyText.toLowerCase().indexOf(match[0].toLowerCase());
      const snippet = bodyText.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, " ").trim();
      errorIndicators.push(snippet);
    }
  }

  // Extract visible text (trim to 2000 chars for GPT context)
  const visibleText = bodyText.replace(/\s+/g, " ").trim().slice(0, 2000);

  return {
    statusCode: 200, title, h1s,
    links: [...new Set(links)].slice(0, 30),
    images,
    forms,
    errorIndicators: [...new Set(errorIndicators)].slice(0, 10),
    visibleText,
  };
}

// ── GPT-4o page review ────────────────────────────────────────────────────────

async function reviewPage(
  url: string,
  analysis: PageAnalysis,
  appDescription: string,
): Promise<string> {
  const prompt = `You are Forge, an experienced QA engineer reviewing a live web app.

App description: ${appDescription}
Page URL: ${url}
HTTP status: ${analysis.statusCode}
Page title: "${analysis.title}"
H1 headings: ${analysis.h1s.join(" | ") || "(none)"}
Forms found: ${analysis.forms.join("\n") || "(none)"}
Images: ${analysis.images.length} image tags
Unique links: ${analysis.links.length}
Error indicators detected: ${analysis.errorIndicators.length > 0 ? analysis.errorIndicators.join(" | ") : "none"}

Page text sample:
${analysis.visibleText}

Give a SHORT, direct QA report for this page. Flag:
- Anything that looks broken, empty, or wrong
- Error messages in the page content
- Missing expected content for this type of app
- Suspicious patterns (empty h1, no content, error text)
- Things that look correct and working

Be specific and use plain language. 3-6 bullet points max. Start with the most important issue first.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 400,
    temperature: 0.3,
  });

  return res.choices[0]?.message?.content ?? "No analysis available.";
}

// ── POST /api/agent/inspect ───────────────────────────────────────────────────

router.post("/api/agent/inspect", async (req, res) => {
  const {
    appUrl,
    loginUrl,
    username,
    password,
    usernameField = "username",
    passwordField = "password",
    loginMethod = "form",
    pagePaths = [],
    appDescription = "a web application",
  } = req.body as {
    appUrl: string;
    loginUrl?: string;
    username?: string;
    password?: string;
    usernameField?: string;
    passwordField?: string;
    loginMethod?: "form" | "none";
    pagePaths?: string[];
    appDescription?: string;
  };

  if (!appUrl?.startsWith("http")) {
    res.status(400).json({ error: "appUrl must start with http:// or https://" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const write = (finding: Finding) => {
    res.write(`data: ${JSON.stringify(finding)}\n\n`);
  };

  let cookieJar: Record<string, string> = {};

  try {
    write({ type: "step", message: `🔍 Starting inspection of ${appUrl}` });

    // ── Step 1: Check app is reachable ────────────────────────────────────────
    write({ type: "step", message: "Checking app is reachable..." });
    let homeRes: Response;
    try {
      homeRes = await safeFetch(appUrl, { redirect: "follow" });
      cookieJar = mergeCookies(cookieJar, parseCookies(homeRes.headers));
      write({ type: "ok", page: "/", message: `App responded — HTTP ${homeRes.status}` });
    } catch (e) {
      write({ type: "error", message: `App is not reachable: ${(e as Error).message}` });
      write({ type: "info", message: "Inspection stopped — can't reach the app." });
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // ── Step 2: Log in ─────────────────────────────────────────────────────────
    if (loginMethod === "form" && username && password) {
      write({ type: "step", message: `Logging in as "${username}"...` });
      const targetLoginUrl = loginUrl ?? `${appUrl}/login`;

      try {
        // Get login page to find CSRF tokens
        const loginPageRes = await safeFetch(targetLoginUrl, {
          headers: { Cookie: cookieHeader(cookieJar) },
          redirect: "follow",
        });
        cookieJar = mergeCookies(cookieJar, parseCookies(loginPageRes.headers));

        const loginHtml = await loginPageRes.text();
        const $login = cheerio.load(loginHtml);

        // Look for CSRF token
        const csrfField = $login('input[name*="csrf"], input[name*="_token"], input[name*="authenticity"]').first();
        const csrfName = csrfField.attr("name");
        const csrfValue = csrfField.attr("value");

        // Build form body
        const formData = new URLSearchParams();
        formData.set(usernameField, username);
        formData.set(passwordField, password);
        if (csrfName && csrfValue) {
          formData.set(csrfName, csrfValue);
          write({ type: "info", message: `Found CSRF token field: ${csrfName}` });
        }

        // Find form action
        const formAction = $login("form").first().attr("action");
        const submitUrl = formAction
          ? (formAction.startsWith("http") ? formAction : new URL(formAction, targetLoginUrl).href)
          : targetLoginUrl;

        const submitRes = await safeFetch(submitUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: cookieHeader(cookieJar),
            Referer: targetLoginUrl,
          },
          body: formData.toString(),
          redirect: "manual",
        });

        cookieJar = mergeCookies(cookieJar, parseCookies(submitRes.headers));

        if (submitRes.status >= 300 && submitRes.status < 400) {
          const location = submitRes.headers.get("location") ?? "";
          write({ type: "ok", message: `Login redirected to: ${location}` });

          // Follow redirect
          const afterLogin = await safeFetch(
            location.startsWith("http") ? location : new URL(location, appUrl).href,
            { headers: { Cookie: cookieHeader(cookieJar) }, redirect: "follow" }
          );
          cookieJar = mergeCookies(cookieJar, parseCookies(afterLogin.headers));

          const afterHtml = await afterLogin.text();
          const $after = cheerio.load(afterHtml);
          const afterTitle = $after("title").text().trim();

          if (afterTitle.toLowerCase().includes("login") || afterTitle.toLowerCase().includes("sign in")) {
            write({ type: "warn", message: `Still on login page after submit — credentials may be wrong or login flow is non-standard`, detail: `Page title: "${afterTitle}"` });
          } else {
            write({ type: "ok", message: `Logged in successfully — landed on "${afterTitle}"` });
          }
        } else if (submitRes.status === 200) {
          const body = await submitRes.text();
          const $r = cheerio.load(body);
          const t = $r("title").text();
          if (body.toLowerCase().includes("invalid") || body.toLowerCase().includes("incorrect") || body.toLowerCase().includes("error")) {
            write({ type: "warn", message: "Login response looks like an error — check credentials", detail: t });
          } else {
            write({ type: "ok", message: `Login submitted — status 200, page: "${t}"` });
          }
        } else {
          write({ type: "warn", message: `Unexpected login response: HTTP ${submitRes.status}` });
        }

      } catch (e) {
        write({ type: "warn", message: `Login attempt failed: ${(e as Error).message}` });
        write({ type: "info", message: "Continuing inspection without authentication..." });
      }
    } else if (loginMethod === "none") {
      write({ type: "info", message: "Skipping login — inspecting as unauthenticated user" });
    }

    // ── Step 3: Inspect each page ─────────────────────────────────────────────
    const allPaths = ["", ...(pagePaths as string[])].map(p => p.startsWith("/") ? p : `/${p}`);
    const visitedUrls = new Set<string>();

    for (const path of allPaths) {
      const pageUrl = `${appUrl.replace(/\/$/, "")}${path}`;
      if (visitedUrls.has(pageUrl)) continue;
      visitedUrls.add(pageUrl);

      write({ type: "step", page: path || "/", message: `Inspecting ${pageUrl}...` });

      try {
        const pageRes = await safeFetch(pageUrl, {
          headers: { Cookie: cookieHeader(cookieJar) },
          redirect: "follow",
        });
        cookieJar = mergeCookies(cookieJar, parseCookies(pageRes.headers));

        const statusCode = pageRes.status;

        if (statusCode >= 400) {
          write({ type: "error", page: path || "/", message: `HTTP ${statusCode} — page returned an error` });
          continue;
        }

        const contentType = pageRes.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
          write({ type: "info", page: path || "/", message: `Non-HTML response (${contentType}) — skipping analysis` });
          continue;
        }

        const html = await pageRes.text();
        const analysis = analyzeHtml(html, pageUrl);
        analysis.statusCode = statusCode;

        // Quick checks before GPT
        if (!analysis.title) {
          write({ type: "warn", page: path || "/", message: "Page has no <title> tag" });
        }
        if (analysis.h1s.length === 0) {
          write({ type: "warn", page: path || "/", message: "No <h1> found — page may be empty or not rendering" });
        }
        if (analysis.errorIndicators.length > 0) {
          write({ type: "warn", page: path || "/", message: `Error text detected in page content`, detail: analysis.errorIndicators[0] });
        }

        // GPT-4o review
        write({ type: "step", page: path || "/", message: "Forge is reviewing this page..." });
        const review = await reviewPage(pageUrl, analysis, appDescription);
        write({ type: "info", page: path || "/", message: review });

      } catch (e) {
        write({ type: "error", page: path || "/", message: `Failed to load page: ${(e as Error).message}` });
      }
    }

    // ── Step 4: Check common API health endpoints ──────────────────────────────
    write({ type: "step", message: "Checking common API endpoints..." });
    const healthPaths = ["/api/health", "/api/healthz", "/health", "/healthz", "/status", "/api/status"];
    for (const hp of healthPaths) {
      const hurl = `${appUrl.replace(/\/$/, "")}${hp}`;
      try {
        const r = await safeFetch(hurl, { headers: { Cookie: cookieHeader(cookieJar) } });
        if (r.status < 400) {
          const body = await r.text().catch(() => "");
          write({ type: "ok", message: `${hp} → HTTP ${r.status}`, detail: body.slice(0, 100) });
          break;
        }
      } catch { /* no health endpoint — that's fine */ }
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    write({ type: "step", message: `✅ Inspection complete — ${visitedUrls.size} page${visitedUrls.size !== 1 ? "s" : ""} checked` });

  } catch (err) {
    write({ type: "error", message: `Inspector crashed: ${(err as Error).message}` });
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
