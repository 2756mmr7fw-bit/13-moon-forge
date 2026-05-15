import { useState } from "react";
import {
  Smartphone, Copy, CheckCircle2, AlertTriangle, ShieldCheck, Apple,
  Play, Camera, FileText, Eye, MessageSquare, Lock, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AppFamily } from "@/components/app-family";

function CopyField({ label, value, long }: { label: string; value: string; long?: boolean }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            toast({ title: "Copied", description: label });
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
      <div className={cn(
        "rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm font-mono whitespace-pre-wrap break-words",
        long && "min-h-[120px]"
      )}>
        {value}
      </div>
    </div>
  );
}

const APP_STORE_DESCRIPTION = `13 Moon Forge is the companion app for the 13 Moon ecosystem — a set of independently built tools for developers, writers, and creators who want to own their work.

WHAT YOU CAN DO IN THIS APP:
• Check on projects you've built with 13 Moon Forge from anywhere
• Get a quick "Fix" from Flint, the troubleshooting assistant
• Browse the Town Square, an alternative social space focused on real humans and no algorithm
• Inspect the apps and infrastructure you've deployed to your own server
• Manage your team of AI Moons for your projects

WHAT REQUIRES THE WEB:
Subscriptions, payments, and large workflows live at 13moonforge.ai. This app is a reader and companion — purpose-built for checking in and getting unblocked, not for billing or heavy editing.

PHILOSOPHY:
Every 13 Moon app is built and maintained by one person. There is no algorithm. There is no advertising network. There is no analytics SDK tracking you across other apps. The features you see are the features that exist. The price you pay (if any) is paid directly to the operator, not split with a platform middleman.

This app is free to use with a free 13 Moon Forge account. Paid plans available at 13moonforge.ai.`;

const PLAY_FULL_DESCRIPTION = APP_STORE_DESCRIPTION;

const REVIEWER_NOTES = `Reviewer notes for App Review:

This is a companion app for an existing web platform (13moonforge.ai). It is a reader application: users browse content, get troubleshooting help, and manage their projects. No payments, subscriptions, or purchases occur inside the app. All monetary transactions are completed on the web. The app does not bypass any platform billing rules — there are no in-app digital goods or services sold or unlocked through this app.

Test account (please request from support if needed):
  Email:    [REPLACE WITH TEST ACCOUNT EMAIL]
  Password: [REPLACE WITH TEST ACCOUNT PASSWORD]

Privacy policy: https://13moonforge.ai/privacy
Terms of service: https://13moonforge.ai/terms
Support: eze@13moonforge.ai

Notes on permissions:
- The NSUserTrackingUsageDescription string is present because iOS requires it when the ATT framework MIGHT be invoked. We do not in fact track users across other apps or websites. We do not use any advertising SDK.
- The app does not request camera, microphone, location, contacts, photos, or HealthKit access.

The "associated domains" entries route iOS Universal Links to the corresponding web app when a user taps a link to 13moonforge.ai or thepeoplestownsquare.ai. This is standard web-to-app integration.

Thank you for the review.`;

const CHECKLIST_BEFORE = [
  { id: "icon",        label: "App icon — 1024x1024 PNG (no transparency, no rounded corners)", mine: false, note: "Currently using Expo default. Replace with brand icon before submission. I can generate this if you give me the visual direction." },
  { id: "screenshots", label: "Screenshots — 6.7\" iPhone (1290x2796), 5.5\" iPhone (1242x2208), 12.9\" iPad if iPad supported", mine: false, note: "Take from a real device or simulator. Minimum 3, max 10. Apple wants real app screenshots — no mockups or marketing." },
  { id: "icon-android",label: "Android adaptive icon — foreground 1024x1024 PNG, transparent background", mine: false },
  { id: "feature",     label: "Google Play feature graphic — 1024x500 JPG/PNG", mine: false },
  { id: "screenshots-android", label: "Google Play screenshots — 1080x1920 (phone), 1200x1920 (tablet)", mine: false },
  { id: "apple-acct",  label: "Apple Developer Program enrollment ($99/year)", mine: false, note: "Only you can pay this. Go to developer.apple.com/programs/enroll" },
  { id: "google-acct", label: "Google Play Console enrollment ($25 one-time)", mine: false, note: "Only you can pay this. Go to play.google.com/console/signup" },
  { id: "asc-id",      label: "App Store Connect — create app record, get the ASC App ID", mine: false, note: "After Apple enrollment, log into appstoreconnect.apple.com, click 'My Apps' → '+'. Fill basic info. The numeric App ID goes into eas.json." },
  { id: "team-id",     label: "Apple Team ID (10-character string)", mine: false, note: "Found at developer.apple.com/account → top right. Goes into eas.json." },
  { id: "eas-init",    label: "EAS project linked — run `npx eas init` from artifacts/forge-mobile", mine: false, note: "Generates the projectId that goes into app.json extra.eas.projectId. Requires your Expo account login." },
  { id: "icon-prod",   label: "Replace the icon path in app.json with your real icon file", mine: false },
];

const CHECKLIST_DONE = [
  "Bundle identifier set: ai.thirteenmoonforge.app",
  "Build number 1 / version code 1 — first submission",
  "ITSAppUsesNonExemptEncryption: false (skips export compliance modal)",
  "NSUserTrackingUsageDescription string set",
  "Privacy policy URL ready: 13moonforge.ai/privacy",
  "Terms of service URL ready: 13moonforge.ai/terms",
  "No payment code in the app — Apple reader-mode compliant",
  "5 native screens (not just a webview wrapper)",
  "Associated domains for Universal Links to 13moonforge.ai + thepeoplestownsquare.ai",
  "eas.json with production build profile",
  "App description, primary color, splash screen configured",
  "Adaptive icon manifest in place for Android",
];

const PRIVACY_ANSWERS = [
  { q: "Does this app collect data?",                                          a: "Yes — only contact info (email) and identifiers (user ID) needed for the account to function." },
  { q: "Is the data linked to the user?",                                       a: "Yes — email is linked because that's how login works. Nothing else is linked." },
  { q: "Is the data used for tracking?",                                        a: "No. We do not track users across other companies' apps or websites." },
  { q: "Do you use third-party SDKs that collect data?",                        a: "Clerk (auth) collects email for sign-in. Sentry-style crash reporting is OFF. No analytics SDK." },
  { q: "Do you use AdSupport, advertising identifiers, or ad networks?",        a: "No." },
];

const KEYWORDS_APPLE = "developer tools, indie maker, self-host, town square, AI assistant, fix my computer, project manager, social network alternative, no algorithm, no ads";
const SHORT_DESC_PLAY = "Companion app for the 13 Moon ecosystem. Check projects, get fixes, browse on the go.";

export default function MobileSubmission() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-4">
            <Smartphone className="w-3.5 h-3.5" />
            Mobile Submission Kit · App Store + Play Store · everything ready to paste
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Mobile app — built for acceptance
          </h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            The forge-mobile app is now wired with everything Apple and Google require to ACCEPT a submission. The store listing copy below is ready to paste. The bottom of this page lists what only you can do — the $124 in fees and a few credentials I can't generate on your behalf.
          </p>
        </div>

        {/* What's done */}
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-2xl font-bold">Done — built into the app right now</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {CHECKLIST_DONE.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What you do */}
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 mb-10">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-2xl font-bold">What only you can do</h2>
          </div>
          <ul className="space-y-3 text-sm">
            {CHECKLIST_BEFORE.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3">
                <div className="w-5 h-5 rounded border border-border bg-background mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  {item.note && <div className="text-xs text-muted-foreground mt-1">{item.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Apple block */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Apple className="w-6 h-6" />
            <h2 className="text-3xl font-bold">Apple App Store</h2>
          </div>
          <div className="space-y-4">
            <CopyField label="App name (max 30 chars)" value="13 Moon Forge" />
            <CopyField label="Subtitle (max 30 chars)" value="Build, fix, and check on apps" />
            <CopyField label="Promotional text (max 170 chars)" value="A companion to 13moonforge.ai. Check on your projects, get a Fix from Flint, and browse the Town Square — no ads, no algorithm, owned by you." />
            <CopyField label="Description (max 4000 chars)" value={APP_STORE_DESCRIPTION} long />
            <CopyField label="Keywords (comma-separated, max 100 chars)" value={KEYWORDS_APPLE} />
            <CopyField label="Support URL" value="https://13moonforge.ai/support" />
            <CopyField label="Marketing URL" value="https://13moonforge.ai" />
            <CopyField label="Privacy Policy URL" value="https://13moonforge.ai/privacy" />
            <CopyField label="Copyright" value={`© ${new Date().getFullYear()} Ezekiel Evans`} />
            <CopyField label="Primary category" value="Developer Tools" />
            <CopyField label="Age rating" value="4+" />
          </div>
        </section>

        {/* Google block */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-6 h-6" />
            <h2 className="text-3xl font-bold">Google Play Store</h2>
          </div>
          <div className="space-y-4">
            <CopyField label="App title (max 30 chars)" value="13 Moon Forge" />
            <CopyField label="Short description (max 80 chars)" value={SHORT_DESC_PLAY} />
            <CopyField label="Full description (max 4000 chars)" value={PLAY_FULL_DESCRIPTION} long />
            <CopyField label="App category" value="Tools" />
            <CopyField label="Content rating questionnaire — answer" value="No violence, no sexual content, no profanity, no drugs, no gambling, no user-generated content shown by default in this companion app. UGC is on the web only and behind authentication. Rating: Everyone." long />
          </div>
        </section>

        {/* Privacy nutrition */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-6 h-6" />
            <h2 className="text-3xl font-bold">Privacy "nutrition label" answers</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Apple and Google both require you to declare data collection. These are the answers — paste them directly into the App Privacy section in App Store Connect.
          </p>
          <div className="space-y-3">
            {PRIVACY_ANSWERS.map((p) => (
              <div key={p.q} className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="font-semibold text-sm mb-1">{p.q}</div>
                <div className="text-sm text-muted-foreground">{p.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Reviewer notes */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-6 h-6" />
            <h2 className="text-3xl font-bold">Notes for the Apple reviewer</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Paste this in the "App Review Information → Notes" field. It tells the reviewer up front that this is a reader app with no IAP — the #1 thing they look for. Apps that explain themselves get approved faster.
          </p>
          <CopyField label="Notes for App Review" value={REVIEWER_NOTES} long />
        </section>

        {/* Submission flow */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-6 h-6" />
            <h2 className="text-3xl font-bold">Submission flow — first time</h2>
          </div>
          <ol className="list-decimal list-inside space-y-3 text-sm leading-relaxed">
            <li><strong>Enroll in Apple Developer Program.</strong> developer.apple.com/programs/enroll — pick Individual, $99, approval in 24–48 hrs.</li>
            <li><strong>Enroll in Google Play Console.</strong> play.google.com/console/signup — $25 one-time, usually instant approval.</li>
            <li><strong>Create the app record in App Store Connect.</strong> appstoreconnect.apple.com → My Apps → "+" → New App. Use the copy in the Apple block above.</li>
            <li><strong>Create the app record in Google Play Console.</strong> play.google.com/console → Create app. Use the copy in the Google block above.</li>
            <li><strong>Fill in the REPLACE placeholders.</strong> Open <code className="px-1 py-0.5 rounded bg-secondary text-xs">artifacts/forge-mobile/eas.json</code> and replace <code className="px-1 py-0.5 rounded bg-secondary text-xs">ascAppId</code> + <code className="px-1 py-0.5 rounded bg-secondary text-xs">appleTeamId</code>. Open <code className="px-1 py-0.5 rounded bg-secondary text-xs">app.json</code> and replace the <code className="px-1 py-0.5 rounded bg-secondary text-xs">projectId</code>. (I'll do this for you once you give me the IDs.)</li>
            <li><strong>Generate the icon and screenshots.</strong> Tell me the visual direction and I'll generate them; or supply your own.</li>
            <li><strong>Build production binaries.</strong> Run <code className="px-1 py-0.5 rounded bg-secondary text-xs">npx eas build --profile production --platform all</code> from <code className="px-1 py-0.5 rounded bg-secondary text-xs">artifacts/forge-mobile</code>. Takes about 20 min per platform. Output is a signed .ipa and .aab.</li>
            <li><strong>Submit.</strong> <code className="px-1 py-0.5 rounded bg-secondary text-xs">npx eas submit --platform all</code> uploads the binaries to App Store Connect and Play Console.</li>
            <li><strong>Push the buttons.</strong> In each console, attach the screenshots, paste the privacy answers, set pricing to Free, and hit "Submit for Review."</li>
            <li><strong>Wait.</strong> Apple: 24–48 hrs typical. Google: 1–7 days, and the first submission requires 20 closed-test users for 14 days before public release.</li>
          </ol>
        </section>

        {/* Risk callout */}
        <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-rose-400" />
            <h3 className="text-xl font-bold">The only thing Apple really cares about</h3>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Reader apps are explicitly allowed under App Store Review Guideline 3.1.3(a). The rule: <strong>do not link to or display payment options inside the app.</strong> The current build has zero payment code paths — verified clean. Just don't add any "Subscribe now" buttons that link to your website's pricing page directly from inside the app. If the user needs to pay, the only acceptable language is "Sign up at 13moonforge.ai" — phrased neutrally, no pricing details, no CTAs.
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed mt-3">
            The current Account screen has a "Manage subscription" link. That language is fine — it's neutral and points to an account-management page, not a checkout. Keep it that way.
          </p>
        </section>

        {/* Cross-promo */}
        <AppFamily currentAppId="forge" />
      </div>
    </div>
  );
}
