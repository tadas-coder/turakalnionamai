import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, FileText, Bot, Loader2, CheckCircle, AlertCircle, 
  Sparkles, ChevronRight, ChevronLeft, Zap, Receipt
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CostCategory {
  id: string;
  name: string;
  code: string | null;
}

interface Segment {
  id: string;
  name: string;
  color: string | null;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface AnalysisResult {
  vendor_name: string;
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  invoice_status: "paid" | "unpaid" | "partially_paid";
  needs_distribution: boolean;
  distribution_reason: string;
  suggested_segment_ids: string[];
  suggested_segment_names: string[];
  confidence: number;
  analysis_notes: string;
  is_recurring: boolean;
  pattern_match: string | null;
}

interface InvoiceUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: "upload", title: "Įkėlimas", icon: Upload },
  { id: "analysis", title: "AI Analizė", icon: Bot },
  { id: "category", title: "Kategorija", icon: Receipt },
  { id: "distribution", title: "Išdalinimas", icon: Zap },
  { id: "tickets", title: "Problemos", icon: AlertCircle },
  { id: "confirm", title: "Patvirtinimas", icon: CheckCircle },
];

export function InvoiceUploadWizard({ open, onOpenChange, onSuccess }: InvoiceUploadWizardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Form values (editable by admin)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<"paid" | "unpaid" | "partially_paid">("unpaid");
  const [needsDistribution, setNeedsDistribution] = useState(false);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  
  // Fetch data
  const { data: categories = [] } = useQuery({
    queryKey: ["cost-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as CostCategory[];
    },
  });

  const { data: segments = [] } = useQuery({
    queryKey: ["segments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("segments")
        .select("id, name, color")
        .order("name");
      if (error) throw error;
      return data as Segment[];
    },
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["open-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, status, created_at")
        .in("status", ["new", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Ticket[];
    },
  });

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      setFile(null);
      setTitle("");
      setDescription("");
      setIsAnalyzing(false);
      setIsUploading(false);
      setAnalysisResult(null);
      setSelectedCategoryId(null);
      setInvoiceStatus("unpaid");
      setNeedsDistribution(false);
      setSelectedSegmentIds([]);
      setSelectedTicketIds([]);
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const analyzeInvoice = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    try {
      // Try to extract some content for analysis
      let fileContent = "";
      if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        fileContent = await file.text();
      }
      
      const { data, error } = await supabase.functions.invoke("analyze-invoice", {
        body: {
          fileName: file.name,
          fileContent: fileContent.substring(0, 5000), // Limit content size
          vendorHint: title,
        },
      });

      if (error) throw error;
      
      setAnalysisResult(data);
      
      // Pre-fill form with AI suggestions
      if (data.suggested_category_id) {
        setSelectedCategoryId(data.suggested_category_id);
      }
      setInvoiceStatus(data.invoice_status || "unpaid");
      setNeedsDistribution(data.needs_distribution || false);
      if (data.suggested_segment_ids?.length > 0) {
        setSelectedSegmentIds(data.suggested_segment_ids);
      }
      
      toast.success("Sąskaita išanalizuota!");
      setCurrentStep(2); // Move to category step
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Nepavyko išanalizuoti sąskaitos. Tęskite rankiniu būdu.");
      setCurrentStep(2); // Still move forward
    } finally {
      setIsAnalyzing(false);
    }
  };

  const uploadInvoice = async () => {
    if (!file || !title) {
      toast.error("Pasirinkite failą ir įveskite pavadinimą");
      return;
    }

    setIsUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `invoices/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create pattern hash for recognition
      const patternHash = analysisResult?.vendor_name 
        ? `${analysisResult.vendor_name.toLowerCase().replace(/\s+/g, "_")}_${selectedCategoryId || "unknown"}`
        : null;

      // Insert document
      const { data: document, error: insertError } = await supabase
        .from("documents")
        .insert({
          title,
          description: description || null,
          category: "saskaitos-fakturos",
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user?.id,
          visible: true,
          is_invoice: true,
          invoice_status: invoiceStatus,
          cost_category_id: selectedCategoryId,
          needs_distribution: needsDistribution,
          distribution_segment_ids: selectedSegmentIds,
          vendor_pattern_hash: patternHash,
          ai_recognized: analysisResult?.confidence ? analysisResult.confidence > 50 : false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Link to tickets if selected
      if (selectedTicketIds.length > 0 && document) {
        const ticketLinks = selectedTicketIds.map(ticketId => ({
          document_id: document.id,
          ticket_id: ticketId,
        }));
        
        const { error: linkError } = await supabase
          .from("invoice_tickets")
          .insert(ticketLinks);
        
        if (linkError) {
          console.error("Failed to link tickets:", linkError);
        }
      }

      // Save pattern for future recognition
      if (patternHash && analysisResult?.vendor_name) {
        await supabase
          .from("invoice_patterns")
          .upsert({
            pattern_hash: patternHash,
            vendor_name: analysisResult.vendor_name,
            cost_category_id: selectedCategoryId,
            invoice_status: invoiceStatus,
            needs_distribution: needsDistribution,
            distribution_segment_ids: selectedSegmentIds,
            last_used_at: new Date().toISOString(),
          }, {
            onConflict: "pattern_hash",
          });
      }

      toast.success("Sąskaita faktūra įkelta sėkmingai!");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Nepavyko įkelti sąskaitos");
    } finally {
      setIsUploading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 0 && file) {
      setCurrentStep(1);
      analyzeInvoice();
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleSegment = (segmentId: string) => {
    setSelectedSegmentIds(prev =>
      prev.includes(segmentId)
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  const toggleTicket = (ticketId: string) => {
    setSelectedTicketIds(prev =>
      prev.includes(ticketId)
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid": return "Apmokėta";
      case "unpaid": return "Neapmokėta";
      case "partially_paid": return "Dalinai apmokėta";
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Sąskaitos faktūros įkėlimas
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 px-2 py-4 overflow-x-auto">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" :
                    isCompleted ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  <StepIcon className="h-3 w-3" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <ScrollArea className="flex-1 px-1">
          <div className="space-y-4 py-2">
            {/* Step 0: Upload */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-primary" />
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Badge variant="secondary">Pasirinktas</Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">Paspauskite arba nuvilkite failą</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, Word arba Excel dokumentai
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Pavadinimas</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Sąskaitos pavadinimas..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Aprašymas (neprivaloma)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Papildoma informacija..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Step 1: AI Analysis */}
            {currentStep === 1 && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-lg font-medium">AI analizuoja sąskaitą...</p>
                    <p className="text-sm text-muted-foreground">
                      Ieškome tiekėjo, kategorijos ir kitų duomenų
                    </p>
                    <Progress value={66} className="w-48" />
                  </>
                ) : analysisResult ? (
                  <Card className="w-full">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <span className="font-medium">AI Analizės rezultatai</span>
                        <Badge variant={analysisResult.confidence > 70 ? "default" : "secondary"}>
                          {analysisResult.confidence}% tikslumas
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tiekėjas:</span>
                          <p className="font-medium">{analysisResult.vendor_name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Kategorija:</span>
                          <p className="font-medium">{analysisResult.suggested_category_name || "Nenustatyta"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Būsena:</span>
                          <p className="font-medium">{getStatusLabel(analysisResult.invoice_status)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pasikartojanti:</span>
                          <p className="font-medium">{analysisResult.is_recurring ? "Taip" : "Ne"}</p>
                        </div>
                      </div>
                      
                      {analysisResult.analysis_notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {analysisResult.analysis_notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p>Analizė nepavyko. Tęskite rankiniu būdu.</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Category Selection */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sąnaudų kategorija *</Label>
                  <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite kategoriją" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} {cat.code && `(${cat.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {analysisResult?.suggested_category_name && (
                    <p className="text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 inline mr-1" />
                      AI pasiūlymas: {analysisResult.suggested_category_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mokėjimo būsena *</Label>
                  <Select value={invoiceStatus} onValueChange={(v) => setInvoiceStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Neapmokėta</SelectItem>
                      <SelectItem value="paid">Apmokėta</SelectItem>
                      <SelectItem value="partially_paid">Dalinai apmokėta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Distribution */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="needs-distribution"
                    checked={needsDistribution}
                    onCheckedChange={(checked) => setNeedsDistribution(checked as boolean)}
                  />
                  <Label htmlFor="needs-distribution" className="cursor-pointer">
                    Ar reikia išdalinti į mokėjimo lapelius gyventojams?
                  </Label>
                </div>

                {analysisResult?.distribution_reason && (
                  <p className="text-sm text-muted-foreground">
                    <Sparkles className="h-3 w-3 inline mr-1" />
                    AI pastaba: {analysisResult.distribution_reason}
                  </p>
                )}

                {needsDistribution && (
                  <div className="space-y-2">
                    <Label>Pasirinkite segmentus</Label>
                    <ScrollArea className="h-[150px] border rounded-md p-2">
                      <div className="space-y-1">
                        {segments.map(segment => (
                          <div
                            key={segment.id}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                            onClick={() => toggleSegment(segment.id)}
                          >
                            <Checkbox
                              checked={selectedSegmentIds.includes(segment.id)}
                              onCheckedChange={() => toggleSegment(segment.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: segment.color || "#6366f1" }}
                            />
                            <span className="text-sm">{segment.name}</span>
                          </div>
                        ))}
                        {segments.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground py-4">
                            Segmentų nėra
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Link to Tickets */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pasirinkite problemas/užduotis, kurioms ši sąskaita priskirta (neprivaloma):
                </p>
                
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-1">
                    {tickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        onClick={() => toggleTicket(ticket.id)}
                      >
                        <Checkbox
                          checked={selectedTicketIds.includes(ticket.id)}
                          onCheckedChange={() => toggleTicket(ticket.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString("lt-LT")}
                          </p>
                        </div>
                        <Badge variant={ticket.status === "new" ? "destructive" : "secondary"} className="text-xs">
                          {ticket.status === "new" ? "Naujas" : "Vykdomas"}
                        </Badge>
                      </div>
                    ))}
                    {tickets.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Nėra aktyvių problemų
                      </p>
                    )}
                  </div>
                </ScrollArea>

                {selectedTicketIds.length > 0 && (
                  <p className="text-sm">
                    Pasirinkta: <strong>{selectedTicketIds.length}</strong> problemų
                  </p>
                )}
              </div>
            )}

            {/* Step 5: Confirmation */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Patvirtinkite duomenis</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Failas:</span>
                        <p className="font-medium truncate">{file?.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pavadinimas:</span>
                        <p className="font-medium">{title}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kategorija:</span>
                        <p className="font-medium">
                          {categories.find(c => c.id === selectedCategoryId)?.name || "Nepasirinkta"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Būsena:</span>
                        <p className="font-medium">{getStatusLabel(invoiceStatus)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Išdalinti:</span>
                        <p className="font-medium">{needsDistribution ? "Taip" : "Ne"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Problemos:</span>
                        <p className="font-medium">{selectedTicketIds.length} susietos</p>
                      </div>
                    </div>

                    {needsDistribution && selectedSegmentIds.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Segmentai:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedSegmentIds.map(id => {
                            const segment = segments.find(s => s.id === id);
                            return segment ? (
                              <Badge key={id} variant="secondary" className="text-xs">
                                {segment.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0 || isAnalyzing || isUploading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Atgal
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={
                (currentStep === 0 && !file) ||
                (currentStep === 1 && isAnalyzing) ||
                (currentStep === 2 && !selectedCategoryId)
              }
            >
              {currentStep === 0 && !isAnalyzing ? (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Analizuoti su AI
                </>
              ) : currentStep === 1 && isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Analizuojama...
                </>
              ) : (
                <>
                  Toliau
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={uploadInvoice} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Įkeliama...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Įkelti sąskaitą
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
