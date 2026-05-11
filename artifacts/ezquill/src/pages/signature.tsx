import { useState, useRef, useEffect } from "react";
import { useGetEzquillSignature, useSaveEzquillSignature, getGetEzquillSignatureQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, Upload, Eraser, Save, Check } from "lucide-react";

export default function Signature() {
  const { data: signature, isLoading } = useGetEzquillSignature();
  const saveSignature = useSaveEzquillSignature();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (signature?.dataUrl) {
      setUploadedImage(signature.dataUrl);
    }
  }, [signature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Support touch and mouse
    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    
    // Create a new canvas to generate image with white background (or transparent if preferred, default is transparent)
    // To be safe we'll use a temporary canvas to draw white background
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    if (ctx) {
      // transparent background is better for signatures on docs
      ctx.drawImage(canvas, 0, 0);
      saveSignatureDataUrl(tempCanvas.toDataURL("image/png"));
    }
  };

  const saveSignatureDataUrl = (dataUrl: string) => {
    saveSignature.mutate(
      { data: { dataUrl } },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(getGetEzquillSignatureQueryKey(), saved);
          setUploadedImage(saved.dataUrl || null);
          toast({
            title: "Signature saved",
            description: "Your signature is ready to be used on documents.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to save signature.",
            variant: "destructive",
          });
        }
      }
    );
  };

  // Init canvas styles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#0f172a"; // dark foreground color
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto w-full animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-64 bg-muted rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <PenTool className="h-8 w-8 text-primary" />
          My Signature
        </h1>
        <p className="text-muted-foreground mt-2">
          Create or upload your signature. This will be securely saved and applied to your documents with one click.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Tabs defaultValue="draw" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="draw">Draw</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl bg-card overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="w-full h-[200px] cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearCanvas} className="flex-1" type="button">
                  <Eraser className="mr-2 h-4 w-4" /> Clear
                </Button>
                <Button 
                  onClick={handleSaveDrawing} 
                  disabled={!hasDrawn || saveSignature.isPending} 
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" /> Save Drawing
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl bg-card p-12 text-center hover:bg-muted/50 transition-colors relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-medium">Click to upload or drag & drop</div>
                  <div className="text-xs text-muted-foreground">PNG, JPG up to 5MB</div>
                </div>
              </div>
              {uploadedImage && uploadedImage !== signature?.dataUrl && (
                <Button 
                  onClick={() => saveSignatureDataUrl(uploadedImage)} 
                  disabled={saveSignature.isPending}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" /> Save Uploaded Signature
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Current Saved Signature</h3>
          {signature?.dataUrl || uploadedImage ? (
            <Card className="border bg-white overflow-hidden shadow-sm">
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[200px]">
                <img 
                  src={signature?.dataUrl || uploadedImage || ""} 
                  alt="Saved signature" 
                  className="max-h-[150px] object-contain dark:invert" 
                />
                <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full">
                  <Check className="h-4 w-4 mr-1" /> Active Signature
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-dashed bg-muted/30">
              <CardContent className="p-8 flex flex-col items-center justify-center min-h-[200px] text-center text-muted-foreground">
                <PenTool className="h-8 w-8 mb-2 opacity-50" />
                <p>No signature saved yet.</p>
                <p className="text-sm">Create one to start signing documents.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}