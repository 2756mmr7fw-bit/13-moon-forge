import { useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  useEffect(() => {
    const returnTo = basePath || "/";
    fetch(`/x-auth/login?returnTo=${encodeURIComponent(returnTo)}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data: { loginUrl?: string }) => {
        if (data.loginUrl) window.location.href = data.loginUrl;
      })
      .catch(() => {
        window.location.href = `/x-auth/login?returnTo=${encodeURIComponent(returnTo)}`;
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
