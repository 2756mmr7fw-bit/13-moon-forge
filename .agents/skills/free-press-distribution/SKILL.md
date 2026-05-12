---
name: free-press-distribution
description: Blueprint for free press release and news distribution — replicating what FameHero charges $49–$999/month for. Use when the user wants to add, update, or reference free news outlet connections in Forge Press.
---

# Free Press Distribution Blueprint

## What This Replaces
FameHero charges $49–$999/month to write and distribute articles to authority news sites. The Forge does this for free using OpenAI (writing) + the channels below (distribution).

## Where This Lives in the Codebase
- **Frontend**: `artifacts/the-forge/src/pages/forge-press.tsx`
- **Free outlets array**: `DIST_FREE_DIRECT` — all free channels go here
- **Paid/free-tier array**: `DIST_PAID` — PRLog, IssueWire, Send2Press
- **FameHero comparison**: `FAMEHERO_PLANS` — keep this updated with their current pricing

## FameHero Pricing (as of May 2026)
| Plan | Monthly | Articles/mo |
|------|---------|-------------|
| Launch | $49 | 1 |
| Rise | $149 | 3 |
| Accelerate | $399 | 8 |
| Scale | $499 | 10 |
| Diamond | $999 | 20 |

## Current Free Distribution Channels (DIST_FREE_DIRECT)

### One-Time Setup (Apply Once, Publish Forever)
| Channel | URL | Notes |
|---------|-----|-------|
| Google News Publisher Center | publishercenter.google.com | Apply with your domain. Every article auto-indexed. |
| Apple News Publisher | news.apple.com/publisher | Apply via RSS. Reaches hundreds of millions of iPhone users. |
| Bing Webmaster Tools | bing.com/webmasters | Submit sitemap → indexed in Bing News + MSN News. |
| News Break | publisher.newsbreak.com | 50M+ US users. Apply as publisher. |
| SmartNews | publishers.smartnews.com | 50M+ US/Japan users. 1–2 week approval. |

### Post Per Article (Free Directories)
| Channel | URL | Notes |
|---------|-----|-------|
| OpenPR | openpr.com | Largest free PR directory. Google News indexed. |
| PR.com | pr.com | Free listing + business profile. |
| 1888 Press Release | 1888pressrelease.com | Syndicates to partner news network. |
| PR Underground | prunderground.com | Distributes to Google News, Bing, regional sites. |
| Newswire Today | newswiretoday.com | Running since 2004. RSS + search engine distribution. |
| PRLog | prlog.org | Free tier — good backup before own site setup. |

### High-Authority Publishing Platforms (Free)
| Channel | URL | Notes |
|---------|-----|-------|
| LinkedIn Articles | linkedin.com | High DA, indexes in Google News and AI chatbots. |
| Medium | medium.com | Indexes in Google News, ChatGPT, Claude, Gemini. |
| Substack | substack.com | Permanent archive, publicly indexed. |
| Hashnode | hashnode.com | Best for tech/developer press releases. |
| Flipboard | flipboard.com | Create a free magazine. Google indexed. |

### Local TV Affiliates (Free Tip Submission)
- Search: `[your city] NBC affiliate news tip` / ABC / FOX / CBS
- Every local affiliate has a "Submit News Tip" or "Community Events" page
- No fee, no middleman — direct newsroom submission

## Adding New Channels
When adding a new free channel to `DIST_FREE_DIRECT`, use this object shape:
```ts
{
  name: "Channel Name",
  url: "https://...",
  price: "Free",
  model: "Short description of how it works",
  note: "1–2 sentence explanation of why it matters and who it reaches.",
  badge: "Free",
  badgeColor: "bg-green-500/15 text-green-400 border-green-500/30",
  setupNote: "Step-by-step: site.com → action → action → publish.",
}
```

## Key Insight
The services that charge money (PRWeb, PR Newswire, Business Wire, AP Newswire) are syndicating to newsrooms that assign journalists to write about you. That costs real money ($300–$2,000+ per release). The free channels above index your own content — which is what FameHero actually does, not journalist placement.
