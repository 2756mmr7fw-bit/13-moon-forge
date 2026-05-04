import { useState, useEffect, useCallback, useRef } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface OidcConfig {
  clientId: string;
  issuerUrl: string;
  appUrl: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function buildOidcLoginUrl(config: OidcConfig, returnTo: string): Promise<string> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challengeHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = base64url(new Uint8Array(challengeHash));
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));

  try {
    sessionStorage.setItem("oidc_verifier", verifier);
    sessionStorage.setItem("oidc_state", state);
    sessionStorage.setItem("oidc_nonce", nonce);
    sessionStorage.setItem("oidc_return_to", returnTo);
  } catch {
    /* private browsing may deny sessionStorage writes */
  }

  const redirectUri = `${config.appUrl}/x-auth/callback`;
  const url = new URL(`${config.issuerUrl}/auth`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  return url.toString();
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const oidcConfigRef = useRef<OidcConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      // ── Strategy 1: GET /api/healthz ─────────────────────────────────────────
      // This path is the deployment health-check endpoint, which Replit's
      // infrastructure routes directly to Express (bypassing the CDN catch-all
      // that returns the cached SPA shell for every other GET path).
      // The server adds Vary: Cookie so that cookie-bearing requests from signed-in
      // browsers are CDN misses and reach Express live, returning the real user.
      // The response includes a "v" field only in the new version; an old CDN-
      // cached response won't have it, so we fall through to Strategy 2.
      try {
        const healthzRes = await fetch("/api/healthz", { credentials: "include" });
        if (healthzRes.ok) {
          const data = (await healthzRes.json()) as {
            v?: string;
            user?: AuthUser | null;
            oidcClientId?: string;
            issuerUrl?: string;
            appUrl?: string;
          };

          if (data.v) {
            // New healthz format — Vary: Cookie trick worked, data is fresh.
            if (!cancelled) {
              setUser(data.user ?? null);
              if (data.oidcClientId) {
                oidcConfigRef.current = {
                  clientId: data.oidcClientId,
                  issuerUrl: data.issuerUrl ?? "https://replit.com/oidc",
                  appUrl: data.appUrl ?? window.location.origin,
                };
              }
            }
            return;
          }
          // Old CDN-cached healthz (no "v" field) — fall through.
        }
      } catch {
        /* network error — fall through */
      }

      // ── Strategy 2: POST /x-auth/me ──────────────────────────────────────────
      // POST requests bypass Replit's CDN (which only caches GET/HEAD responses)
      // and reach Express directly.  The inline handler in app.ts returns the
      // authenticated user from the session cookie.
      try {
        const meRes = await fetch("/x-auth/me", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
        });
        if (meRes.ok) {
          const data = (await meRes.json()) as { user?: AuthUser | null };
          if (!cancelled) setUser(data.user ?? null);
          return;
        }
      } catch {
        /* network error — fall through */
      }

      if (!cancelled) setUser(null);
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async () => {
    const returnTo = window.location.pathname.replace(/\/$/, "") || "/";

    // ── Try 1: server-side POST login ─────────────────────────────────────────
    // The server generates PKCE params, stores them in cookies, and returns the
    // Replit OIDC redirect URL as JSON.  Works when POST reaches Express.
    try {
      const res = await fetch(
        `/x-auth/login?returnTo=${encodeURIComponent(returnTo)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(4000),
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { loginUrl?: string };
        if (data.loginUrl) {
          window.location.href = data.loginUrl;
          return;
        }
      }
    } catch {
      /* fall through to client-side PKCE */
    }

    // ── Try 2: client-side PKCE (no server round-trip) ────────────────────────
    // If GET /api/healthz returned an oidcClientId (new healthz format), we can
    // construct the full Replit OIDC URL entirely in the browser.
    const config = oidcConfigRef.current;
    if (config?.clientId) {
      const url = await buildOidcLoginUrl(config, returnTo);
      window.location.href = url;
      return;
    }

    // ── Try 3: GET navigation (dev fallback) ──────────────────────────────────
    window.location.href = `/x-auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const logout = useCallback(() => {
    fetch("/x-auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data: { logoutUrl?: string }) => {
        window.location.href = data.logoutUrl ?? "/";
      })
      .catch(() => {
        window.location.href = "/x-auth/logout";
      });
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
