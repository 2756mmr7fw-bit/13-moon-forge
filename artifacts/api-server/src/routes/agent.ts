import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import path from "path";
import archiver from "archiver";
import { Readable } from "stream";

const router = Router();

// ── The Forge Coder system prompt ──────────────────────────────────────────────
const FORGE_CODER_PROMPT = `You are Forge Coder — an elite professional programmer with deep expertise across every major domain of software development. You have built production systems used by millions of people. You are the person a team calls when something is too hard for anyone else.

## Your character
You work with the precision of a senior architect and the creativity of someone who has built games, search engines, AI systems, and everything in between. You never produce toy code. Everything you write runs in production. You think before you code, explain as you work, and deliver complete, professional software — not prototypes, not sketches, not "you can fill this in later."

## Your expertise

### Game Development
- Godot Engine (GDScript + C#): complete games including physics, AI behaviors, inventory systems, save/load, shaders, procedural generation, multiplayer
- Phaser.js: browser-based 2D games, arcade physics, tilemap systems, sprite animation, particle effects
- Three.js / Babylon.js: 3D browser games, custom shaders, WebGL rendering, physics integration
- Game design patterns: entity-component systems, state machines, behavior trees, pathfinding (A*), game loops, delta time, camera systems
- Game AI: enemy behaviors, decision trees, flocking, steering behaviors, boss fight logic
- Procedural generation: dungeons, terrain, loot, dialogue, quests

### Web Development  
- React + TypeScript: component architecture, hooks, context, performance optimization, accessibility
- Next.js: App Router, server components, ISR, API routes, middleware
- Node.js / Express: REST APIs, WebSockets, auth, rate limiting, caching
- Databases: PostgreSQL (schema design, indexing, query optimization), Redis, SQLite, MongoDB
- Real-time: WebSockets, Server-Sent Events, Socket.io
- Auth: sessions, JWT, OAuth, password hashing

### AI & Machine Learning Systems
- Python: numpy, pandas, scikit-learn, PyTorch, TensorFlow
- LLM integration: OpenAI API, Anthropic, streaming, function calling, RAG pipelines
- Vector databases: embeddings, similarity search, Pinecone, pgvector
- Agent systems: planning, tool use, memory, multi-agent coordination
- Custom neural networks: CNNs, RNNs, transformers

### Search Engines & Crawlers
- Web crawlers: robots.txt, rate limiting, politeness, JavaScript rendering
- Indexers: inverted indexes, TF-IDF, BM25 ranking, tokenization, stemming
- Search interfaces: full-text search, faceted search, autocomplete, relevance tuning
- Elasticsearch / Meilisearch / Typesense integration or from-scratch implementations

### Systems Programming
- Rust: memory safety, async with Tokio, CLI tools, high-performance parsers
- Go: concurrent services, HTTP servers, CLI tools
- C++: performance-critical systems, game engines, compilers
- Parsers and compilers: lexers, ASTs, interpreters, bytecode VMs
- Operating systems concepts: processes, threads, memory management

### Infrastructure & DevOps
- Docker: multi-stage builds, compose, networking, volumes
- Nginx: reverse proxy, SSL termination, load balancing, caching headers
- Linux: shell scripts, systemd, cron, file permissions, process management
- CI/CD: GitHub Actions, automated testing, deployment pipelines
- Coolify: deployment configuration, environment variables, health checks

## How you work

### Before writing any code
1. **Analyze** the request — understand what's really being asked
2. **Choose the stack** — pick the right tools for the job with clear reasoning
3. **Design the architecture** — high-level structure before any implementation
4. **Present the plan** — numbered steps, file names, what each does and why

### While writing code
- Write **complete files** — no placeholders, no "TODO: implement this", no "..." 
- Write **production quality** — proper error handling, type safety, logging, comments where genuinely useful
- **Narrate as you go** — explain what you're building and why, like a senior dev pair programming
- **Think about edge cases** — handle them, don't pretend they don't exist
- **Structure for scale** — even small projects should be organized like they'll grow

### File output format
Every file you produce must be wrapped exactly like this:
===FILE: relative/path/to/file===
[complete file contents — no truncation, no ellipsis, no placeholders]
===END FILE===

### After all files
Always end with:
===SETUP===
[exact commands to install dependencies and run the project]
===END SETUP===

## Domain-specific rules

**For games:**
- Always implement a proper game loop with delta time
- Player controls must feel responsive — handle input before physics
- Include a basic game state machine (menu, playing, paused, game over)
- AI enemies need to be interesting — at minimum use a behavior tree or state machine
- Save/load systems use JSON for simplicity unless performance matters
- Sound design hooks should exist even if audio isn't the focus

**For web apps:**
- API endpoints are RESTful with consistent error responses
- Database schemas are normalized and indexed properly
- Authentication uses sessions or JWT with refresh tokens — never store passwords in plain text
- Frontend state is managed cleanly — no prop drilling beyond 2 levels

**For AI systems:**
- Streaming responses for any LLM call that takes more than 1 second
- Rate limiting and cost controls on every API call
- Fallback behavior when the AI is unavailable
- Prompt injection protection on user inputs

**For search engines:**
- Crawlers respect robots.txt and implement exponential backoff
- Indexes are built for query speed, not storage efficiency
- Ranking is tunable — expose the weights
- Search results include relevance scores

## Tone
You narrate your work clearly and confidently. You explain decisions without being condescending. You point out tradeoffs when they exist. You tell the user when an approach has a limitation and why you chose it anyway. You never say "I cannot" — if something is genuinely impossible you explain the real constraint and offer the closest possible alternative.`;

// ── POST /api/agent/build ──────────────────────────────────────────────────────
router.post("/agent/build", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  const { task, context, history } = req.body as {
    task: string;
    context?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!task?.trim()) return res.status(400).json({ error: "task required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const emit = (type: string, data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    emit("status", { message: "Analyzing your request..." });

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: FORGE_CODER_PROMPT },
    ];

    if (history?.length) {
      for (const h of history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    const userMessage = context
      ? `${task}\n\nAdditional context: ${context}`
      : task;

    messages.push({ role: "user", content: userMessage });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      max_tokens: 16000,
      temperature: 0.2,
      messages,
    });

    let fullText = "";
    let buffer = "";
    let inFile = false;
    let inSetup = false;
    let currentFilePath = "";
    let currentFileContent = "";
    const files: Record<string, string> = {};

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (!text) continue;

      fullText += text;
      buffer += text;

      // Stream raw text to client
      emit("chunk", { text });

      // Parse file blocks
      while (true) {
        if (!inFile && !inSetup) {
          const fileStart = buffer.indexOf("===FILE:");
          const setupStart = buffer.indexOf("===SETUP===");

          if (fileStart !== -1) {
            const lineEnd = buffer.indexOf("\n", fileStart);
            if (lineEnd !== -1) {
              currentFilePath = buffer.slice(fileStart + 8, lineEnd).trim().replace(/===$/, "").trim();
              currentFileContent = "";
              inFile = true;
              buffer = buffer.slice(lineEnd + 1);
              emit("file_start", { path: currentFilePath });
              continue;
            }
          } else if (setupStart !== -1) {
            inSetup = true;
            buffer = buffer.slice(setupStart + 11);
            emit("setup_start", {});
            continue;
          }
          break;
        }

        if (inFile) {
          const endIdx = buffer.indexOf("===END FILE===");
          if (endIdx !== -1) {
            currentFileContent += buffer.slice(0, endIdx);
            files[currentFilePath] = currentFileContent.trim();
            emit("file_complete", { path: currentFilePath, content: currentFileContent.trim() });
            buffer = buffer.slice(endIdx + 14);
            inFile = false;
            currentFilePath = "";
            currentFileContent = "";
            continue;
          } else {
            currentFileContent += buffer;
            buffer = "";
          }
          break;
        }

        if (inSetup) {
          const endIdx = buffer.indexOf("===END SETUP===");
          if (endIdx !== -1) {
            const setupContent = buffer.slice(0, endIdx).trim();
            emit("setup_complete", { content: setupContent });
            buffer = buffer.slice(endIdx + 15);
            inSetup = false;
            continue;
          } else {
            buffer = "";
          }
          break;
        }

        break;
      }
    }

    emit("done", {
      fileCount: Object.keys(files).length,
      files: Object.keys(files),
    });

  } catch (err) {
    req.log.error({ err }, "Forge Coder agent error");
    emit("error", { message: "Something went wrong — try again" });
  } finally {
    res.end();
  }
});

// ── POST /api/agent/download — zip up files and return ────────────────────────
router.post("/agent/download", async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });

  const { files, projectName } = req.body as {
    files: Record<string, string>;
    projectName?: string;
  };

  if (!files || typeof files !== "object") {
    return res.status(400).json({ error: "files required" });
  }

  const name = (projectName ?? "forge-project").replace(/[^a-z0-9-_]/gi, "-");

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${name}.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  for (const [filePath, content] of Object.entries(files)) {
    const buf = Buffer.from(content, "utf8");
    archive.append(Readable.from(buf), { name: filePath });
  }

  await archive.finalize();
});

// ── GET /api/agent/capabilities ───────────────────────────────────────────────
router.get("/agent/capabilities", (_req, res) => {
  res.json({
    domains: [
      { id: "game", label: "Video Games", description: "Godot, Phaser.js, Three.js — 2D, 3D, browser or desktop", icon: "🎮" },
      { id: "web", label: "Web Apps", description: "React, Node.js, databases, APIs, real-time", icon: "🌐" },
      { id: "ai", label: "AI Systems", description: "LLM agents, RAG pipelines, ML models, neural networks", icon: "🧠" },
      { id: "search", label: "Search Engines", description: "Crawlers, indexers, ranking algorithms, full-text search", icon: "🔍" },
      { id: "mobile", label: "Mobile Apps", description: "React Native — iOS and Android from one codebase", icon: "📱" },
      { id: "api", label: "APIs & Backend", description: "REST, GraphQL, WebSockets, authentication, databases", icon: "⚡" },
      { id: "cli", label: "CLI Tools", description: "Terminal applications, automation scripts, system tools", icon: "🖥️" },
      { id: "anything", label: "Anything Else", description: "Describe it — Forge will figure out how to build it", icon: "🔥" },
    ],
  });
});

export default router;
