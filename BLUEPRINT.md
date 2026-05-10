# 13 Moon Forge — Master Blueprint

**Sovereign Digital LLC**
Last updated: May 2026

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

**The Forge Letter** — a short, irregular dispatch. Not a newsletter. More like a transmission. What's being made. What the moon phase means for builders this cycle. One person who built something real and what it took. Published when there's something worth saying — not on a schedule. Readers who find it will share it because it doesn't feel like marketing.

**Open Builds** — with permission, people can share their build sessions. Watching the AI and a human build something together in real time is compelling. Not a tutorial. An honest record of how something got made.

**The Philosophy Page** — a clear, honest statement of values. No buzzwords. Just: here's what we believe, here's why we built this, here's who it's for. People who resonate will share it without being asked.

**The README is the Manifesto** — the Forgejo README isn't documentation. It's the story. The first thing anyone sees when they find the repo answers: what is this, why does it exist, and who is it for. Not installation instructions. Not feature lists. The story. Installation comes after the reader already cares.

---

## The Mobile App

There is already a mobile Forge. That's not a footnote — that's huge. The person who has an idea at 2am shouldn't have to open a laptop. Building from your phone, checking on a deployed project from your phone, getting a notification that your moon phase is shifting into creation mode — this is a first-class experience, not a stripped-down version.

The mobile app's role in the Town Square grows over time. It starts as a mobile window into the Forge. Eventually it becomes the mobile window into every app in the family — one app on your phone, every service inside it. The mobile app deserves its own design language and onboarding that meets people where they are.

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
Learning mode. The Forge explains its reasoning. The Learner has a path from "I don't know anything" to "I built something real." This is where Forge Academy lives.

**Phase 3 — The Forge Runs on Your Server**
The Forge itself becomes self-hostable. One command, any machine:
```bash
docker compose up -d
```
All AI integrations configurable (bring your own keys or run local models via Ollama). Auth configurable. Database local. The Forge checks for updates but never requires them. Anyone can run it completely air-gapped from everything you control.

**Phase 4 — The Network**
A directory of what the Forge has helped people create. Not a marketplace — proof of life. Real things, real people, real ownership. This is how the community forms without forcing it.

---

## Forge Academy — From Absolute Zero to Journeyman

The Forge doesn't just build things. It teaches.

Forge Academy is the built-in school inside the Forge. Anyone — starting from zero, knowing nothing, intimidated by everything — can walk in and walk out a working developer. At their own pace. On their own terms. Picking up exactly where they left off every single time.

The Forge starts at Level 1. Not Level 3. Not "some prior experience required." Level 1, lesson 1, no prerequisites. That's the promise and it doesn't bend.

---

### The Craft Model — How Developers Have Always Been Made

Coding isn't a subject. It's a trade. You learn it the way any trade has ever been learned: you start as a beginner, you practice until you're an apprentice, you build real things until you're a journeyman, and then — only after years of working in the real world — you become a master.

The Academy teaches Levels 1 through 12. Completing Level 12 makes you a **Journeyman** — someone who can build real things professionally, take on real clients, and solve problems independently. That credential means something because it's earned.

**Master** is what comes after. Five years of constant, real-world practice on top of everything the Academy teaches. Not a class you finish. A way of working you grow into. The Academy doesn't promise to make Masters — it promises to build the foundation that Masters stand on.

---

### Who Can Join

If you can read and write, you can start. That's the only requirement. No age limit. No prior experience. No technical background needed. A 12-year-old and a 65-year-old start at the same assessment and the Forge puts them exactly where they belong — because the goal is to learn, not to perform humility.

**The Placement Assessment**

Nobody should have to sit through what they already know. Before a student begins, the Forge asks a short series of real questions — not multiple choice, not a quiz — more like a conversation. What have you built before? What tools have you used? Can you explain what a variable is in your own words? Have you ever looked at a webpage's source code?

From that conversation, the Forge places the student at their actual starting level. A complete beginner starts at Level 1. Someone with some experience might start at Level 4 or Level 6. Someone who's been building real things — deploying apps, working with databases, writing code that other people use — might start at Level 8 or 9 to fill in the formal gaps and round out what they know.

The placement isn't a judgment. It's a service. The Academy's job is to move you forward from where you actually are, not where a syllabus assumes you should be.

**The Builder Who Wants to Learn Too**

The person who designed the Forge — who built a live app, a self-hosted Git server, a full monorepo with auto-deploy pipelines, a mobile app, a PostgreSQL database — is not a beginner. That's Builder-level work, somewhere around Level 7 or 8. The gaps at that level aren't in what's possible — they're in the underlying patterns, the formal practices, the deeper architecture that explains *why* things work the way they do.

The Academy is for that person too. The Forge's founder is one of its first students. That's not a liability — it's proof. If the tool teaches the person who built it, it teaches anyone.

---

### The Four Stages and Their Timeline

```
Levels 1–6    Year One    Beginner → Apprentice
Levels 7–12   Year Two    Builder → Journeyman
─────────────────────────────────────────────────
+ ~1 year of constant real-world practice

= Master
```

Two years of consistent work through the Academy earns you Journeyman — enough to build real things professionally, take real clients, and solve problems on your own. One more year of building hard in the real world, on projects that challenge you, is what turns Journeyman into Master.

This isn't a guarantee. It's what consistent effort actually produces. Some people move faster. Some slower. The timeline is honest, not a sales pitch.

---

### The Three Builds — What Every Student Leaves With

Every student who finishes the Academy leaves with three things they built themselves:

**1. Their Website** — started in Level 3, grown across all 12 levels into a real, live, professional site with their name on it. Could be a portfolio, a business, a blog, a store — whatever they decided to make. It lives at a real URL. It can earn them real money.

**2. Their App** — started in Level 5, fully functional by Level 9, deployed in Level 11. A real web application that stores data, has real users, and does something useful. Could be a tool, a service, a productivity app — their idea, their code, their product.

**3. Their Game** — started in Level 10, complete by Level 12. A real, playable game. Small by commercial standards, but finished — and finished matters more than big. Could be listed on itch.io the day it's done. Could be the foundation of something much larger.

Every one of these is the student's intellectual property. Not a tutorial project. Not an exercise. Theirs. To sell, to show, to build a career on, or to keep building.

---

### How Every Level Works — The Mix

No level teaches just one thing. Every lesson connects to all three builds.

A lesson on JavaScript loops (Level 5) teaches:
- How a website uses a loop to display a list of articles
- How an app uses a loop to process form entries
- How a game uses a loop to move an enemy across the screen

The same concept. Three different contexts. A student never has to wonder "when would I ever use this?" — they're already using it in three places.

This also means every level advances all three builds at once. After Level 6, the website looks real, the app foundation is in place, and the student understands the logic that games are built from. Nothing is siloed. Everything connects.

---

### The Return and Improve Rule

At any level, a student can go back to something they built earlier and make it better with what they know now.

The Level 3 website was three lines of HTML. By Level 7, it can have a real back end. By Level 9, it can have a database behind it. By Level 11, it's deployed at a real domain. The student decides whether to keep building the original or start something new. Both are valid. The Forge remembers every version.

This isn't optional extra credit. It's how real developers work. Nobody builds something once and never touches it again. A project grows with the person who made it.

---

**Year One — Levels 1 through 6**

The first year takes you from knowing nothing to writing real interactive code and having the first version of your website and the foundation of your app.

**Stage 1 — Beginner (Levels 1–3)**

Before a student writes a single line of code, they understand why code exists, who invented it, and what tools real developers actually use. By Level 3, they're writing real things — small, simple, and genuinely theirs.

---

**Level 1 — The Tools, the Theory, the History**

Every trade has a history. Coding has one of the most interesting ones on earth.

*The history:*
- Where programming came from — Ada Lovelace in 1843, the first person to realize a machine could follow written instructions
- Alan Turing and the idea that a machine could think
- Grace Hopper, who wrote the first compiler and coined the term "debugging" after pulling a literal moth out of a relay
- The people who built the internet, the web, the languages — real humans solving real problems, not mythical geniuses
- Why there are hundreds of programming languages, what they're each for, and how a developer knows which one to reach for

*The companies — who built the world students are learning to enter:*

Every tool, every website, every app a student has ever used was built by a company or a person. Level 1 introduces the major players — not as corporations to admire, but as context for understanding where the industry came from and how it works.

- **Microsoft** — built Windows and Office, now owns GitHub and VS Code (the most used code editor on earth), and runs Azure, one of the three clouds everything runs on. Also created TypeScript, which is how the Forge is built.
- **Apple** — built the Mac, the iPhone, and iOS. Developers who build iPhone apps use Swift, a language Apple created. The App Store is how most mobile software reaches people — and Apple takes 30%.
- **Google** — built the search engine, Chrome, Android, YouTube, and Google Cloud. Created Go (a programming language) and contributes massively to open source. Also owns the most used AI research organization on earth.
- **Meta (Facebook)** — built Facebook, Instagram, and WhatsApp. Created React, the most popular way to build web interfaces in the world today — which is also what the Forge is built with.
- **Amazon** — started as a bookstore, became the backbone of the internet. AWS (Amazon Web Services) powers a significant portion of every website a person visits. If AWS goes down, half the internet goes with it.
- **Epic Games** — built Fortnite and the Unreal Engine, one of the two dominant game engines on earth. Unreal is free to use. Epic has spent years fighting Apple's 30% cut in court.
- **Unity** — the other dominant game engine. Powers the majority of indie games. Changed their pricing model in 2023 in a way that enraged developers — a case study in why a tool's business model matters as much as its features.
- **Valve / Steam** — built the dominant PC gaming marketplace. Created the Source engine (Half-Life, Portal, Counter-Strike). Run by almost no management structure — one of the most unusual successful companies in tech.
- **id Software** — built Doom and Quake, released the source code for free, and in doing so taught an entire generation of developers how games work. John Carmack is one of the most important programmers in history.
- **The open source world** — Linux (the operating system running most servers on earth, including the Forge's server), Mozilla (Firefox, the open-source browser), the Apache Foundation, the Linux Foundation. Software that nobody owns and everyone uses.
- **Indie developers** — one person, one game, one app, no company. Minecraft was built by one person. So was Stardew Valley. So was Dwarf Fortress. This is the category the Academy exists to grow.

*Why this matters for a student:*
Understanding who built what — and how they built it — is what turns a student into someone who thinks like an industry insider before they've written their hundredth line of code. It also makes clear that the biggest, most used software in the world was built by people, not by magic. People who started exactly where the student is starting.

*The theory:*
- What is a computer actually doing? Not the marketing version — the real version. Instructions, memory, ones and zeros, in plain English.
- What is a programming language? How does something you type turn into something a machine does?
- What is the difference between front end and back end, client and server, app and website?

*The tools:*
- What is a text editor and why developers use them instead of Word
- What is a terminal — why it looks like 1985 but still runs the modern world
- What is a browser's developer tools and how to open them on any website right now
- The Forge as your workshop — everything needed is already here, nothing to install

*Homework:* Pick one company from the list above. Research how they got started, what language they built their first product in, and one thing they built that you've actually used. Write three sentences about it.

---

**Level 2 — How Computers and the Web Actually Work**

Before writing code, a developer needs a mental model of what happens when they do. This level builds that model.

*The computer:*
- What happens between pressing a key and something appearing on screen — the full chain
- What is a file? What is a folder? What is a program? In real terms, not marketing terms.
- What does it mean to "run" something? What does an error actually mean?
- Why computers do exactly what you tell them — not what you meant

*The web:*
- What happens between typing a URL and seeing a page — the full journey, step by step
- What is a browser? What is a server? What is the difference between the two?
- What is HTML, CSS, and JavaScript — in one honest sentence each, before touching any of it
- Why websites are made of plain text files that any human can open and read

*Homework:* Open the developer tools in your browser and look at the source code of a website you use every day. Find one thing you recognize and one thing you don't. Write down both.

---

**Level 3 — The First Real Code**

This is where every developer in history started. The same first line. The same first feeling.

*Hello, World:*
- The first program every developer ever wrote — making a computer say something
- Why this tradition has existed for 50 years and what it means when you've done it
- Writing it in the Forge, seeing it run, understanding what just happened

*Variables — the first real concept in every language ever written:*
- What a variable is: a box with a label that holds a piece of information
- Creating one, giving it a value, using it somewhere
- Why variables exist and what programming would look like without them

*Making the computer do simple things:*
- Print something to the screen
- Do simple math
- Make a decision: if this, then that
- Ask for input and respond to it

*Your first webpage:*
- An HTML file with your name, one thing you like, and one thing you want to build someday
- Opening it in a browser and seeing it exist in the world
- That feeling — the thing you typed became something real

*Homework:* Make a webpage that says something true about you. It doesn't have to be beautiful. It has to be real and it has to be yours.

---

The goal of the Beginner stage is one thing: make the machine feel like a tool that humans invented to solve human problems — because that's exactly what it is. Once a student sees it that way, the intimidation leaves and doesn't come back.

**Stage 2 — Apprentice (Levels 4–6)**

The Apprentice stage is where things start to look real and behave like real software. Every lesson advances the website, lays the foundation of the app, and introduces the logic that games are built on.

---

**Level 4 — Making It Look Real**

*What's being taught:* CSS — the language that makes a page look like a real product instead of a text document.

*Website build:* The Level 3 personal page gets a full visual treatment. Real layout. Real colors. Real typography. Looks right on a phone and a computer. By the end of Level 4, a student has a website they're not embarrassed to share.

*App foundation:* Understanding how visual design connects to code — how a button is styled, how a form looks trustworthy, how layout communicates what something is for.

*Game connection:* How game UI works — health bars, score displays, menus — are all CSS and layout concepts applied to a different canvas.

*Homework:* Make your website look like something a professional would charge for. It doesn't have to be perfect. It has to be intentional.

---

**Level 5 — Making It Do Things**

*What's being taught:* JavaScript — the language that makes everything interactive.

*The concepts, in order:* Variables, conditions, loops, functions. Each one explained in plain English before a single line of code. Each one demonstrated in all three contexts — website, app, and game — at the same time.

*Website build:* The website now responds. A navigation menu that opens and closes. A button that does something when clicked. A form that checks if it's filled out correctly before it submits.

*App foundation:* The core logic of the app takes shape. What happens when a user clicks something? What happens when they submit information? What should the app remember?

*Game connection:* Movement. A character that responds to a keypress. A score that goes up. A game over condition. These are the same JavaScript concepts — applied to a canvas instead of a webpage.

*Homework:* Add one thing to your website that wasn't possible without JavaScript. Something that responds to the person using it.

---

**Level 6 — First App**

*What's being taught:* Local storage, state management, and building something that works as a complete tool.

*Website build:* The website can now save preferences. Remember what the visitor last looked at. Feel like a real product visit to visit.

*App milestone — First App complete:* By the end of Level 6, the student has a working app. It runs in the browser. It does something useful. It saves information between sessions. It could be a to-do list, a budget tracker, a personal journal, a recipe box — whatever the student chose to make. It works. It's theirs.

*Game connection:* The app-building skills map directly to game systems. A to-do list is a quest log. A budget tracker is an inventory system. A journal is a player diary. Students start to see these connections themselves.

*Homework:* Finish your first app. It doesn't need a back end yet. It needs to do the one thing it's supposed to do, reliably, every time someone uses it.

---

**Year Two — Levels 7 through 12**

The second year takes everything built in Year One and makes it real — real back end, real database, real deployment, real game. By the end, all three builds are live on the internet and could start earning money the day they're published.

**Stage 3 — Builder (Levels 7–9)**

---

**Level 7 — How the Back End Works**

*What's being taught:* Servers and APIs — the invisible half of every app ever built.

*The concepts:* What is a server? What is an API? What happens between "submit" and "your data was saved"? Every student has used dozens of back ends without knowing it. Level 7 makes the invisible visible.

*Website build:* The website can now send and receive data. A contact form that actually sends an email. A page that loads content from a real source instead of being hard-coded.

*App build:* The first app gets a real back end. It no longer saves only to the browser — it saves to a server. Now two people on different computers can use the same app.

*Game connection:* Online leaderboards, saved game state, multiplayer — all back end concepts. A game that saves your score to a server is the same architecture as an app that saves your budget.

*Homework:* Add one server-side feature to your app. Something that would have been impossible with only front-end code.

---

**Level 8 — Databases**

*What's being taught:* Where data actually lives, how it's organized, and how to get it back out.

*The concepts:* Tables, rows, queries. Storing a user. Storing a post. Storing a score. Getting them back in the right order. Understanding why databases exist and what the world would look like without them.

*Website build:* The website can now have real content that lives in a database. A blog where posts are stored and retrieved. A gallery where images are listed from a database. Content that can be added without editing code.

*App build:* The app now has a real database behind it. User accounts. Persistent records. Data that survives a server restart.

*Game build:* Player profiles. High score tables. Saved game state across devices. All of this is database work.

*Homework:* Add a database to something you've already built. Take one thing that was hard-coded and make it dynamic — stored, retrieved, real.

---

**Level 9 — Full Stack — Everything Connected**

*What's being taught:* Bringing front end and back end together into one complete working system.

*App milestone — Full App complete:* By the end of Level 9, the student's app is fully connected. Front end talks to back end. Back end talks to database. User accounts work. Data persists. It is, by every meaningful definition, a real web application. It could be launched to the public today.

*Website build:* The website is now fully dynamic. A real CMS behind it. Real user-generated content if the student wants it. A contact form with a real database behind it.

*Game connection:* Understanding how a multiplayer game keeps two players in sync — the same client-server architecture the student just built for their app.

*Homework:* Make your full app work end to end. Sign up. Log in. Do the thing the app is for. Log out. Come back and see that everything is still there.

---

**Stage 4 — Journeyman (Levels 10–12)**

---

**Level 10 — Git and Professional Practice**

*What's being taught:* Version control — the one tool every professional developer uses every day.

*The concepts:* What is a repository? What is a commit? What is a branch? How do you go back to a version that worked? How do developers work on the same code without destroying each other's work?

*All three builds:* Everything the student has built goes into a real Git repository. Every project gets a proper version history. The student can now work like a professional — trying things, saving working states, going back if something breaks.

*Game build begins:* The game project starts here, in a Git repository, managed like a real software project from day one.

*Homework:* Put all three of your builds into Git repositories. Write a real README for each one — what it is, what it does, how to run it.

---

**Level 11 — Deployment — Live on the Internet**

*What's being taught:* Taking something off a local machine and putting it where anyone in the world can use it.

*Website milestone — Live:* The student's website is deployed to a real domain. It has a URL they can give anyone. It loads fast. It works on every device. It is, without qualification, a real website on the real internet.

*App milestone — Live:* The app is deployed. Real users can sign up. Real data is stored. The thing the student built in nine levels of work is now a product.

*Game build continues:* The game gets its first deployment — to itch.io, a game platform where indie developers publish their games. The same day it's deployed, it's available to millions of people.

*Homework:* Deploy all three builds. Send the links to someone who doesn't know you built them and see what they say.

---

**Level 12 — The Capstone — Finish What You Started or Start Something New**

*What's being taught:* Scoping, planning, building, and shipping a complete project from beginning to end.

*The choice:* At Level 12, the student chooses. They can take one of their three builds and make it the best version it can be — fully designed, fully functional, polished enough to charge for. Or they can start something new, applying everything from Levels 1 through 11 to a fresh idea.

*The game:* The Level 12 game milestone is a complete, playable game. Not a prototype. A game with a beginning, a middle, and an end — or an infinite loop if it's that kind of game. Something with a title screen, a score, a way to win or lose, and a share link. Something a student can list on itch.io the day they finish.

*The standard:* By Level 12, a Journeyman's work should be able to earn real money. A website built at Level 12 is worth charging for. An app built at Level 12 can be subscribed to. A game built at Level 12 can be sold.

*Homework:* Ship it. That's the whole assignment. Whatever you built — ship it. Put it in the world. Let people use it.

**Completing Level 12 earns Journeyman status.** You are a working developer. You have a website, an app, and a game — all live, all yours, all capable of earning. The credential is real because the work behind it is real.

---

### Where It All Points — The Video Game

A student who reaches Level 12 should be able to look at a video game and think: *I could build something like that.*

Not "I might someday maybe be able to." Actually think it. Because by Level 12, they have every skill it takes.

A video game is not magic. It is:
- A front end — the screen, the graphics, the interface (Levels 4–6)
- Logic — decisions, conditions, movement, scoring, what happens when you win or lose (Levels 5–6)
- Data — saved games, high scores, player profiles that persist (Levels 7–8)
- A back end — multiplayer, leaderboards, accounts (Levels 8–9)
- Deployment — putting it somewhere other people can actually play (Level 11)
- A complete project — scoped, built, finished (Level 12)

By Level 12, a student has built every one of those pieces. Not in a game — but in real projects that required the same skills. The gap between "I've built a full-stack web app" and "I can build a game" is smaller than most people think. The logic is the same. The tools are often the same. The confidence is what changes.

The Academy introduces game development concepts across the curriculum — not as a separate track, but woven in. How does Doom's movement engine work? How does Minecraft store a world? How does a leaderboard decide who's on top? These aren't trivia questions. They're the same problems students are already solving, explained through a lens that makes the work feel exciting.

**The Forge Academy Game Track (within Levels 10–12)**

Students who want to go specifically into game development get a dedicated path inside the final stage:
- Introduction to game loops — the heartbeat of every game ever made
- Collision detection — how a game knows when something hit something else
- Sprite and tile systems — how 2D games are built from small pieces
- Building a complete small game — playable, shareable, actually fun

This isn't a separate curriculum. It's the same Journeyman work, applied to games. A student who finishes the game track has a game in the gallery. A real one. One that works.

---

### From Journeyman to Master

After Level 12, the classroom ends and the real education begins.

Master is not a certificate the Academy can give you. It has to be earned in the world — on projects that don't have instructions, for clients who don't know what they want, debugging things that weren't supposed to break, building things nobody has built quite this way before.

One year of that — consistent, challenging, real-world work — is what turns a Journeyman into a Master. Not calendar time. Work time. The developer who builds something every week for a year, takes on hard problems, and doesn't stop when it gets difficult. That's what makes a Master.

By the end of Levels 1–12 and one hard year of real work, a student has everything they need to do their own work — independently, professionally, for themselves or for anyone who hires them.

---

### What Makes This Different

**The Forge starts where you actually are.**
Level 1. No assumed knowledge. The grandma with a napkin idea and the self-taught person who knows a little and wants to know more both start at the same place — and the Forge figures out quickly what you already know and stops explaining things you don't need explained.

**The Forge remembers exactly where you left off.**
Not approximately. If you stopped in the middle of Level 8 three months ago, the Forge opens with: *"You're in Level 8, lesson 3 — we were connecting your front end to the database. Want to pick up there?"* One sentence. No re-orientation.

**Homework builds something real every time.**
No practice problems that don't connect to anything. Every assignment is a brick in something real that you own when the lesson is over.

**The Forge explains. It doesn't lecture.**
When you're stuck, you ask. The Forge explains at the level you're actually at — not where the curriculum assumes you should be.

**No pace pressure.**
Some people finish in two years. Some take six. There's no cohort, no deadline, no one ahead of you to feel bad about. The only comparison is you from last month.

---

### The Curriculum Is the Forge Itself

Every lesson uses the Forge's own tools. You write HTML in the Forge. You deploy with the Forge. When you finish Level 12, you don't just know how to code — you know how to use the best builder tool available. The school and the workshop are the same place.

---

### Who Makes the Lessons

The Moon AI writes them.

Not placeholders. Not outlines waiting to be filled in. Complete lessons — explanations, examples, homework, follow-up — generated from the curriculum structure laid out in this blueprint and delivered to each student as something that feels personal, because it is. The AI isn't reading from a static page. It's writing for the person in front of it, at the level they're actually at, in language that matches what they already know.

This is possible because the same Moon AI that powers the rest of the Forge — answering questions, building projects, debugging code — can turn the curriculum structure (the 12 levels, the progression, what each level covers) into real teaching. The structure is the human part. The delivery is AI.

**Why this is better than hand-written lessons:**

A hand-written lesson says the same thing to everyone. If it doesn't land, the student is stuck until someone rewrites it. The AI has unlimited ways to explain something. If the first explanation doesn't work, it tries a different angle — a different metaphor, a simpler example, a different order. It doesn't run out of patience. It doesn't have a bad day. It doesn't skip the question that's embarrassing to ask.

The AI also learns across students. When many people get stuck at the same point in Level 5, the lesson adjusts. The curriculum gets sharper over time without anyone manually editing it.

**What the human layer looks like:**

Ezekiel designs the curriculum structure — what each level covers, in what order, what the homework should produce. That structure is the blueprint the AI works from. It's reviewed periodically to make sure the AI's lessons are hitting the right notes and using the right language. The standard is simple: would a real person with real experience explain it this way? If yes, it ships. If not, the structure gets refined until it does.

As the Town Square community grows, experienced members can flag gaps, suggest topics, and contribute structure — but the writing and delivery stays AI-powered. One consistent voice. Infinitely patient. Available at 2am when the lesson finally makes sense.

---

### The Progress Model

The Forge tracks three things per student:

1. **Completed lessons** — what you've fully finished
2. **Submitted homework** — what you've actually built, not just read
3. **Understood concepts** — inferred from how you engage, where you slow down, what questions you ask

This data never resets. Come back after a year away and the Forge knows exactly where you are.

---

### What You Get When You Finish Level 12

Earning Journeyman status is real. The perks reflect that.

**The Journeyman Certificate**
A real, shareable credential with a unique public URL — not a digital badge, a portfolio page. It links to every project built across all 12 levels with a timestamp showing when each was completed. Anyone the graduate sends it to can see the actual work, not just a claim.

**A Permanent Home in the Academy Hall**
A public record at `13moonforge.ai/graduates` — real names, real completion dates, real project links. Students choose whether to be listed. Those who are listed can point anyone to it as proof of what they built.

**Lifetime Forge Discount**
Journeyman graduates receive a permanent 30% discount on any Forge subscription — forever, not just for the first year. They earned it. The Forge wants to keep them building.

**Free Month of Forge Pro**
The month they graduate, they get Forge Pro at no cost. An invitation to start building real things with the full tool now that they have the skills to use it.

**The Journeyman Badge**
A verified badge that follows them across every Town Square app. Visible on their profile everywhere in the ecosystem. When another person in the Town Square sees it, they know what it means.

**Featured in the Forge Gallery**
Their Level 12 capstone project — the thing they built start to finish — gets submitted to the Forge Gallery. Real proof that the workshop works. With permission, it's one of the first things a new visitor sees.

**Early Access to New Features**
Journeyman graduates get early access to new Forge tools and new Town Square apps before they're public. They helped prove the Academy works — they should see what's coming first.

**The Right to Teach**
Graduates are invited to mentor students who are earlier in the curriculum — through the Academy community, not as a support obligation but as an opportunity. Teaching is how knowledge gets solid. If a graduate wants to contribute a lesson in an area of deep expertise, they can submit it for review and get paid for it if it's published.

**The Honest Thing to Say About These Perks**
None of them are gimmicks. Each one exists because it's genuinely useful to someone who just spent two years building toward something real. The discount is real. The portfolio is real. The badge means something in the Town Square because the Town Square is a real community. These are the perks that a craftsperson would actually want — not confetti and a trophy.

---

### Academy Pricing

Forge Academy is its own subscription, separate from the main Forge builder.

**For the student:** A beginner has no use for deployment tools and AI code generation yet. Don't make them pay for things they're not ready for. Make it easy to say yes to the thing they actually need.

**For the business:** AI tutoring per learner costs real money. Bundling it into the general subscription subsidizes every learner's usage invisibly. Separate subscription, separate cost, honest economics.

```
Free:              Levels 1–3 — the full Beginner stage, no account required
                   A complete first chapter, not a teaser
                   Finish it and you understand computers and have written real HTML

Academy:           $9/month — or $79/year (saves two months)
                   Full Levels 1–12 curriculum through Journeyman
                   AI feedback on every homework submission
                   Progress saved forever — come back anytime
                   Journeyman certificate upon completion
                   Access to the Academy community

Academy + Forge:   $24/month — or $199/year
                   Everything in Academy plus the full Forge builder subscription
                   One account, both tools, discounted from buying separately
                   ($9 + $19 = $28 separately — bundle saves $4/month)
```

The free Beginner stage is not a demo. Someone who finishes Level 3 understands how computers and the internet work and has written their first real HTML. That's theirs. If they pay to continue, good. If they walk away having learned something real and never pay — that's the Forge's reputation being built one person at a time.

---

*"Two years of honest work through the Academy. One more year building hard in the real world. That's the path. At the end of it, you can build anything you can think of — for yourself, for clients, for the world. The Forge gets you there. Where you go after is yours."*

---

## Infrastructure — Off GitHub, On Your Terms

### The Git Migration Path

**Step 1 — Run your own Git server (Forgejo)**
Forgejo runs on the Hetzner server at `git.13moonforge.ai`. This is the primary home. The canonical place the code lives. Already done.

**Step 2 — Mirror to GitHub for discovery**
GitHub has millions of developers. Keep a mirror there — automatically synced from Forgejo — but the primary URL is yours. GitHub becomes a window, not the house.

**Step 3 — Your own Docker registry**
Releases published to Docker Hub under `13moonforge/forge` — or a private registry on Hetzner. The install chain has no GitHub dependency:
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

## How We Get Paid — The Full Picture

**The core model: Open software, paid experience.**
The code is free. The hosted Forge — with the AI already set up, the server already running, the onboarding smooth — that's what people pay for. The software being free makes people trust you. Trust converts to paying customers.

---

### The Forge Subscription

Three tiers, already built via Square:

```
Creator:    $9/month   — for individuals just getting started
Pro:        $19/month  — for active builders, full AI access
Studio:     $49/month  — for teams, power users, commercial projects
```

---

### Forge Academy Subscription

Standalone, separate from the Forge builder subscription.

```
Free:                 $0     — Grades K–2, 8 lessons, no account required
Academy:              $9/month or $79/year
Academy + Forge Pro:  $24/month or $199/year
```

---

### Town Square Ecosystem Subscription

One subscription that unlocks paid features across all 12 apps.

```
Town Square Member:   $14/month or $119/year
                      Free features at all 12 apps become paid features
                      One login, one price, everything opens
```

This is separate from both the Forge subscription and Academy. A person can subscribe to just what they use. A person who wants everything gets the best deal by subscribing to each relevant piece.

---

### Per-App Pricing — What Each App Costs Alone

Some apps in the Town Square are better thought of as standalone products. People who never use the Forge should still be able to subscribe to just Call Guardian, just Ledger, just Antivirus.

```
TPTS (Social):          Free — community is always free
                        $5/month for business listings and featured placement

Town Square Press TV:   Free to watch
                        $7/month to publish and monetize your channel

Town Square Press:      Free to publish
                        15% cut on sales (writer keeps 85%)
                        $5/month to remove the cut and keep 100%

Inventors Workshop:     $12/month — AI assistance is core to the product

Town Square TV:         Free to watch
                        Revenue share with filmmakers (70% to filmmaker, 30% to platform)

13 Moon Antivirus:      $4/month or $35/year
                        Family plan (up to 5 devices): $8/month or $65/year

13 Moon Refusal:        Free — ingredient database is always free
                        $3/month for AI analysis, alerts, and saved profiles

13 Moon Call Guardian:  $5/month or $39/year

13 Moon Ledger:         $6/month or $49/year

13 Moon Film Editor:    $8/month or $65/year

13 Moon EzQuill:        $5/month or $39/year
```

**Town Square Press take rate explained:**
The 15% cut on sales is in line with what the market expects (Gumroad is 10%, Substack is 10%, Amazon KDP takes 30–65%). Writers who pay the $5/month flat fee keep 100% and the math works out at roughly $33/month in sales. Writers selling more than that should pay the flat fee. The Forge does the math for them and tells them which plan saves them money.

---

### The Honest Revenue Math

Forge alone at $19/month:
- 100 subscribers = $1,900/month
- 500 subscribers = $9,500/month

Academy alone at $9/month:
- 100 subscribers = $900/month
- 500 subscribers = $4,500/month

Town Square membership at $14/month:
- 100 subscribers = $1,400/month
- 500 subscribers = $7,000/month

Combined at 500 users across products: realistic monthly revenue of $15,000–$25,000 depending on mix. You don't need millions of users. You need the right people who genuinely value what you've built.

---

### Self-Hosting Support

A one-time fee or small annual fee for the self-hosting kit — pre-configured Docker setup, install script, detailed docs, email support. Real value for the Sovereign who wants independence without the setup complexity.

---

### Dual Licensing (Future)

Enterprise deal: pay for a commercial license that allows private modifications. This is a downstream revenue stream once the product has enough users that companies start building on it.

---

## The Growth Engine — Beyond Day 30

The launch strategy covers the first 10 people and the first 30 days. This section covers what comes after.

---

### Month 2–3: From 10 to 50

The first 10 users are hand-picked. The next 40 come from them.

Every first user gets asked one question: *"Is there one person you know who should see this?"* Not "share this with everyone you know." One person. Specific. This is how word-of-mouth works — not broadcasting, but one honest recommendation at a time.

Simultaneously:
- The first Forge Letter goes out. Written like a personal dispatch, not a newsletter. What got built this month. What the moon cycle meant for the work. One thing the Forge learned from its first real users.
- The first Open Build gets published with permission from a user. Not a tutorial. A real record of how something got made.
- The philosophy page and the README are the content strategy. Written once, they work forever.

---

### Month 4–6: From 50 to 200

By this point the product has real testimonials — people who built real things and can say so honestly.

Three channels:
1. **The 13 Moon community** — people who already live by this calendar are philosophically pre-sold. Find the forums, Telegram groups, Mastodon accounts where this community lives. Not to pitch. To be present. To share what's being built. To let them find it.
2. **Frustrated developer communities** — Hacker News, Indie Hackers, small forums where people talk honestly about what's wrong with existing tools. One well-written post about sovereignty and who the Forge is for will find the right people.
3. **The gallery** — every real project built in the Forge is a proof point. As the gallery fills up, it becomes the best marketing content that exists.

---

### Month 7–12: From 200 to 1,000

The growth engine at this stage is product quality + word of mouth + search.

**SEO through genuine content:**
The Forge Letter and Open Builds create real content that search engines index. Not "10 best AI coding tools" SEO content — actual writing about sovereignty, 13 Moon philosophy, and honest tool-building. The people searching for this specific thing are exactly the people who will pay.

**The Academy as a funnel:**
Free Academy lessons pull in people who would never think to look for an AI builder. A person who comes for free coding classes and finishes Grade 5 is now someone who might want to build something real. The Academy converts learners into builders. Every Academy graduate is a potential Forge subscriber.

**Referral without a referral program:**
No gimmicks. No "give $5, get $5." Just: when someone builds something they're proud of, make it easy for them to say where it came from. A small "built with the Forge" link on deployed projects, opt-in, that links to the gallery and the homepage.

---

## Data Privacy Architecture — Proving the Promise

The sovereignty claim needs to be verifiable, not just stated:

- **Architecture diagram** publicly showing exactly what data flows where, what talks to the internet, what stays local
- **No telemetry by default** — if analytics exist, they're opt-in and clearly documented
- **Reproducible builds** — anyone can take the source, build it, and get an identical result. This proves the published image matches the public code.
- **Plain-English privacy page** — one page, no legal obfuscation: what the Forge sees, what it stores, what leaves your server, what never does

---

## The Legal Layer

**Legal entity:** Sovereign Digital LLC

The legal layer isn't just paperwork — it's part of the promise. The Forge makes strong claims about ownership, privacy, and sovereignty. Those claims need to be backed by actual legal documents that say the same thing.

**What needs to be in place:**

**Terms of Service — plain English, not lawyer theater.**
The ToS should say exactly what the Forge promises: your code is yours, we don't train on it, you can export everything, here's what happens if you cancel, here's what happens if we shut down. Written so that a non-lawyer can read it and understand it in five minutes.

**Privacy Policy — one page, honest.**
What data we collect, what we do with it, what we don't do with it, who can see it, and how to get it all deleted. No 40-page document with hidden carve-outs.

**Sensitive app considerations:**
Some apps in the Town Square touch territory with real legal implications:

- *13 Moon Ledger* — handles financial data. Not a licensed financial advisor. Needs a clear disclaimer that this is a budgeting tool, not financial advice, and that it doesn't store banking credentials.
- *13 Moon Refusal* — handles health and ingredient data. Not a medical tool. Clear disclaimer. Information comes from publicly available sources. Not a substitute for professional medical advice.
- *13 Moon Call Guardian* — intercepts and filters calls. Call recording laws vary by state and country. The app needs clear guidance on what it does and doesn't record and what the user is responsible for.
- *Town Square Press* and *Town Square TV* — user-generated content platforms. Need clear content policies: what's allowed, what's not, and how moderation works. The philosophy is free speech — but there's a legal difference between hosting speech and endorsing it.

**Operating state:** Sovereign Digital LLC. Know your state's requirements for annual reports, registered agents, and what operating across state lines means for your tax obligations.

**AGPL compliance:** The open source license is already applied. The legal obligation that comes with it — when someone asks for the source of a modification — needs to be easy to fulfill. The Forgejo repo being public satisfies this for the core product.

---

## When Things Break — Resilience Planning

The Forge talks about sovereignty. It needs to practice what it preaches. Here is an honest accounting of what could go wrong and what we do about it.

---

**If the Hetzner server goes down:**
The server runs Docker with Traefik. If the server goes down, the site goes down. Single point of failure — honest about that.

The plan: periodic automated backups of the database and the Docker volumes to an off-server location (Hetzner's own snapshot service or an S3-compatible object store). Recovery means spinning up a new VPS and restoring from the last backup. Target recovery time: under 2 hours for a serious failure. The backup scripts need to exist and be tested before they're needed.

**If Clerk (authentication) changes pricing or shuts down:**
Clerk handles auth for all 12 apps. If Clerk disappears or triples their price, we have a problem.

The plan: auth is already isolated in a shared library (`lib/auth`). Clerk is integrated there. If we ever need to swap it out, the swap happens in one place and every app gets the fix. In the meantime: document user data exports from Clerk and run them monthly so we always have the user list.

**If the AI provider goes down or becomes too expensive:**
The Forge's AI calls go through a provider (currently Moon API). If that provider has an outage, AI features go down.

The plan: the AI integration is behind an abstraction layer. The app doesn't call OpenAI directly — it calls a service that calls OpenAI. Swapping providers means changing one config, not rewriting the product. For extended outages: graceful degradation messaging. The Forge tells users honestly that AI is temporarily unavailable and what they can still do without it.

**If a key dependency stops being maintained:**
Node packages, libraries, frameworks — any of them can be abandoned.

The plan: pin versions, run audits, update deliberately. The monorepo structure means updates happen once and apply everywhere. No app quietly running on an unmaintained package version.

**If you get sick or can't work for an extended period:**
The codebase is open source. The documentation in this blueprint and in the codebase itself means someone who understands the philosophy can continue the work. This is not a one-person secret — it's a documented, principled system.

---

## Accessibility — Built In, Not Bolted On

The Forge is for the farmer, the tradesperson, the grandma with a napkin idea. These are not people who are guaranteed to be young, sighted, able-bodied, or using a high-end device. Accessibility is not a feature to add later. It is part of the promise that this tool is for everyone.

**The commitments:**

**Screen reader compatibility.** Every interactive element — buttons, forms, navigation, modals — is properly labeled. Users who navigate by screen reader (NVDA, VoiceOver, JAWS) can use every part of the Forge.

**Keyboard navigation.** Everything that can be done with a mouse can be done with a keyboard. Tab order makes sense. Focus states are visible.

**Color contrast.** Text and background colors pass WCAG AA standards at minimum. The orange-on-dark palette is checked and passing before it ships.

**Text sizing.** The Forge doesn't break when a user has their browser font size set to large. Layouts use relative units so the page scales with the user's settings.

**No motion required.** Animations and transitions are off when the user has "prefer reduced motion" enabled. Some people get migraines from moving UI elements. Respect that.

**Mobile first.** A farmer checking the Forge between jobs on their phone should have the same quality experience as a developer on a wide monitor.

**Plain language.** The Forge is already committed to this in its brand voice. It applies to error messages, onboarding, and every piece of text a user encounters. If a 13-year-old or a 70-year-old can't understand it, rewrite it.

---

## Community Building — The First 10 and Beyond

**The first 10 people who need this most:**
- Developers who've had code stolen or trained on without consent
- Creators who've been deplatformed and lost everything
- People building things that don't fit the mainstream (spiritual, unconventional, sovereign)
- The 13 Moon community — people who live by this calendar are exactly the kind of people who want tools that respect their philosophy

**Where they live:**
Small forums, Telegram groups, niche Discord servers, Mastodon, independent blogs. Not Twitter first, not Product Hunt first. Find the people who are already frustrated, already looking, already philosophically aligned. They become the first advocates. The broader world finds out through them.

**What the community is NOT:**
A Discord server with support channels and feature-request threads. That creates a customer service burden and a social media obligation. The community is the gallery, the Forge Letter, the open builds, and the reputation that grows from real people saying honest things.

---

## What We're Not Building

- A hosting company that holds your stuff
- A tool that trains on your code
- A platform that creates dependency
- A business that needs millions of users to survive
- Anything that requires you to trust us with something you can't afford to lose
- A Discord server we have to maintain
- A product that apologizes for having a philosophy

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

The Forge is one building in a larger town. The 13 Moon Forge and all 12 apps are part of one family: **People's Town Square**. Each app has its own domain, its own identity, its own purpose — but they share the same soul, the same calendar, the same users, and the same infrastructure.

This is not a collection of separate products. It is one interconnected world with many front doors.

**What this means for users:**
- Create an account at any app in the Town Square — you have an account at all of them. Instantly. No re-registering.
- Log in once, stay logged in everywhere across every domain.
- The moon phase is the same across every app. The rhythm is shared.
- Your profile, your history, your preferences follow you from app to app.
- One subscription unlocks paid features across the entire Town Square.
- If one app does something, another app can know about it.

**What this means for the builder:**
- Change the shared design once — every app updates.
- Change the moon calendar logic once — every app reflects it.
- Fix a bug in the authentication layer once — every app is fixed.
- Deploy everything with one command.

---

## Unified Identity — One Account, Every Domain

The auth system (Clerk) already supports this. It is called multi-domain SSO and it works across completely separate domains.

**How it works for a user:**
1. Someone lands on any app in the Town Square
2. They create a free account
3. That account is instantly valid at all 12 domains — they don't know or care how
4. They visit another app — they're already logged in
5. They upgrade to a paid plan on any app — that upgrade unlocks paid features on every app

**How it works technically:**
Clerk supports satellite domains — every app points at the same Clerk instance. One user record. One session. Works across any number of domains. Already built into the auth layer.

---

## The 12 Apps — The Full Family

Each one is a tool for people who work with their hands, think with their own minds, and are done waiting for permission.

---

### 1. The Forge — `13moonforge.ai`
**Status: Live**
AI-powered builder for the small creator. You have something to make. Let's make it. The front door to the whole family.

---

### 2. TPTS — People's Town Square
Like Facebook, but for the farmer, the tradesperson, the working man and woman. A way to advertise yourself and find others — the blacksmith, the beekeeper, the mechanic, the herbalist. Voluntarist. Anarchist in the best sense. No algorithm deciding who gets seen. For dirty hands and clean ones alike. Find people with farms. Start your business. Get visible.

---

### 3. Town Square Press TV
For the independent journalist and the podcaster. Like YouTube before Google bought it and turned it into a filter. Free speech. Real speech. If you have something to say and you're willing to put your name on it, you have a platform here. No demonetization for opinions. No shadow banning. No terms of service written by lawyers to protect advertisers.

---

### 4. Town Square Press
For the independent writer. Publish your e-book, your comic book, your poetry, your manifesto, your research. Everything having to do with the written word. You wrote it, you own it, you set the price. We take 15% on sales — you keep 85%. Pay $5/month flat and keep 100%.

---

### 5. 13 Moon Inventors Workshop
Helping us get our freedom back. The old inventions that got locked away. The new ones that never got funding. The ideas that need a place to breathe. Describe what you want to build and the Workshop helps you figure out how to actually build it — sourcing parts, drawing diagrams, finding precedents, connecting you with others working on similar problems.

---

### 6. Town Square TV
For the independent filmmaker. Takes the art back from Hollywood. Films about real things that happened — the USS Liberty, the things that never made the news. Also: drama, comedy, documentary, short film — anything made outside the machine. Find a filmmaker. Fund a film. Watch something true. Filmmakers keep 70%.

---

### 7. 13 Moon Antivirus
A real antivirus at a fraction of Norton's price. Built for people who want their computer protected without being nickeled and dimed. You know what you're getting and why. $4/month. Family plan $8/month.

---

### 8. 13 Moon Refusal
Know what you're putting in your body and in your home. Every ingredient. Every additive. Every chemical behind a name you can't pronounce. When people know, they refuse. When they refuse, companies change. This is the tool that starts that chain.

---

### 9. 13 Moon Call Guardian
Protects you from scammers, spam callers, and anyone trying to waste your time. Simple, effective, yours. $5/month.

---

### 10. 13 Moon Ledger
Financial freedom for real people. Budget. Track. Fix your credit. Get out of debt. Set your goals and work toward them with a tool that tells you the truth about where you stand and what it takes to get where you want to go. Not financial advice — honest numbers.

---

### 11. 13 Moon Film Editor
Built originally for personal use. Became something worth sharing. A video editing tool that does what you need without the subscription price of Adobe or the learning curve of Premiere. Independent filmmakers, podcasters, content creators — yours.

---

### 12. 13 Moon EzQuill
Like DocuSign, but smarter and cheaper. Saves your most repeated personal information and fills it in automatically on any document — name, address, signature, all of it. You review. You sign where indicated. Everything else is done. Seconds, not minutes.

---

## The Monorepo — How the Web Is Built

Everything lives in one repository. One home. One deployment pipeline.

```
people's-town-square/
├── artifacts/                    ← Every app lives here
│   ├── the-forge/                ← Live at 13moonforge.ai
│   ├── forge-mobile/             ← Mobile app, running
│   ├── api-server/               ← Central nervous system, running
│   ├── tpts/                     ← People's Town Square (social)
│   ├── press-tv/                 ← Town Square Press TV
│   ├── press/                    ← Town Square Press (publishing)
│   ├── inventors-workshop/       ← 13 Moon Inventors Workshop
│   ├── town-square-tv/           ← Town Square TV (film)
│   ├── antivirus/                ← 13 Moon Antivirus
│   ├── refusal/                  ← 13 Moon Refusal
│   ├── call-guardian/            ← 13 Moon Call Guardian
│   ├── ledger/                   ← 13 Moon Ledger
│   ├── film-editor/              ← 13 Moon Film Editor
│   └── ezquill/                  ← 13 Moon EzQuill
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
All 12 apps talk to one API. They don't each have their own backend. They share one. When the API learns something new, every app benefits.

**How "change everything at once" actually works:**
1. You change something in `lib/ui/` — the shared button color, the shared header
2. You push to Forgejo
3. The deploy webhook fires and rebuilds the Docker containers
4. Every app is live with the new change
5. Done. One push.

**How bringing in the 12 existing apps works:**
1. Copy the code from its existing home into the monorepo under `artifacts/`
2. Identify what it shares with other apps (auth, design, moon logic) and move that into `lib/`
3. Add a Dockerfile (same pattern as the Forge)
4. Add a subdomain in Traefik
5. It's live on the Hetzner server and connected to everything else

The first app takes the longest because we're establishing the pattern. The second takes half the time. By the fifth, it's routine.

---

## The Launch Strategy

### The First 30 Days

**Goal: 10 real people having a real experience.**
Not followers. Not signups. Not traffic. 10 people who built something real and would be genuinely sad if the Forge disappeared tomorrow.

**Week 1 — The Quiet Open**
Don't announce. Turn off the "coming soon" gate. Let the Forge be findable. Anyone who arrives gets the real experience. Fix whatever breaks in real time.

**Week 2 — The First Conversations**
Go find people personally. In Telegram groups, Discord servers, Mastodon, forums where frustrated developers and creators already talk. Don't pitch. Participate. When the moment is right: "I built something that might be relevant — here's what it does and why."

Specifically:
- 13 Moon / Mayan calendar communities (philosophically pre-sold)
- Privacy-focused developer spaces (Mastodon, Lemmy, Hacker News)
- Indie maker spaces (selectively, not as a launch announcement)
- Small creator communities tired of the big platforms

**Week 3 — The First Piece of Writing**
Write one honest post: "Why I built this and who it's for." Not a launch announcement. A genuine piece of writing about sovereignty, creative work, and the philosophy behind the Forge. Put it on the site. Share it once in each community where you've been participating.

**Week 4 — Listen Hard**
Reach out to each of the first 10 users personally. Ask one question: "What were you trying to make when you came to the Forge, and did it work?" The answer shapes everything next.

---

### Month 2–6: From 10 to 200

- Every first user gets asked: "Is there one person you know who should see this?"
- The first Forge Letter goes out — a personal dispatch, not a newsletter
- The first Open Build gets published with permission
- Consistent presence in aligned communities without pitching
- The gallery fills with real work — real proof

---

### Month 7–12: From 200 to 1,000

- SEO through genuine writing — not keyword stuffing, real ideas that the right people search for
- Academy free lessons pull in learners who convert to builders
- Opt-in "built with the Forge" attribution on deployed projects links back to the gallery
- Word of mouth compounds as the product proves itself

---

### What Success Looks Like at Year One

Not a valuation. Not a funding round. Not a Product Hunt ranking.

500 people who pay for something in the Town Square. A gallery full of real projects. An Academy with real graduates. A Forge Letter that people actually read. A codebase that anyone can run themselves. And a reputation that the Forge does exactly what it says it does.

That's the foundation everything else is built on.

---

## Self-Host Feature Roadmap — The Infrastructure Layer

These are the features that make the Forge the best place to own and run your own stack. They get built in order of what makes the biggest difference to the person who's already hosting.

---

### Per-App Monitoring Gauges *(next to build)*

Every customer who deploys an app through Forge should be able to see live health for their own apps — not the server, their containers.

**What it looks like:**
Go to App Hub → click any deployed app → see arc gauges showing CPU %, RAM %, Uptime, and last deploy timestamp. Green/yellow/red signals using the same threshold logic as the admin gauges on the Monitor page. Optional restart button for apps they own.

**How it works:**
Pull `status` and `server_status` from the Coolify API per service UUID. Pair that with Docker stats from the server resource endpoint. Each user's deployed service UUIDs are already partially tracked in the DB — wire them to a new route `GET /api/apps/:uuid/health` that returns `{ cpu, ram, uptime, status }`. Reuse the existing arc gauge component from App Health — the same visual, applied to their app instead of the whole server.

Admin sees all apps. Regular users see only their own.

---

### Secrets Vault → Coolify Env Sync

When a user stores a key in the Forge Secrets Vault, offer a one-click "push to deployed app" that injects it as a Coolify env var on their service — and triggers a redeploy. Eliminates re-pasting API keys every time you spin up a new service. This is the bridge between "I have a key" and "my deployed app can use it" with zero copy-paste friction.

---

### In-App App Push (Guided Migration Flow)

Right now getting an app from Replit (or anywhere) to Forgejo + Coolify takes 5 manual shell commands that the user has to run themselves. That's fine for technical users. Not fine for The Dreamer.

The guided flow:
1. User pastes their repo URL or picks a Replit project
2. Forge creates the Forgejo repo (API already built)
3. Forge gives them the exact 3 shell commands for their specific project — pre-filled, copy-ready
4. Forge detects the stack from the Forgejo contents (Node, Python, Docker, etc.)
5. Forge proposes a Coolify build config — user confirms or edits
6. Deploy → domain → env vars — all from inside Forge

Every step they currently do manually becomes a guided screen with one action.

---

### Multi-App Dashboard

A single page showing every app a customer has deployed — at a glance. Status badge (running / stopped / errored), domain name as a clickable link, last deployed timestamp, and quick actions: Redeploy, Stop, View Logs. The person who runs 4 apps shouldn't have to open Coolify directly to get a pulse on all of them.

---

### Log Viewer (Per App)

Pull container logs from Coolify and stream them inside Forge. Customer sees their app's stdout/stderr in real time without leaving Forge or logging into the VPS. Especially useful right after a deploy — the log view opens automatically and shows what happened.

---

### Forge CLI *(stretch goal)*

A terminal tool — `forge deploy`, `forge logs`, `forge env set`, `forge status` — that wraps the Forge API so power users can manage their whole stack from their own machine. The Builder persona doesn't want to open a browser for this. They want one command from their terminal to know if their app is up.

---

## The Closing Thought

The name "Forge" is ancient. Nobody owns that word. A blacksmith's forge is the simplest possible thing — heat, iron, hammer, and someone who knows what they're doing. You bring raw material. You leave with something made.

That's this. That's all this is.

The platform economy took the forge model — the workshop, the tool, the craft — and turned it into a subscription to someone else's infrastructure that you rent forever and never own. The Forge takes it back. The platform age is ending. The people who build their own things are going to be the ones who survive it.

Build something. Own it. Take it home.

---

*Sovereign Digital LLC — 13moonforge.ai*
