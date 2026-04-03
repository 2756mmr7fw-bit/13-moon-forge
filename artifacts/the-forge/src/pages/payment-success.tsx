import { useSearch, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Flame } from "lucide-react";

const planNames: Record<string, string> = {
  creator: "Creator",
  pro: "Pro",
  studio: "Studio",
};

export default function PaymentSuccess() {
  const searchStr = useSearch();
  const plan = new URLSearchParams(searchStr).get("plan") || "creator";
  const planName = planNames[plan] || "Creator";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
      <div className="p-4 bg-green-500/15 rounded-full mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
      </div>
      <h1 className="text-4xl font-bold mb-3">You're in, {planName}.</h1>
      <p className="text-muted-foreground text-lg max-w-md mb-8">
        Welcome to The Forge. Your plan is active — go build something extraordinary.
      </p>
      <div className="flex gap-3">
        <Link href="/projects">
          <Button className="bg-primary text-primary-foreground">
            <Flame className="w-4 h-4 mr-2" /> Go to My Projects
          </Button>
        </Link>
        <Link href="/projects/new">
          <Button variant="outline">Start a New Project</Button>
        </Link>
      </div>
    </div>
  );
}
