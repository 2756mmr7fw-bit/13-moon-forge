import { useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetEzquillDocument, 
  useListEzquillFields,
  useCreateEzquillField,
  useUpdateEzquillField,
  useDeleteEzquillField,
  useAutofillEzquillDocument,
  useSignEzquillDocument,
  useGetEzquillSignature,
  useUpdateEzquillDocument,
  getGetEzquillDocumentQueryKey,
  getListEzquillFieldsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Type, Calendar, Mail, Phone, MapPin, User, PenTool, CheckSquare, Baseline, 
  Trash2, GripVertical, Check, ArrowRight, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const fieldTypes = [
  { type: "text", label: "Text", icon: Type },
  { type: "name", label: "Full Name", icon: User },
  { type: "email", label: "Email", icon: Mail },
  { type: "phone", label: "Phone", icon: Phone },
  { type: "address", label: "Address", icon: MapPin },
  { type: "date", label: "Date", icon: Calendar },
  { type: "signature", label: "Signature", icon: PenTool },
  { type: "initials", label: "Initials", icon: Baseline },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
] as const;

export default function DocumentEditor() {
  const [, params] = useRoute("/ezquill/documents/:id");
  const id = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: document, isLoading: docLoading } = useGetEzquillDocument(id, { query: { enabled: !!id } });
  const { data: fields = [], isLoading: fieldsLoading } = useListEzquillFields(id, { query: { enabled: !!id } });
  const { data: signature } = useGetEzquillSignature();

  const createField = useCreateEzquillField();
  const updateField = useUpdateEzquillField();
  const deleteField = useDeleteEzquillField();
  const autofillDocument = useAutofillEzquillDocument();
  const signDocument = useSignEzquillDocument();
  const updateDocument = useUpdateEzquillDocument();

  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingField, setDraggingField] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);

  const handleAddField = (fieldType: any) => {
    // Add to center of visible container, assuming page 1 for now
    createField.mutate({
      id,
      data: {
        label: fieldType.label,
        fieldType: fieldType.type,
        page: 1,
        x: 30, // Percentage
        y: 30, // Percentage
        width: 25,
        height: 5,
        required: true,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEzquillFieldsQueryKey(id) });
      }
    });
  };

  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: number, x: number, y: number) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const pixelX = (x / 100) * containerRect.width;
    const pixelY = (y / 100) * containerRect.height;
    
    setDragOffset({
      x: e.clientX - containerRect.left - pixelX,
      y: e.clientY - containerRect.top - pixelY
    });
    setDraggingField(fieldId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingField === null || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    let newPixelX = e.clientX - containerRect.left - dragOffset.x;
    let newPixelY = e.clientY - containerRect.top - dragOffset.y;
    
    // Bounds check
    newPixelX = Math.max(0, Math.min(newPixelX, containerRect.width - 100)); // rough width 100px
    newPixelY = Math.max(0, Math.min(newPixelY, containerRect.height - 40)); // rough height 40px
    
    const newX = (newPixelX / containerRect.width) * 100;
    const newY = (newPixelY / containerRect.height) * 100;
    
    // Optimistic update for smooth drag
    queryClient.setQueryData(getListEzquillFieldsQueryKey(id), (old: any) => {
      if (!old) return old;
      return old.map((f: any) => f.id === draggingField ? { ...f, x: newX, y: newY } : f);
    });
  };

  const handleMouseUp = () => {
    if (draggingField === null) return;
    
    const field = fields.find(f => f.id === draggingField);
    if (field) {
      updateField.mutate({
        id,
        fieldId: field.id,
        data: { x: field.x, y: field.y }
      });
    }
    
    setDraggingField(null);
  };

  const handleDeleteField = (fieldId: number) => {
    deleteField.mutate({ id, fieldId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEzquillFieldsQueryKey(id) });
      }
    });
  };

  const handleFieldValueChange = (fieldId: number, value: string) => {
    updateField.mutate({ id, fieldId, data: { value } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEzquillFieldsQueryKey(id) });
      }
    });
  };

  const handleAutofill = () => {
    autofillDocument.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEzquillFieldsQueryKey(id) });
        toast({ title: "Document autofilled from profile" });
      },
      onError: () => toast({ title: "Failed to autofill", variant: "destructive" })
    });
  };

  const handleSign = () => {
    if (!signature?.dataUrl) {
      toast({ 
        title: "No signature found", 
        description: "Please create a signature in your profile first.",
        variant: "destructive"
      });
      setLocation("/ezquill/signature");
      return;
    }
    setIsSignDialogOpen(true);
  };

  const confirmSign = () => {
    signDocument.mutate({
      id,
      data: { signatureDataUrl: signature!.dataUrl! }
    }, {
      onSuccess: () => {
        updateDocument.mutate({ id, data: { status: "completed" } }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetEzquillDocumentQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: getListEzquillFieldsQueryKey(id) });
            setIsSignDialogOpen(false);
            toast({ title: "Document signed and completed!" });
            setLocation(`/ezquill/documents/${id}/view`);
          }
        });
      }
    });
  };

  if (docLoading || !document) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-muted w-1/4 rounded mb-8"></div><div className="h-[600px] bg-muted rounded"></div></div>;
  }

  return (
    <div className="flex h-full flex-col md:flex-row overflow-hidden bg-background">
      {/* Sidebar Tools */}
      <div className="w-full md:w-72 border-r bg-sidebar p-4 flex flex-col shrink-0 overflow-y-auto">
        <div className="mb-6">
          <h2 className="font-bold text-lg">{document.title}</h2>
          <p className="text-sm text-muted-foreground">{document.description || "No description"}</p>
        </div>

        <div className="space-y-4 flex-1">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Drag Fields</h3>
          <div className="grid grid-cols-2 gap-2">
            {fieldTypes.map(ft => (
              <Button 
                key={ft.type} 
                variant="outline" 
                className="justify-start px-2 py-6 h-auto flex-col gap-2 bg-card hover:border-primary"
                onClick={() => handleAddField(ft)}
              >
                <ft.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs">{ft.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t space-y-3">
          <Button 
            className="w-full justify-between" 
            variant="secondary"
            onClick={handleAutofill}
            disabled={autofillDocument.isPending}
          >
            Autofill Profile <ArrowRight className="h-4 w-4" />
          </Button>
          <Button 
            className="w-full justify-between"
            onClick={handleSign}
            disabled={signDocument.isPending || document.status === 'completed'}
          >
            {document.status === 'completed' ? 'Completed' : 'Sign & Complete'} <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document Area */}
      <div 
        className="flex-1 bg-muted/30 p-8 overflow-y-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="max-w-[800px] mx-auto bg-white shadow-xl min-h-[1056px] relative border" ref={containerRef}>
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

          {/* Fields Overlay */}
          {fields.map(field => (
            <div
              key={field.id}
              className={`absolute border-2 bg-white/90 backdrop-blur-sm shadow-sm flex items-center group transition-colors ${
                draggingField === field.id ? 'border-primary z-50 shadow-md ring-2 ring-primary/20' : 'border-dashed border-gray-300 hover:border-primary/50'
              } ${field.fieldType === 'signature' ? 'bg-amber-50/90 border-amber-200' : ''}`}
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
                minWidth: '120px',
                minHeight: '36px'
              }}
            >
              <div 
                className="absolute -left-3 top-1/2 -translate-y-1/2 p-1 cursor-move opacity-0 group-hover:opacity-100 bg-white shadow rounded-l border border-r-0 text-muted-foreground hover:text-foreground"
                onMouseDown={(e) => handleFieldMouseDown(e, field.id, field.x, field.y)}
              >
                <GripVertical size={14} />
              </div>
              
              <div className="flex-1 w-full h-full p-1 flex items-center relative">
                <span className="absolute -top-6 left-0 text-[10px] font-medium text-muted-foreground bg-white px-1 rounded shadow-sm border border-gray-100 whitespace-nowrap">
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </span>
                
                {field.fieldType === 'signature' ? (
                  <div className="w-full h-full flex items-center justify-center bg-amber-100/50 rounded text-amber-800 text-sm font-medium border border-amber-200/50">
                    {field.value ? (
                      <img src={field.value} className="h-full object-contain mix-blend-multiply" alt="Signature" />
                    ) : (
                      <div className="flex items-center gap-2"><PenTool size={14} /> Sign Here</div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="w-full h-full bg-transparent outline-none px-2 text-sm"
                    placeholder={`Enter ${field.label}...`}
                    value={field.value || ""}
                    onChange={(e) => {
                      // Optimistic local update
                      queryClient.setQueryData(getListEzquillFieldsQueryKey(id), (old: any) => 
                        old.map((f: any) => f.id === field.id ? { ...f, value: e.target.value } : f)
                      );
                    }}
                    onBlur={(e) => handleFieldValueChange(field.id, e.target.value)}
                  />
                )}
              </div>

              <button 
                className="absolute -right-3 -top-3 p-1.5 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full shadow hover:bg-red-600 transition-colors"
                onClick={() => handleDeleteField(field.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign and complete this document?
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex justify-center">
            {signature?.dataUrl ? (
              <img src={signature.dataUrl} className="max-h-[100px] border rounded-lg bg-white p-4 dark:invert" alt="Your signature" />
            ) : (
              <p className="text-destructive">No signature found.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmSign} disabled={signDocument.isPending}>
              {signDocument.isPending ? "Signing..." : "Confirm & Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}