import { useGetEzquillDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { FileText, FileSignature, CheckCircle2, Clock, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AppFamily } from "@/components/app-family";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetEzquillDashboard();

  if (isLoading || !dashboard) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl"></div>
      </div>
    );
  }

  const stats = [
    { title: "Total Documents", value: dashboard.totalDocuments, icon: FileText, color: "text-blue-500" },
    { title: "Draft", value: dashboard.draft, icon: FileText, color: "text-gray-500" },
    { title: "Pending Signatures", value: dashboard.pending, icon: Clock, color: "text-amber-500" },
    { title: "Completed", value: dashboard.completed + dashboard.signed, icon: CheckCircle2, color: "text-emerald-500" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening with your documents.</p>
        </div>
        <Link href="/ezquill/documents">
          <Button className="gap-2">
            <PlusCircle size={16} />
            New Document
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent Documents</h2>
        {dashboard.recentDocuments.length === 0 ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <FileSignature className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">No documents yet</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mb-6">
                Create your first document to start dropping fields and collecting signatures.
              </p>
              <Link href="/ezquill/documents">
                <Button>Create Document</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="divide-y">
              {dashboard.recentDocuments.map((doc) => (
                <Link key={doc.id} href={`/ezquill/documents/${doc.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{doc.title}</span>
                    <span className="text-sm text-muted-foreground">
                      Updated {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      doc.status === 'completed' || doc.status === 'signed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      doc.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <AppFamily currentAppId="ezquill" />
      </div>
    </div>
  );
}