import { useEffect } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  useEffect(() => {
    window.location.href = `/api/replit-login?returnTo=${encodeURIComponent(basePath || "/")}`;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
