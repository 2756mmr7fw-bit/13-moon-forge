import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  MapPin, Copy, CheckCircle2, ExternalLink, ChevronRight, Tv, Newspaper,
  GraduationCap, Radio, Building2, CalendarDays, Search, Users, Save,
  AlertTriangle, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AppFamily } from "@/components/app-family";

const CITY_KEY = "forge.localPress.city";
const STATE_KEY = "forge.localPress.state";

type OutletKind = {
  id: string;
  label: string;
  icon: typeof Tv;
  what: string;
  searchPatterns: (city: string, state: string) => { label: string; query: string }[];
  pitchAngle: string;
  contactNote: string;
};

const OUTLET_KINDS: OutletKind[] = [
  {
    id: "tv",
    label: "TV affiliates (NBC / ABC / CBS / FOX)",
    icon: Tv,
    what: "Every metro has 3–4 local TV affiliates. They all run morning shows starved for human-interest stories, especially 'local founder builds X' segments. They love faces on camera.",
    searchPatterns: (c, s) => [
      { label: "Find NBC affiliate news tip line", query: `${c} ${s} NBC affiliate news tip` },
      { label: "Find ABC affiliate news tip line", query: `${c} ${s} ABC affiliate news tip` },
      { label: "Find CBS affiliate news tip line", query: `${c} ${s} CBS affiliate news tip` },
      { label: "Find FOX affiliate news tip line", query: `${c} ${s} FOX affiliate news tip` },
    ],
    pitchAngle:
      "Local founder, local story. Lead with 'I'm a [city] resident who built a no-algorithm social platform' or 'I'm a [city] dev who built a self-hostable AI platform.' TV producers care about the location hook first, the product second.",
    contactNote:
      "Use the 'news tip' or 'story idea' contact form on each affiliate's website. They're checked daily by the morning show producer. Don't pitch the anchors directly.",
  },
  {
    id: "daily",
    label: "Daily newspaper",
    icon: Newspaper,
    what: "Your city's main daily paper has a business or tech reporter assigned to local startups. Find that person. Email them directly.",
    searchPatterns: (c, s) => [
      { label: "Find the daily paper's business desk", query: `${c} ${s} daily newspaper business reporter email` },
      { label: "Find the tech beat reporter", query: `${c} ${s} newspaper technology reporter` },
      { label: "Find any 'tips' / 'news desk' email", query: `${c} ${s} newspaper news tips email` },
    ],
    pitchAngle:
      "Frame as a 'local startup' or 'local business owner' story — newspapers love covering local people doing interesting work, even if your audience is national. The 'made in [city]' angle is what gets you the column inches.",
    contactNote:
      "Email the specific reporter, not a general inbox. Use the format firstname.lastname@papername.com if no email is published — it works 80% of the time. Follow up once after 5 business days, then stop.",
  },
  {
    id: "alt-weekly",
    label: "Alt-weekly / independent paper",
    icon: Radio,
    what: "Every metro has an alt-weekly (think Village Voice descendants) that covers the local culture / indie scene. They love 'rebel against Big Tech' stories — TPTS is tailor-made for them.",
    searchPatterns: (c, s) => [
      { label: "Find the alt-weekly", query: `${c} ${s} alt weekly newspaper` },
      { label: "Find the alt-weekly's tech / culture desk", query: `${c} ${s} alt weekly tech editor` },
    ],
    pitchAngle:
      "Lean into TPTS over Forge here. 'Local guy builds anti-algorithm social network' is exactly the David-vs-Goliath story alt-weeklies live for. Mention the sovereignty/anti-platform angle in the first paragraph.",
    contactNote:
      "Alt-weeklies have small staff. The editor often writes too. Be ready for them to want a quick phone call within 24 hours of replying.",
  },
  {
    id: "campus",
    label: "University & college papers",
    icon: GraduationCap,
    what: "Student newspapers at colleges within 60 miles of you. Student journalists are looking for clips, your story is easy to write, and college papers index well on Google for years.",
    searchPatterns: (c, s) => [
      { label: "Find colleges near here", query: `colleges and universities near ${c} ${s}` },
      { label: "Find a specific paper", query: `[college name] student newspaper tech editor` },
      { label: "Find the journalism department", query: `[college name] journalism department contact` },
    ],
    pitchAngle:
      "Pitch to the CS department's student paper or the journalism school's paper. 'Solo dev built X' is a story a student journalist can write in an afternoon — make it easy for them.",
    contactNote:
      "Student editors rotate every semester. Look for an editor who started this academic year — they're hungriest for clips. Offer to do a 15-minute call.",
  },
  {
    id: "neighborhood",
    label: "Neighborhood blogs & local newsletters",
    icon: Users,
    what: "Many neighborhoods have a hyperlocal blog or Substack run by one person who knows everybody. These are the highest-converting placements you can get — readers actually trust them.",
    searchPatterns: (c, s) => [
      { label: "Find neighborhood blogs", query: `${c} ${s} neighborhood blog` },
      { label: "Find a local Substack", query: `${c} ${s} substack local news` },
      { label: "Find the local subreddit", query: `reddit ${c} ${s}` },
    ],
    pitchAngle:
      "Lead with 'I live in [neighborhood/city] and I built X.' These writers cover their neighbors — the local identity is doing 80% of the work. Keep it short and human.",
    contactNote:
      "Reach out via whatever contact method they list — email, Substack DM, even Twitter. They check messages. Reply to 1–2 of their recent posts before you pitch.",
  },
  {
    id: "chamber",
    label: "Chambers of commerce & business associations",
    icon: Building2,
    what: "Local Chamber of Commerce + downtown business association + tech meetup group. They publish member spotlights, newsletters, and event calendars. Free placements if you're a member.",
    searchPatterns: (c, s) => [
      { label: "Find the Chamber of Commerce", query: `${c} ${s} chamber of commerce member spotlight` },
      { label: "Find the downtown business association", query: `${c} ${s} downtown business association` },
      { label: "Find tech meetups", query: `${c} ${s} tech meetup group founders` },
    ],
    pitchAngle:
      "Pitch a 'member spotlight' or 'tech founder feature.' Chambers love showcasing local entrepreneurs. Some charge $50/year membership — usually worth it for the directory link + newsletter mentions.",
    contactNote:
      "Most chambers have a Communications or Membership Director. That's your contact. Email and follow up by phone — chamber people answer phones.",
  },
  {
    id: "calendars",
    label: "Community calendars & event aggregators",
    icon: CalendarDays,
    what: "When you do a launch event (in-person or virtual demo), every city has 5–10 community calendar sites that will list it for free. They drive surprising traffic.",
    searchPatterns: (c, s) => [
      { label: "Find general event calendars", query: `${c} ${s} community events calendar submit` },
      { label: "Find the library's event calendar", query: `${c} public library events calendar submit` },
      { label: "Find the city's official calendar", query: `${c} ${s} official city events calendar` },
    ],
    pitchAngle:
      "Post a 'launch demo' or 'office hours for indie devs' event. Free, low-effort listing — even if 2 people show up in person, the SEO benefit of being on these calendars is real.",
    contactNote:
      "Most calendars have a self-service 'Submit Event' form. Use it. Include a photo of yourself + your logo + a 1-paragraph description.",
  },
];

const NEXTDOOR_PLAYBOOK = [
  {
    step: 1,
    title: "Verify your address first",
    body: "Nextdoor only lets verified neighbors post in your neighborhood. Get verified before doing anything else (postcard or instant verification — whichever they offer your area).",
  },
  {
    step: 2,
    title: "Spend a week being a normal neighbor",
    body: "Reply helpfully to 5+ posts in your neighborhood feed before you post anything about your project. Recommend a plumber, answer a 'lost dog' post, weigh in on a local zoning thread. This builds trust.",
  },
  {
    step: 3,
    title: "Post the founder story — NOT a product link",
    body: "Title: 'Neighbor here, finally launched something I've been working on for [N] months.' Body: explain what you built, why you built it, and ask if anyone in the neighborhood wants to try it. Include the link at the END of the post, not the beginning.",
  },
  {
    step: 4,
    title: "Reply to every single comment within 2 hours",
    body: "Nextdoor's algorithm boosts posts that get high reply density quickly. Even if it's just 'Thanks for checking it out!' — reply. Aim for 20+ comment exchanges in the first hour.",
  },
  {
    step: 5,
    title: "Don't repost. Don't cross-post to other neighborhoods.",
    body: "Nextdoor will flag and remove cross-posts. One post per launch, in your own neighborhood. If it works there, do a different post next month with different framing.",
  },
];

export default function LocalPressPage() {
  const { toast } = useToast();
  const [city, setCity] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [savedCity, setSavedCity] = useState("");
  const [savedState, setSavedState] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load saved city/state on mount
  useEffect(() => {
    try {
      const c = localStorage.getItem(CITY_KEY) ?? "";
      const s = localStorage.getItem(STATE_KEY) ?? "";
      setCity(c);
      setStateAbbr(s);
      setSavedCity(c);
      setSavedState(s);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  function saveCity() {
    try {
      localStorage.setItem(CITY_KEY, city.trim());
      localStorage.setItem(STATE_KEY, stateAbbr.trim());
      setSavedCity(city.trim());
      setSavedState(stateAbbr.trim());
      toast({ title: "Saved", description: `Local press is now tailored for ${city.trim()}.` });
    } catch {
      toast({
        title: "Couldn't save",
        description: "Your browser blocked local storage. Bookmark this page with your city in the URL.",
        variant: "destructive",
      });
    }
  }

  async function copy(text: string, id: string) {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast({ title: "Copied" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Select the text and copy it manually.",
        variant: "destructive",
      });
    }
  }

  const hasCity = savedCity.length > 0;
  const displayLoc = savedState ? `${savedCity}, ${savedState}` : savedCity;

  // Build the three pitch templates with the city interpolated
  const pitches = useMemo(() => {
    const loc = hasCity ? displayLoc : "[your city]";
    return [
      {
        id: "pitch-founder",
        title: "Pitch 1 — Local Founder Story",
        bestFor: "Daily papers, alt-weeklies, neighborhood blogs",
        subject: `${loc} resident built a self-hostable AI dev platform solo — story idea`,
        body: `Hi [Reporter Name],

I'm Ezekiel Evans, a ${loc} resident who's spent the past [N] months building 13 Moon Forge — a self-hostable AI development platform — completely solo, with no funding and no team.

Why I think this might be a fit for [Publication]: there's a story here about local builders rejecting the Big Tech rent model. I run everything on infrastructure I own, charge directly without giving Apple, Google, or platform middlemen a cut, and live and work right here in ${loc}.

Happy to do a 15–20 minute call this week or next, in-person if you're nearby. I can also email over a short press kit if it helps.

Thanks for considering it,
Ezekiel Evans
13moonforge.ai · ezekiel@thepeoplestownsq.com`,
        notes: "Use this when you want the 'local guy doing interesting work' frame. Best for daily papers and neighborhood blogs.",
      },
      {
        id: "pitch-rebel",
        title: "Pitch 2 — Anti-Algorithm / TPTS Angle",
        bestFor: "Alt-weeklies, indie culture publications, university papers",
        subject: `Local builder is fighting algorithm-driven social media from his ${loc} office`,
        body: `Hi [Reporter Name],

Quick pitch — I'm a ${loc}-based solo developer building The People's Town Square, a social platform with no algorithm. Chronological feed, community-set rules, no risk of deplatforming by a corporate moderation team.

I started it after watching too many creators lose years of work to a single content moderation decision. The story isn't 'another social app' — it's 'what does it look like when a single person, working out of ${loc}, builds the alternative to the platforms everyone complains about but no one leaves.'

If [Publication] covers tech, culture, or local makers, I'd love to talk. I can be on the phone within an hour or in person within a day.

Best,
Ezekiel Evans
thepeoplestownsq.com · 13moonforge.ai`,
        notes: "Lean into the David-vs-Goliath narrative. Strongest with alt-weeklies and student journalists looking for clips.",
      },
      {
        id: "pitch-tv",
        title: "Pitch 3 — TV Morning Show Hook",
        bestFor: "Local NBC / ABC / CBS / FOX affiliates",
        subject: `Morning show segment idea: ${loc} dev builds AI platform with no Big Tech middleman`,
        body: `Hi [Producer Name],

I have a morning show segment idea you might like.

I'm Ezekiel Evans, a ${loc} resident and solo developer. I've spent the past [N] months building 13 Moon Forge — a development platform that runs on your own server instead of Big Tech infrastructure. Just me. No team, no funding.

The segment writes itself: 'Local builder takes on Silicon Valley from his ${loc} home office.' Visuals are easy — I can show the platform working on a laptop, show what self-hosting actually looks like, and talk about why someone in ${loc} chose to build this instead of work for a tech giant.

I'm available for an in-studio segment, a live remote, or a pre-recorded sit-down. Whatever works for your show.

Thanks,
Ezekiel Evans
13moonforge.ai · ezekiel@thepeoplestownsq.com`,
        notes: "TV producers care about visuals + the local hook. Lead with both. Mention you're available — they need flexible guests.",
      },
    ];
  }, [hasCity, displayLoc]);

  // Press kit one-pager
  const pressKit = useMemo(() => {
    const loc = hasCity ? displayLoc : "[your city]";
    return `PRESS KIT — 13 MOON FORGE & THE PEOPLE'S TOWN SQUARE
Founder: Ezekiel Evans · Based in ${loc}

THE 30-SECOND VERSION
Ezekiel Evans is a solo developer based in ${loc} building two flagship platforms:
• 13 Moon Forge — a self-hostable AI development platform (13moonforge.ai)
• The People's Town Square — an algorithm-free social platform (thepeoplestownsq.com)
Both are designed around the same idea: software you own, on infrastructure you control, with no Big Tech middlemen.

WHY THIS IS A STORY
• Solo founder, no funding, no team — built and operates everything personally
• Self-hosted philosophy: users own their data, infrastructure, and deployment
• Building from ${loc}, not Silicon Valley
• Five apps shipped: The Forge, The People's Town Square, EzQuill, 13 Moon Film Editor, and a mobile companion
• Explicitly does not use X/Twitter — distribution is via Substack, Dev.to, Hashnode, Medium, LinkedIn, Flipboard, Mastodon, Bluesky

THREE QUOTES YOU CAN USE
1. "I built this because I was tired of renting my dev environment from companies that could turn off my access overnight. Owning my stack is non-negotiable."
2. "The People's Town Square has no algorithm because algorithms decide what you're allowed to see. That should be a person's choice, not a platform's."
3. "Big Tech sold us the idea that we couldn't host our own software. That was always a lie. I'm building the proof."

CONTACT
Ezekiel Evans
ezekiel@thepeoplestownsq.com
13moonforge.ai · thepeoplestownsq.com
Available for: phone interviews, in-studio segments, written quotes, on-record commentary, hands-on demos.

Last updated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
`;
  }, [hasCity, displayLoc]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <AppFamily />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/distribution-plan" className="hover:text-slate-200">Distribution Plan</Link>
            <span>/</span>
            <span>Local Press</span>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <MapPin className="h-7 w-7 text-rose-400" />
            Local & Community Press
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Every editor of every local paper is starved for stories. A one-person founder building a "no-algorithm town square" is exactly the story they want. Enter your city below and this page tailors the newsroom map, three pitch templates, and a press kit one-pager to that location.
          </p>
        </div>

        {/* City input */}
        <div className="mb-8 rounded-lg border border-rose-500/30 bg-rose-500/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-rose-300">
            <MapPin className="h-4 w-4" />
            Your nearest city
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <Input
              placeholder="City (e.g. Austin)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-slate-900/60 border-slate-800 text-slate-100"
              data-testid="input-local-press-city"
            />
            <Input
              placeholder="State (e.g. TX)"
              value={stateAbbr}
              onChange={(e) => setStateAbbr(e.target.value.toUpperCase().slice(0, 2))}
              className="bg-slate-900/60 border-slate-800 text-slate-100"
              maxLength={2}
              data-testid="input-local-press-state"
            />
            <Button
              onClick={saveCity}
              disabled={!city.trim()}
              className="bg-rose-500 hover:bg-rose-600 text-white"
              data-testid="button-save-local-press-city"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {hasCity ? "Update" : "Save"}
            </Button>
          </div>
          {hasCity && (
            <p className="mt-3 text-xs text-slate-400">
              Tailoring for <span className="font-semibold text-slate-200">{displayLoc}</span>. Stored locally in your browser — re-enter it on other devices.
            </p>
          )}
          {!hasCity && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Enter your city to unlock tailored pitches and search links. The page works without it, but you'll see placeholder text.
            </p>
          )}
        </div>

        {/* Newsroom map */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Search className="h-5 w-5 text-cyan-400" />
            Newsroom map
            {hasCity && <span className="text-sm font-normal text-slate-400">for {displayLoc}</span>}
          </h2>

          <div className="space-y-4">
            {OUTLET_KINDS.map((kind) => {
              const Icon = kind.icon;
              const c = hasCity ? savedCity : "[city]";
              const s = hasCity ? savedState : "";
              return (
                <article key={kind.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="rounded-lg bg-slate-800/60 p-2">
                      <Icon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-100">{kind.label}</h3>
                      <p className="mt-1 text-sm text-slate-400">{kind.what}</p>
                    </div>
                  </div>

                  <div className="mb-3 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      <Lightbulb className="h-3 w-3" />
                      Pitch angle
                    </div>
                    <p className="text-sm text-slate-200">{kind.pitchAngle}</p>
                  </div>

                  <div className="mb-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Find them
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {kind.searchPatterns(c, s).map((p, i) => (
                        <a
                          key={i}
                          href={hasCity ? `https://www.google.com/search?q=${encodeURIComponent(p.query)}` : "#"}
                          target={hasCity ? "_blank" : undefined}
                          rel={hasCity ? "noopener noreferrer" : undefined}
                          onClick={(e) => { if (!hasCity) { e.preventDefault(); toast({ title: "Enter your city first" }); } }}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs",
                            hasCity
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                              : "border-slate-800 bg-slate-900/40 text-slate-500"
                          )}
                          data-testid={`link-search-${kind.id}-${i}`}
                        >
                          <Search className="h-3 w-3" />
                          {p.label}
                          {hasCity && <ExternalLink className="h-3 w-3" />}
                        </a>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs italic text-slate-500">
                    <span className="font-semibold not-italic text-slate-400">How to contact:</span> {kind.contactNote}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Pitch templates */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Newspaper className="h-5 w-5 text-amber-400" />
            Pitch templates
            {hasCity && <span className="text-sm font-normal text-slate-400">tailored for {displayLoc}</span>}
          </h2>

          <div className="space-y-4">
            {pitches.map((p) => (
              <article key={p.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-amber-300">{p.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">Best for: {p.bestFor}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(`Subject: ${p.subject}\n\n${p.body}`, p.id)}
                    className="border-slate-700 bg-slate-900 hover:bg-slate-800 shrink-0"
                    data-testid={`button-copy-${p.id}`}
                  >
                    {copiedId === p.id ? (
                      <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Copied</>
                    ) : (
                      <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</>
                    )}
                  </Button>
                </div>

                <div className="mb-3 rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Subject</div>
                  <div className="text-sm text-slate-200">{p.subject}</div>
                </div>

                <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200">{p.body}</pre>
                </div>

                <p className="mt-2 text-xs italic text-slate-500">
                  <span className="font-semibold not-italic text-slate-400">Tip:</span> {p.notes}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Press kit */}
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Building2 className="h-5 w-5 text-purple-400" />
              Press kit one-pager
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copy(pressKit, "press-kit")}
              className="border-slate-700 bg-slate-900 hover:bg-slate-800"
              data-testid="button-copy-press-kit"
            >
              {copiedId === "press-kit" ? (
                <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Copied</>
              ) : (
                <><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy full press kit</>
              )}
            </Button>
          </div>
          <p className="mb-3 text-sm text-slate-400">
            Paste this into an email when a journalist asks for "more info" or "a press kit." Update the [N] months figure before sending.
          </p>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200">{pressKit}</pre>
          </div>
        </section>

        {/* Nextdoor playbook */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Users className="h-5 w-5 text-emerald-400" />
            Nextdoor playbook
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Nextdoor is the highest-trust local platform, but the moderation is unforgiving. Follow this exact sequence or get auto-flagged.
          </p>
          <ol className="space-y-3">
            {NEXTDOOR_PLAYBOOK.map((s) => (
              <li key={s.step} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    {s.step}
                  </span>
                  <h3 className="font-semibold text-slate-100">{s.title}</h3>
                </div>
                <p className="ml-8 text-sm text-slate-300">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Footer nav */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-sm">
          <h3 className="mb-2 font-semibold text-slate-200">How to run a local-press week</h3>
          <ol className="ml-5 list-decimal space-y-1 text-slate-300">
            <li>Spend Monday discovering outlets — open each search link, save 8–12 reporter / editor emails to a list.</li>
            <li>Tuesday: send 5 personalized pitches (mix all three templates).</li>
            <li>Wednesday + Thursday: send 5 more per day.</li>
            <li>Friday: do the Nextdoor post, submit your launch to 3 community calendars, follow up with one chamber.</li>
            <li>Next Tuesday: gentle follow-up to anyone who didn't reply. Then stop.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/distribution-plan">
                Back to Distribution Plan <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/haro-templates">
                HARO Templates <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
              <Link href="/forge-press">
                Forge Press <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
