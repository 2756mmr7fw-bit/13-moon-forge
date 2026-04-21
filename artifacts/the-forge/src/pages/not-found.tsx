import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="bg-primary/10 p-4 rounded-full">
        <AlertCircle className="h-12 w-12 text-primary" />
      </div>
      
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">Lost in the Smoke</h1>
        <p className="text-muted-foreground text-lg">
          The artifact you seek cannot be found in this part of the forge. It may have been melted down, or perhaps it never existed.
        </p>
      </div>

      <Link href="/dashboard">
        <Button size="lg" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to the Anvil
        </Button>
      </Link>
    </div>
  );
}
