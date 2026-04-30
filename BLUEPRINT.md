# 13 Moon Forge — Master Blueprint

---

## The One Sentence

**Anyone with something to make can make it, own it, and never owe anyone for it.**

---

## Vision

The Forge is a workshop, not a warehouse. You come in, you build something with the AI, and you leave with it. Completely. No strings. The Forge doesn't hold your code, doesn't run your servers, doesn't have leverage over you. It's a tool — like a physical forge — you use it to make something, then the thing you made is yours forever.

You're not building a tool. You're building the anti-platform — the place people come when they're done being exploited by platforms. The product roadmap follows from the philosophy: make it work for everyone, make it teach while it builds, make it portable, make it disappear when you don't need it, and never hold anything hostage.

The people you're trying to attract are already out there. They're frustrated. They just don't have a place to go yet. This could be that place.

---

## The Five People You're Building For

**1. The Dreamer** *(grandma, the bakery owner, the person with a napkin idea)*
They have something they want to exist. They don't know how to build it and don't want to learn. They just want the thing to exist.
- Entry point: "Tell me what you want to make"
- The Forge asks questions, fills in the blanks, and builds it
- They never see a line of code unless they want to
- They end up with a real website, on their own server, that nobody can take away

**2. The Learner** *(the beginner, the self-taught person)*
They know a little. They want to know more. They're embarrassed to ask basic questions on Stack Overflow.
- The Forge explains what it's doing as it does it
- "Why did you write it that way?" is a valid question
- Every build is also a lesson
- They graduate from user to builder inside the Forge

**3. The Builder** *(the pro, the developer)*
They know exactly what they want. They're tired of context-switching between 12 tools.
- Voice commands, fast project switching, direct terminal access
- The Forge gets out of their way and accelerates them
- One command from idea to deployed container

**4. The Solver** *(the game developer stuck on level collision, the person with a 90%-working app)*
They didn't start in the Forge. They're stuck and they came here.
- "I'm stuck" is a front-door entry point
- Paste your error, paste your code, describe what's broken
- The Forge reasons through it like a senior engineer who has time for you
- They leave with their answer AND a reason to come back

**5. The Sovereign** *(the person who's done being the product)*
They've read the terms of service. They know what GitHub Copilot is trained on. They want out.
- The Forge's philosophy is explicit and public
- Your code never trains anything. Ever.
- Everything you build is exportable, portable, and yours on day one

---

## The 13 Moon Context — The Soul of the Product

The calendar is not decoration. It is the operating system under the Forge.

The 13 Moon calendar divides the year into 13 months of 28 days each, aligned with natural cycles. Each moon has a quality — a tone, a purpose. This maps directly onto how creative and technical work actually flows:

- Some moons are for planting (starting new projects, generating ideas)
- Some are for tending (iterating, debugging, refining)
- Some are for harvesting (shipping, deploying, sharing)
- Some are for resting (reviewing, archiving, stepping back)

**As a product feature this means:**
- The Forge knows what moon phase you're in and suggests the right kind of work
- Sprint planning aligned to moon cycles instead of arbitrary two-week sprints
- The AI understands that not every day is a build day — and that's not a bug
- A rhythm that matches human creative energy, not corporate productivity metrics

This is what no other tool has. It's also the curiosity hook — nobody else is doing this, and the question "what does the moon have to do with coding?" opens a door to the entire philosophy.

---

## How We Raise Curiosity

**The Gallery** — real things people built in the Forge. No mockups. Actual deployed projects. Proof the workshop works.

**The Forge Letter** — a short, irregular dispatch. Not a newsletter. More like a transmission. What's being made. What the moon phase means for builders. Who's doing interesting work.

**Open Builds** — with permission, people can share their build sessions. Watching the AI and a human build something together in real time is compelling.

**The Philosophy Page** — a clear, honest statement of values. No buzzwords. Just: here's what we believe, here's why we built this, here's who it's for. People who resonate will share it without being asked.

**The README is the Manifesto** — the GitHub/Forgejo README isn't documentation. It's the story. The first thing anyone sees when they find the repo answers: what is this, why does it exist, and who is it for. Not installation instructions. Not feature lists. The story. Installation comes after the reader already cares.

---

## The Mobile App

There is already a mobile Forge. That's not a footnote — that's huge. The person who has an idea at 2am shouldn't have to open a laptop. Building from your phone, checking on a deployed project from your phone, getting a notification that your moon phase is shifting into creation mode — this is a first-class experience, not a stripped-down version. The mobile app deserves its own design language and onboarding that meets people where they are.

---

## Onboarding — The First 60 Seconds

The blueprint for each persona's entry:

**The Dreamer:** "What do you want to make?" — one field, no login required to start. After they describe it, the Forge shows them what it understood and asks one clarifying question. Then it starts building. Login/account comes after they've already seen something that works.

**The Learner:** A "start here" track that builds a small real project step by step, explaining each decision. Not a tutorial — a real project they keep.

**The Builder:** API key in, connect your server, and the Forge is ready. Zero friction. They're already past onboarding before they realize it happened.

**The Solver:** "I'm stuck" button on the front page. No account required. Paste the error, describe the problem, get help. Account prompt only after the Forge has already proven it can help them.

**The Sovereign:** A "run it yourself" link prominently on the homepage. Not buried. The fact that you can self-host should be front and center — it's not a threat to the business, it's proof of the promise.

---

## Product Roadmap

**Phase 1 — The Workshop Works**
The core loop is effortless: come in, describe what you want, build it, deploy it to your server, walk away owning it. No rough edges. The Dreamer and the Solver can both do this without help.

**Phase 2 — The Forge Teaches**
Learning mode. The Forge explains its reasoning. The Learner has a path from "I don't know anything" to "I built something real." This is also what makes the Forge viral — people show their friends what they made.

**Phase 3 — The Forge Runs on Your Server**
The Forge itself becomes self-hostable. One command, any machine:
```bash
docker compose up -d
```
All AI integrations configurable (bring your own keys or run local models via Ollama). Auth configurable. Database local. The Forge checks for updates but never requires them. Anyone can run it completely air-gapped from everything you control.

**Phase 4 — The Network**
A directory of what the Forge has helped people create. Not a marketplace — proof of life. Real things, real people, real ownership. This is how the community forms without forcing it.

---

## Infrastructure — Off GitHub, On Your Terms

### The Git Migration Path

**Step 1 — Run your own Git server (Forgejo)**
Forgejo (fitting name) runs on your Hetzner server at `git.13moonforge.ai`. This is your primary home. The canonical place the code lives.

**Step 2 — Mirror to GitHub for discovery**
GitHub has millions of developers. Keep a mirror there — automatically synced from Forgejo — but your primary URL is yours. GitHub becomes a window, not the house.

**Step 3 — Your own Docker registry**
Releases published to Docker Hub under `13moonforge/forge` — or your own registry on Hetzner. The install chain has no GitHub dependency:
```bash
docker pull 13moonforge/forge
```

**Step 4 — Install script from your domain**
```bash
curl 13moonforge.ai/install | sh
```
Not from `raw.githubusercontent.com`. Your domain, your infrastructure.

**Step 5 — CI/CD on your server**
Forgejo has built-in Actions (compatible with GitHub Actions syntax). Tests and deployments run on your hardware, not Microsoft's.

When all steps are done, GitHub is just a mirror for visibility. Everything real runs on infrastructure you control.

---

## Open Source & Licensing

**License: AGPL-3.0** (already applied to the codebase)

In plain English:
- ✅ Anyone can use the Forge for free
- ✅ Anyone can read, copy, and modify the code
- ✅ Anyone can run it on their own server
- ❌ If a company takes the code and runs it as a service for others, they must publish their changes — they cannot build a closed-source product on top of the Forge
- ✅ You can still charge for the hosted version at 13moonforge.ai

**Dual licensing** — as the copyright holder, you can offer the code under a different license to specific enterprise buyers who need to keep modifications private. This is another revenue stream down the road.

---

## How We Get Paid

**The core model: Open software, paid experience**
The code is free. The hosted Forge — with the AI already set up, the server already running, the onboarding smooth — that's what people pay for. The software being free makes people trust you. Trust converts to paying customers.

**Revenue streams:**

**1. Subscriptions** (already built — Creator / Pro / Studio via Square)
Paying for access to the AI on the hosted Forge. The AI calls cost real money. Subscriptions cover that plus server costs plus time. Framing: you're not charging for the software. You're charging for not having to set any of it up yourself.

**2. Self-hosting support**
A one-time fee or small annual fee for a self-hosting kit — pre-configured Docker setup, install script, docs, email support. Real value for the Sovereign who wants independence without the setup complexity.

**3. The Sovereign tier**
A premium plan: hosted Forge plus the guarantee that projects are exportable and portable at any time. We'll help you run it yourself if you ever want to leave. That promise commands a premium.

**4. Dual licensing** (future)
Enterprise deal: pay for a commercial license that allows private modifications. 

**The honest math:**
100 people at $29/month = $2,900/month
500 people at $29/month = $14,500/month

You don't need millions of users. You need the right people who genuinely value what you've built. Those people pay and they stay.

---

## Data Privacy Architecture — Proving the Promise

The sovereignty claim needs to be verifiable, not just stated:

- **Architecture diagram** publicly showing exactly what data flows where, what talks to the internet, what stays local
- **No telemetry by default** — if analytics exist, they're opt-in and clearly documented
- **Reproducible builds** — anyone can take the source, build it, and get an identical result. This proves the published image matches the public code.
- **Plain-English privacy page** — one page, no legal obfuscation: what the Forge sees, what it stores, what leaves your server, what never does

---

## Community Building — The First 10

The first 10 people who need this most:

- Developers who've had code stolen or trained on without consent
- Creators who've been deplatformed and lost everything
- People building things that don't fit the mainstream (spiritual, unconventional, sovereign)
- The 13 Moon community already exists — people who live by this calendar are exactly the kind of people who want tools that respect their philosophy

Where they live: small forums, Telegram groups, niche Discord servers, Mastodon, independent blogs. Not Twitter, not Product Hunt first. Find the people who are already frustrated, already looking, already philosophically aligned. They become the first advocates. Then the broader world finds out through them.

---

## What We're Not Building

- A hosting company that holds your stuff
- A tool that trains on your code
- A platform that creates dependency
- A business that needs millions of users to survive
- Anything that requires you to trust us with something you can't afford to lose

---

## Brand Voice — How the Forge Speaks

The Forge does not sound like a startup. It does not sound like a corporation. It does not use exclamation points to perform enthusiasm.

**The Forge sounds like a skilled craftsperson who has time for you.**

Characteristics:
- **Direct.** Say the thing. No preamble. No "Great question!" No "Certainly!"
- **Honest about limits.** If something is hard, say so. If something might not work, say so. Trust is built by not overselling.
- **Curious, not performative.** The Forge is genuinely interested in what you're trying to make. It asks real questions, not survey questions.
- **Calm.** When things break (and things always break), the Forge doesn't panic. It reasons. Calm is contagious.
- **Never condescending.** There is no such thing as a stupid question inside the Forge. The Forge knows what it's like not to know something.

**Words the Forge uses:**
make, build, ship, own, yours, portable, honest, real, works, fix, understand, why, let's

**Words the Forge avoids:**
leverage, synergy, ecosystem, unlock, empower, seamless, solution, utilize, streamline, game-changing, revolutionary

**The test:** Would a blacksmith say this? If yes, probably right. If it sounds like a SaaS landing page, cut it.

---

## The Homepage — What a Visitor Actually Experiences

The homepage is not a feature list. It is an encounter with a philosophy.

**Above the fold — the only thing that matters:**
```
You have something to make.
Let's make it.
```
One input field. No account required. No tour. No pricing page links competing for attention. Just: tell us what you want to make.

Below that, in small text: *"What you build here is yours. Completely."*

**What happens after they type:**
The Forge reads what they wrote and responds — not with a form, not with a redirect to a signup page, but with a real response. It understood them. It's asking one smart question back. This is the moment the product sells itself. The first 60 seconds of actually using it is the sales pitch.

**The rest of the homepage (below fold):**

*Section 1 — The Gallery*
Real things real people made. A bakery menu. A portfolio. A game. A tool for a small nonprofit. No mockups. No "coming soon." Either it exists or it's not on the page.

*Section 2 — The 13 Moon Context*
Two paragraphs. Honest and strange. "We align the Forge to the 13 Moon calendar because creative work has a rhythm and a two-week sprint invented by software consultants isn't it." This is the curiosity hook. People who get it, get it instantly. People who don't, read it twice.

*Section 3 — The Promise*
Short. Bold. Three things we promise and what they mean in practice.
1. Your code never trains anything.
2. Everything you build is exportable.
3. If you want to run this yourself, we'll help you do it.

*Section 4 — The Exit Ramp*
"Want to run the Forge on your own server?" — a link, prominently placed, not hidden. This is not a threat to the business. This is proof of the promise.

*Footer — minimal*
No cookie consent theater. No GDPR popups. The privacy page explains everything instead.

---

## The AI Persona — How the Forge AI Communicates

The AI inside the Forge is not named. It is the Forge. There is no assistant character. No avatar. No cheerful robot. The Forge is a place, and the AI is how the place speaks.

**Conversational principles:**

**1. It starts with listening, not doing.**
When someone describes what they want to make, the Forge's first move is to demonstrate that it understood — not to start writing code immediately. "You want a site for your photography business — somewhere clients can see your portfolio and book a session. Does that sound right?" Before any output, a moment of reflection.

**2. It shows its thinking when asked.**
"Why did you do it that way?" is a front-door question, not an advanced feature. The Forge can always explain its reasoning in plain language. This is how the Learner persona is served — not by a separate tutorial mode, but by the Forge being transparent by default.

**3. It admits uncertainty.**
"I'm not certain this is the best approach — here's why I chose it and what the alternative would be." An AI that sounds confident about everything is not trustworthy. An AI that knows what it doesn't know is.

**4. It treats you like you're capable.**
The Forge explains things without dumbing them down. It trusts the user to handle the truth. It doesn't shield anyone from complexity — it helps people through complexity.

**5. It remembers what you're making.**
Not just the current task. The project. The Forge knows you're building a bakery site, not just "a website." The context is always the whole thing, not the current prompt.

**Tone examples:**

Good: *"The error is in how the database connection is being initialized — it's trying to connect before the environment variables are loaded. Here's the fix, and here's why it was happening."*

Bad: *"Great news! I've identified the issue! The database connection has a small hiccup but don't worry — I'll fix that right up for you! ✨"*

Good: *"I built this with SQLite for now because it's the simplest setup for a project at this stage. If you grow past a few thousand users you'd want to switch to Postgres — want me to set it up that way from the start?"*

Bad: *"I used SQLite as your database solution! It's a great choice for getting started!"*

---

## The 13 Moon Feature — How It Actually Works in the Product

The calendar is not a cosmetic. Here is the actual product implementation:

**The Moon Bar**
A subtle indicator in the Forge UI — always visible, never intrusive. Shows the current moon phase name, the day of the moon (1–28), and the quality of the current wave spell. Not a decoration. A context signal.

**What each quality means for builders:**

| Moon Tone | Quality | What the Forge suggests |
|-----------|---------|------------------------|
| Magnetic (1) | Purpose | Good day to start a new project — define what it's for |
| Lunar (2) | Challenge | Good day to identify what's not working yet |
| Electric (3) | Service | Good day to ship something to someone |
| Self-Existing (4) | Form | Good day to nail the structure of something |
| Overtone (5) | Radiance | Good day to make something beautiful |
| Rhythmic (6) | Balance | Good day to refactor, organize, clean up |
| Resonant (7) | Attunement | Good day to listen — gather feedback, read, research |
| Galactic (8) | Integrity | Good day to audit — does this do what it says? |
| Solar (9) | Intention | Good day to push something forward with force |
| Planetary (10) | Manifestation | Good day to deploy something real |
| Spectral (11) | Liberation | Good day to delete things that don't serve the project |
| Crystal (12) | Cooperation | Good day to share, document, collaborate |
| Cosmic (13) | Presence | Good day to reflect — not every day is a build day |

**In practice:**
- The Forge opens with a one-line acknowledgment of the current phase: *"Today is Rhythmic — a good day to clean up and find what's out of balance."*
- Sprint planning can be anchored to the moon cycle instead of arbitrary calendar weeks
- The AI can reference this context in suggestions: *"You've been in Spectral energy for two days — is there anything in this project you've been meaning to cut?"*

**What this is not:**
It's not astrology. It's not telling people what they can and can't do. It's a rhythm system — a way of honoring that different kinds of work fit different kinds of days. The user can ignore it entirely. But once they pay attention to it, they usually don't stop.

---

## The People's Town Square — The Full Ecosystem

The Forge is one building in a larger town. The 13 Moon Forge and all 12 apps are part of one family: **People's Town Square**. Each app is its own place — its own purpose, its own front door — but they share the same soul, the same calendar, the same users, and the same infrastructure.

This is not a collection of separate products. It is one interconnected world.

**What this means for users:**
- One account, all apps. Log into any app in the Town Square and you're recognized everywhere.
- The moon phase is the same across every app. The rhythm is shared.
- Your profile, your history, your preferences follow you from app to app.
- If one app does something, another app can know about it.

**What this means for you as the builder:**
- Change the shared design once — every app updates.
- Change the moon calendar logic once — every app reflects it.
- Fix a bug in the authentication layer once — every app is fixed.
- Deploy everything with one command.

---

## The Monorepo — How the Web Is Built

This is the technical soul of the Town Square. Everything lives in one repository. One home. One deployment pipeline.

**The structure:**
```
people's-town-square/
├── artifacts/          ← Every app lives here
│   ├── the-forge/      ← Already built and running
│   ├── forge-mobile/   ← Already built and running
│   ├── api-server/     ← The central hub — already built
│   ├── app-3/          ← Next app coming in
│   ├── app-4/
│   └── ... (12 apps total)
│
├── lib/                ← Shared code — change once, update everywhere
│   ├── moon-calendar/  ← The 13 Moon logic — one source of truth
│   ├── ui/             ← Shared design system (buttons, colors, layouts)
│   ├── auth/           ← Shared authentication
│   ├── api-client/     ← Already built — how apps talk to the server
│   ├── db/             ← Already built — the database layer
│   └── types/          ← Shared data shapes used by all apps
│
└── scripts/            ← Tools that help manage all of it
```

**The central API server is the nervous system.**
All 12 apps talk to one API. They don't each have their own backend. They share one. When the API learns something new, every app benefits. When a user does something in one app, the API knows, and any other app can respond to it.

**How "change everything at once" actually works:**

1. You change something in `lib/ui/` — the shared button color, the shared header
2. You push to Forgejo (your own Git server)
3. Forgejo automatically builds every app that uses that library
4. Every app is deployed to your Hetzner server with the new change
5. Done. All 12 apps updated. One push.

**How bringing in the 12 existing Replit apps works:**

For each app:
1. We copy the code from its Replit into the monorepo under `artifacts/`
2. We identify what it shares with other apps (auth, design, moon logic) and move that into `lib/`
3. We add a Dockerfile (same pattern as the Forge)
4. We add a subdomain in Traefik (`app-name.13moonforge.ai` or its own domain)
5. It's live on your server and connected to everything else

The first app takes the longest because we're establishing the pattern. The second app takes half the time. By the fifth app, it's routine.

**The domain structure of the Town Square:**
Every app in the family gets its own address, all served from the same Hetzner server:
```
13moonforge.ai          — The Forge (live now)
git.13moonforge.ai      — Your Forgejo Git server (deployed, waiting for DNS)
[app].13moonforge.ai    — Each app in the Town Square
```
Or if individual apps have their own domains, Traefik routes those too — same server, different front doors.

---

## The First 30 Days — Launch Strategy

The goal of the first 30 days is not traffic. It is **10 real people having a real experience.**

**Week 1 — The Quiet Open**
Don't announce. Turn off the "coming soon" gate. Let the Forge be findable. Anyone who arrives gets the real experience. Fix whatever breaks in real time. These are your first testers and they don't know it.

**Week 2 — The First Conversations**
Go find people personally. Not on Twitter. In Telegram groups, Discord servers, Mastodon, forums where frustrated developers and creators already talk. Don't pitch. Participate. When the moment is right: "I built something that might be relevant — here's what it does and why." Direct and honest.

Specifically:
- 13 Moon / Mayan calendar communities (they are already philosophically aligned)
- Privacy-focused developer spaces (Mastodon, Lemmy, Hacker News "Ask HN" threads)
- Indie maker spaces (Makerlog, IndieHackers — but selectively, not as a launch post)
- Small creator/artist communities who are tired of the big platforms

**Week 3 — The First Piece of Writing**
Write one honest post: "Why I built this and who it's for." Not a launch announcement. Not "check out my new startup." A genuine piece of writing about sovereignty, creative work, and the philosophy behind the Forge. Put it on the site. Share it once in each community where you've been participating. Let it find people who resonate.

**Week 4 — Listen Hard**
The first 10 people who use the Forge will tell you what it's actually missing. This is worth more than any roadmap. Reach out to each one personally. Ask one question: "What were you trying to make when you came to the Forge, and did it work?" The answer shapes everything next.

**What success looks like at day 30:**
Not follower counts. Not Product Hunt rankings. 10 people who have built something real using the Forge and would be genuinely sad if it disappeared tomorrow. That's the foundation everything else is built on.

---

## What We're Not Building

- A hosting company that holds your stuff
- A tool that trains on your code
- A platform that creates dependency
- A business that needs millions of users to survive
- Anything that requires you to trust us with something you can't afford to lose

---

*The name "Forge" is ancient. Nobody owns that word. An anti-platform built on a forge — a place to make things and then take them home — is exactly what it says it is.*
