import { useRoute, Link } from "wouter";
import { useGetEzquillDocument, useListEzquillFields } from "@workspace/api-client-react";
import { format } from "date-fns";
import { CheckCircle2, ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocumentViewer() {
  const [, params] = useRoute("/ezquill/documents/:id/view");
  const id = parseInt(params?.id || "0");

  const { data: document, isLoading: docLoading } = useGetEzquillDocument(id, { query: { enabled: !!id } });
  const { data: fields = [], isLoading: fieldsLoading } = useListEzquillFields(id, { query: { enabled: !!id } });

  if (docLoading || fieldsLoading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-muted w-1/4 rounded mb-8"></div><div className="h-[600px] bg-muted rounded"></div></div>;
  }

  if (!document) {
    return <div className="p-8 text-center">Document not found</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/ezquill/documents">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              {document.title}
              {document.status === 'completed' && (
                <span className="flex items-center gap-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Signed
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {document.signedAt ? `Completed on ${format(new Date(document.signedAt), "MMMM d, yyyy")}` : `Updated ${format(new Date(document.updatedAt), "MMMM d, yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/30 p-8 overflow-y-auto">
        <div className="max-w-[800px] mx-auto bg-white shadow-xl min-h-[1056px] relative border print:shadow-none print:border-none print:m-0 print:max-w-none">
          {/* Placeholder Doc Content */}
          <div className="absolute inset-0 p-12 pointer-events-none opacity-20 flex flex-col items-center justify-center">
            <div className="w-3/4 h-8 bg-gray-300 mb-8 rounded"></div>
            <div className="w-full h-4 bg-gray-200 mb-4 rounded"></div>
            <div className="w-full h-4 bg-gray-200 mb-4 rounded"></div>
            <div className="w-5/6 h-4 bg-gray-200 mb-4 rounded"></div>
            <div className="w-full h-4 bg-gray-200 mb-4 rounded"></div>
            <div className="w-4/5 h-4 bg-gray-200 mb-12 rounded"></div>
            
            <div className="w-full flex justify-between mt-auto">
              <div className="w-1/3 h-12 border-b-2 border-gray-400"></div>
              <div className="w-1/3 h-12 border-b-2 border-gray-400"></div>
            </div>
          </div>

          {/* Rendered Fields */}
          {fields.map(field => (
            <div
              key={field.id}
              className="absolute flex items-center px-1"
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
              }}
            >
              <div className="flex-1 w-full h-full flex items-center text-sm font-medium text-gray-900 border-b border-gray-200 pb-1">
                {field.fieldType === 'signature' && field.value ? (
                  <img src={field.value} className="h-12 object-contain mix-blend-multiply max-w-full" alt="Signature" />
                ) : (
                  <span>{field.value || ""}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}