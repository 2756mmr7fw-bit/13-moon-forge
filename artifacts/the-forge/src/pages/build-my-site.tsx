import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Globe, Loader2, Users, AlertCircle } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tier = "starter" | "standard" | "custom" | "hardship";

interface Availability {
  capacity: number;
  active: number;
  waitlist: number;
  openSlots: number;
  accepting: "active" | "waitlist";
}

const TIERS: { id: Tier; name: string; price: string; sub: string; for: string }[] = [
  {
    id: "starter",
    name: "Starter Site",
    price: "$199",
    sub: "+ $9/month hosting",
    for: "1–3 page brochure for a small business, freelancer, or personal brand.",
  },
  {
    id: "standard",
    name: "Standard Site",
    price: "$499",
    sub: "+ $19/month hosting",
    for: "Local business with contact forms, gallery, and a simple way to update content.",
  },
  {
    id: "custom",
    name: "Custom",
    price: "Quoted",
    sub: "per project",
    for: "Anything bigger — booking, e-commerce, member areas, integrations.",
  },
  {
    id: "hardship",
    name: "Forge Student / Hardship",
    price: "Free",
    sub: "you host it yourself",
    for: "Active Forge students and people who genuinely can't pay. You get the code, you self-host.",
  },
];

export default function BuildMySite() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("starter");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ status: "active" | "waitlist"; position: number | null } | null>(null);

  useEffect(() => {
    fetch(`${API}/api/build-my-site/availability`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAvailability(d))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!email.trim() && !phone.trim()) return setError("Please give us an email or a phone number so we can reach you.");
    if (description.trim().length < 50) return setError("Please describe what you need in a little more detail (at least 50 characters).");

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/build-my-site/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, tier, description, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
      } else {
        setDone({ status: data.status, position: data.position });
      }
    } catch {
      setError("Couldn't reach the server. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={48} />
          <h1 className="text-2xl font-semibold mb-2">Got it — your request is in.</h1>
          {done.status === "active" ? (
            <p className="text-slate-700">
              You're on the active list. Ezekiel will reach out within 1–2 business days to talk through your site.
            </p>
          ) : (
            <p className="text-slate-700">
              The active queue is full right now, so you're on the waitlist at position <strong>#{done.position}</strong>. As soon as a slot opens you'll roll right into it — no need to ask again.
            </p>
          )}
          <p className="text-sm text-slate-500 mt-6">
            Questions in the meantime? Email ezekiel@thepeoplestownsq.com
          </p>
        </div>
      </div>
    );
  }

  const accepting = availability?.accepting ?? "active";
  const openSlots = availability?.openSlots ?? null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 text-amber-600 mb-3">
          <Globe size={20} />
          <span className="text-sm font-medium uppercase tracking-wide">Need a website?</span>
        </div>
        <h1 className="text-4xl font-bold mb-3">I'll build you one.</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          You get the code. Your domain stays yours. You can take it anywhere, anytime. No vendor lock-in.
        </p>
      </div>

      {availability && (
        <div className={`mb-8 rounded-xl border p-4 flex items-start gap-3 ${accepting === "active" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <Users className={accepting === "active" ? "text-emerald-600 mt-0.5" : "text-amber-600 mt-0.5"} size={20} />
          <div className="text-sm">
            {accepting === "active" ? (
              <>
                <strong>{openSlots} of {availability.capacity} active slots open right now.</strong>{" "}
                Submit below and I'll be in touch in 1–2 business days.
              </>
            ) : (
              <>
                <strong>All {availability.capacity} active slots are full.</strong>{" "}
                {availability.waitlist > 0 && `${availability.waitlist} on the waitlist. `}
                Submit anyway — you'll roll right into the next opening, no need to ask twice.
              </>
            )}
          </div>
        </div>
      )}

      <div role="radiogroup" aria-label="Choose a service tier" className="grid sm:grid-cols-2 gap-4 mb-10">
        {TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={tier === t.id}
            onClick={() => setTier(t.id)}
            className={`text-left rounded-xl border-2 p-5 transition ${tier === t.id ? "border-amber-500 bg-amber-50/50" : "border-slate-200 hover:border-slate-300"}`}
          >
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="font-semibold">{t.name}</h3>
              <div className="text-right">
                <div className="font-bold text-lg">{t.price}</div>
                <div className="text-xs text-slate-500">{t.sub}</div>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2">{t.for}</p>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Tell me about your site</h2>

        <div>
          <Label htmlFor="name">Your name <span className="text-red-500">*</span></Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </div>
        </div>
        <p className="text-xs text-slate-500 -mt-3">Email <em>or</em> phone — at least one so I can get details from you.</p>

        <div>
          <Label htmlFor="description">
            Full description of what you need <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's the site for? Who's it for? What pages do you need? Any examples of sites you like? The more detail, the better."
          />
          <div className="text-xs text-slate-500 mt-1">{description.length} characters · minimum 50</div>
        </div>

        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
          aria-hidden="true"
        />

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-sm text-red-800">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={submitting} className="w-full" size="lg">
          {submitting ? (
            <><Loader2 className="mr-2 animate-spin" size={18} /> Sending…</>
          ) : accepting === "active" ? "Send my request" : "Add me to the waitlist"}
        </Button>
      </form>

      <div className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-900 mb-2">A little honesty:</p>
        <p>
          Right now I can take <strong>5 sites at a time</strong>. With more hours I could do 12 — but I'm one person with a full life, and I'm still learning too. I use AI as a partner (the same kind of tools the Forge gives you), and every site I build also sharpens what I can teach. When the school fills up and students are ready, we'll be able to take many more.
        </p>
      </div>
    </div>
  );
}
