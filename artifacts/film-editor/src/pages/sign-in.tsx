import { Film, Sparkles, Lock } from "lucide-react";
import { useEffect } from "react";

export default function SignIn() {
  useEffect(() => {
    // After Clerk signs in, redirect back to the film editor dashboard
    const returnUrl = encodeURIComponent("/film-editor/dashboard");
    window.location.href = `/sign-in?redirect_url=${returnUrl}`;
  }, []);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#080808]">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Film size={24} className="text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white tracking-tight">Sign in to 13 Moon Editor</h1>
          <p className="text-sm text-white/40 leading-relaxed">
            Taking you to sign in…
          </p>
        </div>

        {/* Loading indicator */}
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />

        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-white/25">
            <Lock size={10} /> Secured by Clerk
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5 text-[11px] text-white/25">
            <Sparkles size={10} /> 13 Moon Forge
          </div>
        </div>
      </div>
    </div>
  );
}
