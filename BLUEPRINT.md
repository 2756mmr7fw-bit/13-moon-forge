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

*The name "Forge" is ancient. Nobody owns that word. An anti-platform built on a forge — a place to make things and then take them home — is exactly what it says it is.*
