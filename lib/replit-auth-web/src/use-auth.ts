import { useState, useEffect, useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // POST bypasses the Replit CDN (which serves index.html for all GET requests).
    fetch("/x-auth/me", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    const returnTo = window.location.pathname.replace(/\/$/, "") || "/";
    // POST to get the OAuth URL (bypasses CDN), then navigate to it.
    fetch(`/x-auth/login?returnTo=${encodeURIComponent(returnTo)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data: { loginUrl?: string }) => {
        if (data.loginUrl) {
          window.location.href = data.loginUrl;
        }
      })
      .catch(() => {
        // fallback: direct GET navigation (works in dev where CDN is absent)
        window.location.href = `/x-auth/login?returnTo=${encodeURIComponent(returnTo)}`;
      });
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
