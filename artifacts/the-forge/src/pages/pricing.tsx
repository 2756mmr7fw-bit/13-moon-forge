import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Flame, Check, Loader2, Zap, Shield, Star } from "lucide-react";

const plans = [
  {
    id: "creator",
    name: "Creator",
    price: 15,
    icon: Zap,
    color: "border-border",
    badge: null,
    description: "For individuals building their first site.",
    features: [
      "Unlimited projects",
      "Unlimited Forge generations",
      "Publish to theforge.ai subdomain",
      "Export site as ZIP",
      "SEO controls",
      "Revision history",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    icon: Flame,
    color: "border-primary",
    badge: "Most Popular",
    description: "For creators who need more power and reach.",
    features: [
      "Everything in Creator",
      "Custom domain connection",
      "Priority AI generation",
      "Per-page Forge refinement",
      "Analytics dashboard",
      "Remove Forge branding",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: 59,
    icon: Star,
    color: "border-amber-500/50",
    badge: null,
    description: "For agencies and multi-client work.",
    features: [
      "Everything in Pro",
      "Unlimited client projects",
      "White-label option",
      "Team collaboration",
      "Priority support",
      "Early access to new features",
    ],
  },
];

export default function Pricing() {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleCheckout = async (planId: string) => {
    if (!email.trim()) {
      setEmailError("Please enter your email to continue.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setLoadingPlan(planId);

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, email: email.trim() }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not create checkout session");
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ variant: "destructive", title: "Checkout failed", description: message });
      setLoadingPlan(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/15 rounded-xl mb-4">
          <Flame className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Choose your plan</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          One price. No hidden fees. Cancel any time. Your site stays yours.
        </p>
      </div>

      {/* Email input */}
      <div className="max-w-sm mx-auto mb-10">
        <label className="text-sm font-medium block mb-2 text-center">Your email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
          placeholder="you@example.com"
          className={cn("bg-card border-border text-center", emailError && "border-destructive")}
        />
        {emailError && <p className="text-destructive text-xs text-center mt-1.5">{emailError}</p>}
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isLoading = loadingPlan === plan.id;
          const isPopular = plan.badge === "Most Popular";

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-xl border-2 bg-card p-6 flex flex-col",
                plan.color,
                isPopular && "shadow-[0_0_40px_rgba(255,100,0,0.12)]"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="mb-5">
                <div className={cn(
                  "inline-flex p-2.5 rounded-lg mb-3",
                  isPopular ? "bg-primary/20" : "bg-muted"
                )}>
                  <Icon className={cn("w-5 h-5", isPopular ? "text-primary" : "text-muted-foreground")} />
                </div>
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className={cn("w-4 h-4 mt-0.5 shrink-0", isPopular ? "text-primary" : "text-green-500")} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn(
                  "w-full",
                  isPopular ? "bg-primary text-primary-foreground" : "variant-outline"
                )}
                variant={isPopular ? "default" : "outline"}
                disabled={!!loadingPlan}
                onClick={() => handleCheckout(plan.id)}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</>
                ) : (
                  `Get ${plan.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Free tier note */}
      <div className="text-center border border-dashed border-border rounded-xl p-6 bg-card/50">
        <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="font-medium mb-1">Not ready yet?</p>
        <p className="text-sm text-muted-foreground">
          The free tier lets you build and preview — no payment required. Upgrade when you're ready to publish.
        </p>
      </div>
    </div>
  );
}
