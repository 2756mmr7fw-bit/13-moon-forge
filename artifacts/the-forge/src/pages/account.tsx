import { UserProfile, useUser } from "@clerk/react";
import { Show } from "@clerk/react";
import { Link } from "wouter";
import { ExternalLink, Shield, CreditCard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkAppearance = {
  variables: {
    colorPrimary: "hsl(20, 90%, 55%)",
    colorBackground: "hsl(0, 0%, 10%)",
    colorInputBackground: "hsl(0, 0%, 14%)",
    colorText: "hsl(0, 0%, 96%)",
    colorTextSecondary: "hsl(0, 0%, 60%)",
    colorInputText: "hsl(0, 0%, 96%)",
    colorNeutral: "hsl(0, 0%, 40%)",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border border-border bg-transparent",
    card: "!shadow-none !border-0 !bg-transparent",
    navbar: "!border-r !border-border",
    navbarButton: "!rounded-md",
    pageScrollBox: "!pt-0",
  },
};

export default function AccountPage() {
  const { user, isLoaded } = useUser();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, security, and subscription.
        </p>
      </div>

      <Show when="signed-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <h2 className="font-semibold text-sm">Subscription</h2>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Manage your Moon subscriptions and billing through the Town Square.
                </div>
                <a
                  href="https://thepeoplestownsq.com/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Open Town Square Account <ExternalLink size={11} />
                </a>
              </div>

              <hr className="border-border" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" />
                  <h3 className="font-semibold text-sm">Upgrade Plan</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Subscribe to individual Moons or get all-access for the full Forge suite.
                </p>
                <Link href="/pricing">
                  <Button size="sm" variant="outline" className="w-full text-xs mt-1">
                    View Plans
                  </Button>
                </Link>
              </div>
            </div>

            {isLoaded && user && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="font-semibold text-sm">Quick Info</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{user.fullName ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium truncate max-w-[160px]">
                      {user.primaryEmailAddress?.emailAddress ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-medium">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clerk UserProfile — takes the remaining 2/3 */}
          <div className="lg:col-span-2">
            <UserProfile
              routing="hash"
              appearance={clerkAppearance}
            />
          </div>
        </div>
      </Show>

      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Sign in to view your account</h2>
            <p className="text-muted-foreground text-sm">Your profile, settings, and subscription live here.</p>
          </div>
          <Link href="/sign-in">
            <Button className="gap-2">
              <LogIn size={16} /> Sign In
            </Button>
          </Link>
        </div>
      </Show>
    </div>
  );
}
