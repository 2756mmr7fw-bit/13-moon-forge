import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, Shield, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const FUNNEL_URL =
  (import.meta.env.VITE_PAYMENT_FUNNEL_URL as string | undefined) ??
  "https://funnel.5.78.154.21.sslip.io";

export default function AdminPaymentFunnel() {
  const { isAuthenticated } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsAdmin(false);
      return;
    }
    fetch(`${API_BASE}/api/admin/check`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((d: { isAdmin?: boolean }) => setIsAdmin(!!d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [isAuthenticated]);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Admin only</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          The payment funnel control panel is restricted to admins.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Payment Funnel
          </h1>
          <p className="text-xs text-muted-foreground">
            Sovereign Digital Payment Platform — admin control
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload the embedded funnel"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Reload
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            title="Open the funnel in a new tab"
          >
            <a href={FUNNEL_URL} target="_blank" rel="noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" />
              Open in new tab
            </a>
          </Button>
        </div>
      </div>

      <iframe
        key={reloadKey}
        src={FUNNEL_URL}
        title="Payment Funnel"
        className="flex-1 w-full border-0 bg-background"
        allow="payment; clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
