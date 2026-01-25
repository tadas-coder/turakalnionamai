import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Upload, 
  Loader2, 
  Sparkles, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft,
  Building2,
  FolderTree,
  FileText,
  AlertCircle
} from "lucide-react";

type Vendor = {
  id: string;
  name: string;
};

type CostCategory = {
  id: string;
  name: string;
  code: string | null;
};

type AnalysisResult = {
  vendor_name: string | null;
  vendor_company_code: string | null;
  vendor_vat_code: string | null;
  vendor_category: string | null;
  suggested_vendor_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  description: string | null;
  suggested_category_id: string | null;
  confidence: number;
  is_recurring: boolean;
  pattern_match: {
    vendor_id: string | null;
    cost_category_id: string | null;
  } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

const STEPS = [
  { id: 1, title: "Įkelti failą", icon: Upload },
  { id: 2, title: "AI analizė", icon: Sparkles },
  { id: 3, title: "Tiekėjas", icon: Building2 },
  { id: 4, title: "Kategorija", icon: FolderTree },
  { id: 5, title: "Patvirtinti", icon: CheckCircle },
];

export function VendorInvoiceUploadWizard({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form data
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [newVendorName, setNewVendorName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<string>("pending");

  const { data: vendors = [] } = useQuery({
    queryKey: ["admin-vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Vendor[];
    },
  });

  const { data: costCategories = [] } = useQuery({
    queryKey: ["admin-cost-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as CostCategory[];
    },
  });

  const resetWizard = useCallback(() => {
    setStep(1);
    setFile(null);
    setAnalysisResult(null);
    setSelectedVendorId("");
    setNewVendorName("");
    setSelectedCategoryId("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setDueDate("");
    setSubtotal("");
    setVatAmount("");
    setTotalAmount("");
    setDescription("");
    setInvoiceStatus("pending");
    setDuplicateWarning(null);
  }, []);

  // Check for duplicate invoice number
  const checkDuplicate = useCallback(async (number: string) => {
    if (!number.trim()) {
      setDuplicateWarning(null);
      return;
    }
    
    const { data } = await supabase
      .from("vendor_invoices")
      .select("id, invoice_date")
      .eq("invoice_number", number.trim())
      .maybeSingle();
    
    if (data) {
      setDuplicateWarning(`Sąskaita "${number}" jau egzistuoja (${data.invoice_date})`);
    } else {
      setDuplicateWarning(null);
    }
  }, []);

  const handleFileSelect = useCallback((files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setStep(2);

    try {
      // Convert file to base64 for AI vision analysis
      let fileBase64: string | null = null;
      
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        fileBase64 = btoa(binary);
      }

      const { data, error } = await supabase.functions.invoke("analyze-vendor-invoice", {
        body: { 
          fileName: file.name,
          fileType: file.type,
          fileBase64,
          vendors: vendors.map(v => ({ id: v.id, name: v.name })),
          categories: costCategories.map(c => ({ id: c.id, name: c.name, code: c.code }))
        },
      });

      if (error) throw error;

      const result = data as AnalysisResult;
      setAnalysisResult(result);

      // Pre-fill form with AI suggestions
      if (result.suggested_vendor_id) {
        setSelectedVendorId(result.suggested_vendor_id);
      } else if (result.pattern_match?.vendor_id) {
        setSelectedVendorId(result.pattern_match.vendor_id);
      } else if (result.vendor_name) {
        setNewVendorName(result.vendor_name);
      }

      if (result.suggested_category_id) {
        setSelectedCategoryId(result.suggested_category_id);
      } else if (result.pattern_match?.cost_category_id) {
        setSelectedCategoryId(result.pattern_match.cost_category_id);
      }

      if (result.invoice_number) setInvoiceNumber(result.invoice_number);
      if (result.invoice_date) setInvoiceDate(result.invoice_date);
      if (result.due_date) setDueDate(result.due_date);
      if (result.subtotal) setSubtotal(result.subtotal.toString());
      if (result.vat_amount) setVatAmount(result.vat_amount.toString());
      if (result.total_amount) setTotalAmount(result.total_amount.toString());
      if (result.description) setDescription(result.description);

      toast({
        title: result.is_recurring ? "Atpažinta pasikartojanti sąskaita!" : "Analizė baigta",
        description: result.is_recurring 
          ? "Pritaikyti ankstesni nustatymai" 
          : `Patikimumas: ${Math.round(result.confidence * 100)}%`,
      });

      setStep(3);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analizės klaida",
        description: "Nepavyko išanalizuoti failo. Galite tęsti rankiniu būdu.",
        variant: "destructive",
      });
      setStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: "Klaida", description: "Pasirinkite failą", variant: "destructive" });
      return;
    }

    if (!invoiceNumber || !invoiceDate) {
      toast({ title: "Klaida", description: "Įveskite sąskaitos numerį ir datą", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for duplicate invoice number
      const { data: existingInvoice, error: checkError } = await supabase
        .from("vendor_invoices")
        .select("id, invoice_number, invoice_date, vendor_id")
        .eq("invoice_number", invoiceNumber.trim())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingInvoice) {
        setIsSubmitting(false);
        toast({
          title: "Sąskaita jau egzistuoja",
          description: `Sąskaita su numeriu "${invoiceNumber}" jau yra sistemoje (data: ${existingInvoice.invoice_date})`,
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error("Duplicate check error:", error);
      setIsSubmitting(false);
      toast({
        title: "Klaida",
        description: "Nepavyko patikrinti dublikatų",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-invoices")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("vendor-invoices")
        .getPublicUrl(filePath);

      // 2. Create vendor if new - with all extracted details
      let vendorId = selectedVendorId;
      if (!vendorId && newVendorName.trim()) {
        const { data: newVendor, error: vendorError } = await supabase
          .from("vendors")
          .insert({ 
            name: newVendorName.trim(), 
            is_active: true,
            company_code: analysisResult?.vendor_company_code || null,
            vat_code: analysisResult?.vendor_vat_code || null,
            category: analysisResult?.vendor_category || null,
          })
          .select()
          .single();

        if (vendorError) throw vendorError;
        vendorId = newVendor.id;
        queryClient.invalidateQueries({ queryKey: ["admin-vendors-list"] });
        queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      }

      // 3. Create invoice record
      const { error: invoiceError } = await supabase.from("vendor_invoices").insert({
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        vendor_id: vendorId || null,
        cost_category_id: selectedCategoryId || null,
        description: description || null,
        subtotal: parseFloat(subtotal) || 0,
        vat_amount: vatAmount ? parseFloat(vatAmount) : null,
        total_amount: parseFloat(totalAmount) || 0,
        status: invoiceStatus,
        file_name: file.name,
        file_url: urlData.publicUrl,
      });

      if (invoiceError) throw invoiceError;

      // 4. Save pattern for future recognition
      if (vendorId && analysisResult?.vendor_name) {
        const patternHash = `${analysisResult.vendor_name.toLowerCase().replace(/\s+/g, "_")}`;
        
        await supabase.from("vendor_invoice_patterns").upsert({
          vendor_name: analysisResult.vendor_name,
          pattern_hash: patternHash,
          vendor_id: vendorId,
          cost_category_id: selectedCategoryId || null,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: "pattern_hash",
        });
      }

      toast({ title: "Sąskaita įkelta", description: "Tiekėjo sąskaita sėkmingai išsaugota" });
      
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-invoices"] });
      resetWizard();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Klaida",
        description: error instanceof Error ? error.message : "Nepavyko išsaugoti sąskaitos",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = () => {
    const sub = parseFloat(subtotal) || 0;
    const vat = parseFloat(vatAmount) || 0;
    setTotalAmount((sub + vat).toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetWizard();
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            SF įkėlimas su AI
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                step >= s.id 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}>
                <s.icon className="h-4 w-4" />
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${step > s.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <FileDropzone
              onFilesSelected={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
              maxFiles={1}
              maxSize={10}
            />
            {file && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Badge variant="outline">Paruošta</Badge>
                </CardContent>
              </Card>
            )}
            <div className="flex justify-end">
              <Button onClick={handleAnalyze} disabled={!file} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Analizuoti su AI
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 2 && isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">AI analizuoja sąskaitą...</p>
            <p className="text-sm text-muted-foreground">Ieškoma tiekėjo, sumos, datos</p>
          </div>
        )}

        {/* Step 3: Vendor Selection */}
        {step === 3 && (
          <div className="space-y-4">
            {analysisResult?.is_recurring && (
              <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Atpažinta pasikartojanti sąskaita
                    </p>
                    <p className="text-sm text-green-600/80 dark:text-green-500/80">
                      Pritaikyti ankstesni nustatymai
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Pasirinkite tiekėją</Label>
              <Select value={selectedVendorId || "none"} onValueChange={(v) => {
                setSelectedVendorId(v === "none" ? "" : v);
                if (v !== "none") setNewVendorName("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Pasirinkite tiekėją" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Naujas tiekėjas --</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedVendorId && (
              <div className="space-y-2">
                <Label>Naujo tiekėjo pavadinimas</Label>
                <Input
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  placeholder="Įveskite tiekėjo pavadinimą"
                />
              </div>
            )}

            {analysisResult?.vendor_name && !selectedVendorId && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                AI siūlo: {analysisResult.vendor_name}
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Atgal
              </Button>
              <Button onClick={() => setStep(4)} className="gap-2">
                Toliau
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Category & Details */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sąskaitos Nr. *</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    checkDuplicate(e.target.value);
                  }}
                  placeholder="SF-001"
                  className={duplicateWarning ? "border-destructive" : ""}
                />
                {duplicateWarning && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {duplicateWarning}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Būsena</Label>
                <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Laukia</SelectItem>
                    <SelectItem value="approved">Patvirtinta</SelectItem>
                    <SelectItem value="paid">Apmokėta</SelectItem>
                    <SelectItem value="overdue">Vėluoja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sąskaitos data *</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Apmokėti iki</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sąnaudų kategorija</Label>
              <Select value={selectedCategoryId || "none"} onValueChange={(v) => setSelectedCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pasirinkite kategoriją" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nepasirinkta</SelectItem>
                  {costCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code ? `${c.code} - ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Suma be PVM (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                  onBlur={calculateTotal}
                />
              </div>
              <div className="space-y-2">
                <Label>PVM (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={vatAmount}
                  onChange={(e) => setVatAmount(e.target.value)}
                  onBlur={calculateTotal}
                />
              </div>
              <div className="space-y-2">
                <Label>Bendra suma (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Aprašymas</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sąskaitos aprašymas..."
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Atgal
              </Button>
              <Button onClick={() => setStep(5)} className="gap-2">
                Peržiūrėti
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failas:</span>
                  <span className="font-medium">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sąskaitos Nr.:</span>
                  <span className="font-medium">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiekėjas:</span>
                  <span className="font-medium">
                    {selectedVendorId 
                      ? vendors.find(v => v.id === selectedVendorId)?.name 
                      : newVendorName || "-"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kategorija:</span>
                  <span className="font-medium">
                    {selectedCategoryId 
                      ? costCategories.find(c => c.id === selectedCategoryId)?.name 
                      : "-"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suma:</span>
                  <span className="font-bold text-lg">{totalAmount} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Būsena:</span>
                  <Badge variant={invoiceStatus === "paid" ? "default" : "outline"}>
                    {invoiceStatus === "pending" && "Laukia"}
                    {invoiceStatus === "approved" && "Patvirtinta"}
                    {invoiceStatus === "paid" && "Apmokėta"}
                    {invoiceStatus === "overdue" && "Vėluoja"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {analysisResult?.is_recurring && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Šis šablonas bus išsaugotas ateities atpažinimui
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Atgal
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Išsaugoti
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
