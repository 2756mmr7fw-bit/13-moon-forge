---
name: classified-network
description: Blueprint for the 13 Moon classified section network. A cross-app classified system where apps, games, and websites from The Forge Discover/Showcase get auto-posted into the classified sections of social media apps (People's Town Square, etc.) using OpenAI-generated posts. Use when building or referencing the classified network feature.
---

# Classified Network Blueprint

## The Vision

A unified classified section that lives inside the 13 Moon social media apps (starting with People's Town Square). When a builder lists their app, game, or website in The Forge Discover/Showcase, it gets automatically posted as a classified ad in the social apps too.

OpenAI generates the post copy. Initially the owner (Ezekiel) gets the spotlight — as the community grows, other builders get featured too.

## How It Works

### Phase 1 — Owner Spotlight (Build This First)
1. Ezekiel's apps, games, and websites appear in the classified section
2. OpenAI auto-generates a compelling classified ad post from the app's name, tagline, description, and URL
3. Posts live in a "Featured" or "Spotlight" classified section
4. Manually triggered or scheduled

### Phase 2 — Community Classifieds (Build When Community Grows)
1. Any builder who lists in The Forge Discover/Showcase gets a classified ad generated
2. Moderation layer — approve before publishing
3. Builders can request a spotlight post
4. Posts rotate so everyone gets visibility — no algorithm deciding who gets seen

## Data Flow
```
The Forge Discover/Showcase (app listed)
        ↓
OpenAI generates classified ad post
        ↓
Post stored in DB (classified_posts table)
        ↓
Appears in:
  - People's Town Square classified section
  - (future) other 13 Moon social apps
```

## Post Generation Prompt (OpenAI)
Generate a classified ad from:
- `name` — app/game/website name
- `tagline` — one-line description
- `description` — full description
- `url` — link
- `category` — app / game / website / tool

Output: short classified ad (3–5 sentences), compelling, no hype, written for real people — farmers, tradespeople, small business owners.

## DB Schema (to build)
```sql
classified_posts (
  id, 
  source_app_id,       -- FK to showcase apps
  title,               -- generated headline
  body,                -- generated ad copy
  url,                 -- link to the app
  category,            -- app/game/website/tool
  is_featured,         -- owner spotlight
  status,              -- draft | published | archived
  published_at,
  created_at
)
```

## Where It Connects
- **Source data**: `lib/db/src/schema/showcase.ts` — existing showcase apps
- **API**: Add route in `artifacts/api-server/src/routes/` — `classified.ts`
- **Frontend**: Add classified section to TPTS and other social apps
- **Generation**: Use Moon API / OpenAI via `artifacts/api-server/src/lib/moonApi.ts`

## Key Principle
No algorithm deciding who gets seen. Everyone who builds something real gets a fair shot at the spotlight. Owner curates, community benefits.
