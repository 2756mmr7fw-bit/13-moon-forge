import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListEzquillDocuments, useCreateEzquillDocument, useDeleteEzquillDocument, getListEzquillDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusCircle, Search, FileText, MoreVertical, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Documents() {
  const { data: documents = [], isLoading } = useListEzquillDocuments();
  const createDocument = useCreateEzquillDocument();
  const deleteDocument = useDeleteEzquillDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) || 
    (doc.description && doc.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    createDocument.mutate(
      { data: { title: newTitle, description: newDesc } },
      {
        onSuccess: (newDoc) => {
          queryClient.invalidateQueries({ queryKey: getListEzquillDocumentsQueryKey() });
          setIsCreateOpen(false);
          setNewTitle("");
          setNewDesc("");
          setLocation(`/ezquill/documents/${newDoc.id}`);
          toast({ title: "Document created successfully" });
        },
        onError: () => toast({ title: "Failed to create document", variant: "destructive" })
      }
    );
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocument.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEzquillDocumentsQueryKey() });
            toast({ title: "Document deleted" });
          }
        }
      );
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      signed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    
    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8 flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">Manage, edit, and sign your documents.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-9 w-full sm:w-64 bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0">
                <PlusCircle size={16} />
                New Document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Document</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Non-Disclosure Agreement" 
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description (Optional)</Label>
                  <Textarea 
                    id="desc" 
                    placeholder="Brief details about this document..."
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    className="resize-none"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createDocument.isPending}>
                    {createDocument.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-card rounded-xl border shadow-sm">
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded"></div>)}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium">No documents found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mb-6">
              {search ? "No documents match your search query." : "Create your first document to start preparing fields and collecting signatures."}
            </p>
            {!search && (
              <Button onClick={() => setIsCreateOpen(true)}>Create Document</Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredDocs.map(doc => (
              <Link 
                key={doc.id} 
                href={`/ezquill/documents/${doc.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    doc.status === 'completed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                    doc.status === 'signed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                    'bg-primary/10 text-primary'
                  }`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{doc.title}</span>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {doc.description || `Updated ${format(new Date(doc.updatedAt), "MMM d, yyyy")}`}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <StatusBadge status={doc.status} />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                      <Button variant="ghost" size="icon" className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/ezquill/documents/${doc.id}`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Fields
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/ezquill/documents/${doc.id}/view`)}>
                        <FileText className="mr-2 h-4 w-4" /> View Document
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDelete(doc.id, e)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}