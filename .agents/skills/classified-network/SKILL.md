---
name: classified-network
description: Blueprint for the 13 Moon classified section network. A cross-app classified system where apps, games, and websites from The Forge Discover/Showcase get auto-posted into the classified sections of social media apps (People's Town Square, etc.) using OpenAI-generated posts. Use when building or referencing the classified network feature.
---

# Classified Network Blueprint

## The Vision

A unified classified section that lives inside the 13 Moon social media apps (starting with People's Town Square). When a builder lists their app, game, or website in The Forge Discover/Showcase, it gets automatically posted as a classified ad in the social apps too.

OpenAI writes the posts AND moderates the content. No human review needed. Ezekiel gets the spotlight first — as the community grows, other builders get featured too.

## Posting Rules
- **3–6 posts per listing** — each app, game, or website gets multiple unique posts (different angles, different copy, same link)
- **All categories welcome** — apps, games, websites, tools — as long as they pass moderation
- **Fully automated** — no manual checking required by the owner

## AI Moderation (Automatic — No Human Review)

### What Gets Rejected (AI screens for this before posting)
- Pornography or sexual content
- Crude, rude, or vulgar material
- Obnoxious or harassing content
- Gross or disturbing content
- Evil, harmful, or dangerous content
- Cold, predatory, or exploitative services
- Anything that wouldn't be welcome in a decent small-town community

### How It Works
1. Before generating posts, OpenAI first scores the submission (name + tagline + description + URL)
2. If the content fails — it is **silently ignored** — no post is created, no notification
3. If an existing post is flagged later (report system), it is **automatically archived** — removed from public view
4. Owner never has to look at it or make a decision

### Moderation Prompt Pattern
```
You are a content moderator for a community classifieds board serving farmers, 
tradespeople, families, and small business owners. 

Review this listing:
Name: {name}
Description: {description}
URL: {url}

Reply with JSON: { "approved": true/false, "reason": "..." }

Reject anything pornographic, sexual, crude, rude, obnoxious, gross, harmful, 
predatory, or that would embarrass a decent community. Approve everything else.
```

## How It Works

### Phase 1 — Owner Spotlight (Build This First)
1. Ezekiel's apps, games, and websites are submitted
2. AI moderates (passes instantly — owner's own content)
3. OpenAI generates 3–6 unique classified ad posts per listing
4. Posts publish to the classified section in People's Town Square
5. Scheduled or triggered on demand

### Phase 2 — Community Classifieds (Build When Community Grows)
1. Any builder who lists in The Forge Discover/Showcase gets posts generated
2. AI moderates automatically — no manual approval needed
3. Posts rotate so everyone gets visibility
4. No algorithm playing favorites — everyone who passes moderation gets seen

## Data Flow
```
Showcase listing submitted
        ↓
AI moderation check (OpenAI)
        ↓ (pass)              ↓ (fail)
Generate 3–6 posts          Silently ignored
        ↓
Store in DB (classified_posts)
        ↓
Publish to:
  - People's Town Square classified section
  - (future) other 13 Moon social apps
```

## Post Generation
Generate 3–6 unique posts from:
- `name` — app/game/website name
- `tagline` — one-line description
- `description` — full description
- `url` — link
- `category` — app / game / website / tool

Each post takes a different angle:
1. What it does (functional)
2. Who it's for (audience)
3. Why it matters (problem it solves)
4. A specific feature highlight
5. A community angle ("built by a real person, not a corporation")
6. A call to action

Tone: plain-spoken, honest, written for real people — farmers, tradespeople, small business owners. No hype, no corporate speak.

## DB Schema (to build)
```sql
classified_posts (
  id,
  source_app_id,        -- FK to showcase apps
  title,                -- generated headline
  body,                 -- generated ad copy
  url,                  -- link to the app
  category,             -- app/game/website/tool
  post_angle,           -- which of the 6 angles (1–6)
  is_featured,          -- owner spotlight
  moderation_status,    -- approved | rejected | flagged
  moderation_reason,    -- why rejected (logged, not shown)
  status,               -- draft | published | archived
  published_at,
  created_at
)
```

## Where It Connects
- **Source data**: `lib/db/src/schema/showcase.ts` — existing showcase apps
- **API**: Add route in `artifacts/api-server/src/routes/classified.ts`
- **Frontend**: Add classified section to TPTS and other social apps
- **Generation + Moderation**: Use OpenAI via `artifacts/api-server/src/lib/moonApi.ts`

## Key Principle
No algorithm deciding who gets seen. No owner babysitting content. AI handles the dirty work — anyone who builds something decent gets a fair shot at the spotlight.
