import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, Check, X, AlertCircle, Search, Eye, Loader2, CheckCheck, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { FileDropzone } from "@/components/ui/file-dropzone";
import * as XLSX from "xlsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import PaymentSlipBatchHistory from "./PaymentSlipBatchHistory";

interface PaymentSlip {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  period_month: string;
  buyer_name: string | null;
  apartment_address: string;
  apartment_number: string | null;
  payment_code: string | null;
  previous_amount: number;
  payments_received: number;
  balance: number;
  accrued_amount: number;
  total_due: number;
  line_items: any[];
  utility_readings: any;
  pdf_url: string | null;
  pdf_file_name: string | null;
  resident_id: string | null;
  profile_id: string | null;
  assignment_status: string;
  matched_by: string | null;
  created_at: string;
  residents?: {
    id: string;
    full_name: string;
    apartment_number: string | null;
  } | null;
}

interface Resident {
  id: string;
  full_name: string;
  apartment_number: string | null;
  payment_code: string | null;
  linked_profile_id?: string | null;
}

interface PreviewSlip {
  tempId: string;
  slip: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    buyerName: string;
    apartmentAddress: string;
    apartmentNumber: string;
    paymentCode: string;
    totalDue: number;
    accruedAmount: number;
    lineItemsPreview?: Array<{ name: string; amount: number }>;
    lineItemsCount?: number;
  };
  matchedResident: {
    id: string;
    full_name: string;
    apartment_number: string | null;
  } | null;
  matchType: string;
  matchReason?: string;
  failureReason?: string;
  dataForSave: any;
}

export default function AdminPaymentSlips() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<PaymentSlip | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [previewSlips, setPreviewSlips] = useState<PreviewSlip[]>([]);
  const [previewResidents, setPreviewResidents] = useState<Resident[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [currentFileType, setCurrentFileType] = useState<string>("pdf");
  const queryClient = useQueryClient();

  // Fetch payment slips
  const { data: paymentSlips, isLoading } = useQuery({
    queryKey: ["admin-payment-slips", statusFilter, periodFilter],
    queryFn: async () => {
      let query = supabase
        .from("payment_slips")
        .select(`
          *,
          residents (
            id,
            full_name,
            apartment_number
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("assignment_status", statusFilter);
      }

      if (periodFilter !== "all") {
        query = query.eq("period_month", periodFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentSlip[];
    }
  });

  // Fetch residents for manual assignment
  const { data: residents } = useQuery({
    queryKey: ["residents-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, apartment_number, payment_code")
        .eq("is_active", true)
        .order("apartment_number");
      if (error) throw error;
      return data as Resident[];
    }
  });

  // Get unique periods for filter
  const periods = paymentSlips 
    ? [...new Set(paymentSlips.map(s => s.period_month))].sort().reverse()
    : [];

  // Update assignment mutation
  const updateAssignmentMutation = useMutation<
    { updatedSlip: PaymentSlip; notificationResult: any | null },
    any,
    { slipId: string; residentId: string | null; status: string }
  >({
    mutationFn: async ({
      slipId,
      residentId,
      status,
    }: {
      slipId: string;
      residentId: string | null;
      status: string;
    }) => {
      // First get the resident's profile_id if exists
      let profileId = null;
      if (residentId) {
        const { data: resident } = await supabase
          .from("residents")
          .select("linked_profile_id")
          .eq("id", residentId)
          .maybeSingle();
        profileId = resident?.linked_profile_id || null;
      }

      const { data: updatedSlip, error } = await supabase
        .from("payment_slips")
        .update({
          resident_id: residentId,
          profile_id: profileId,
          assignment_status: status,
          matched_by: residentId ? "manual" : null,
        })
        .eq("id", slipId)
        .select()
        .single();
      if (error) throw error;

      let notificationResult: any | null = null;

      // Send notification if assigned
      if (residentId && updatedSlip) {
        const { data, error: notifError } = await supabase.functions.invoke(
          "send-payment-slip-notification",
          {
            body: {
              slips: [
                {
                  slipId: updatedSlip.id,
                  residentId: updatedSlip.resident_id,
                  profileId: updatedSlip.profile_id,
                  periodMonth: updatedSlip.period_month,
                  totalDue: updatedSlip.total_due,
                  invoiceNumber: updatedSlip.invoice_number,
                  dueDate: updatedSlip.due_date,
                },
              ],
            },
          }
        );

        notificationResult = notifError
          ? { success: false, error: notifError.message }
          : data;

        if (notifError) {
          console.error("Failed to send notification:", notifError);
        } else if (data?.success === false) {
          console.error("Notification function returned an error:", data);
        } else if (data?.failed > 0) {
          console.warn("Some notifications failed:", data);
        }
      }

      return { updatedSlip: updatedSlip as PaymentSlip, notificationResult };
    },
    onSuccess: ({ updatedSlip, notificationResult }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-slips"] });

      const isAssigned = Boolean(updatedSlip?.resident_id);

      if (isAssigned && notificationResult) {
        if (notificationResult.success === false) {
          toast.warning(
            `Priskyrimas atnaujintas, bet laiško išsiųsti nepavyko: ${
              notificationResult.error || "nežinoma klaida"
            }`
          );
        } else if (notificationResult.failed > 0) {
          toast.warning(
            "Priskyrimas atnaujintas, bet dalies laiškų išsiųsti nepavyko (žr. konsolę)."
          );
        } else {
          toast.success("Priskyrimas atnaujintas ir pranešimas išsiųstas");
        }
      } else {
        toast.success("Priskyrimas atnaujintas");
      }

      setIsAssignDialogOpen(false);
      setSelectedSlip(null);
      setSelectedResidentId("");
    },
    onError: (error: any) => {
      toast.error("Klaida: " + error.message);
    },
  });

  // Bulk confirm mutation
  const bulkConfirmMutation = useMutation({
    mutationFn: async (slipIds: string[]) => {
      const { error } = await supabase
        .from("payment_slips")
        .update({ assignment_status: "confirmed" })
        .in("id", slipIds);
      if (error) throw error;
      return slipIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-slips"] });
      toast.success(`Patvirtinta ${count} lapelių`);
    },
    onError: (error: any) => {
      toast.error("Klaida: " + error.message);
    }
  });

  // Get auto-matched slips that can be bulk confirmed
  const autoMatchedSlips = paymentSlips?.filter(s => s.assignment_status === "auto_matched") || [];

  const handleBulkConfirm = () => {
    if (autoMatchedSlips.length === 0) {
      toast.info("Nėra automatiškai priskirtų lapelių patvirtinimui");
      return;
    }
    bulkConfirmMutation.mutate(autoMatchedSlips.map(s => s.id));
  };

  // Handle file upload - now returns preview
  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (!isPDF && !isExcel) {
      toast.error("Prašome pasirinkti PDF arba Excel failą");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress("Įkeliamas failas...");
    
    try {
      // Upload file to storage
      const uploadFileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-slips")
        .upload(uploadFileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("payment-slips")
        .getPublicUrl(uploadFileName);
      
      setUploadProgress("Analizuojami duomenys...");
      
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Neprisijungta");
      
      let requestBody: any = {
        periodMonth: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
        pdfFileName: file.name,
        pdfUrl: publicUrl,
        useAI: true
      };
      
      if (isExcel) {
        setUploadProgress("Analizuojamas Excel failas...");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        requestBody.excelData = jsonData;
      } else if (isPDF) {
        // IMPORTANT: do NOT send PDF as base64 in the request body (request size limit).
        // We already uploaded the file to storage; the backend function can download it directly.
        setUploadProgress("Analizuojamas PDF failas... (tai gali užtrukti iki 2 min.)");
        requestBody.pdfFileName = file.name;
        requestBody.pdfStoragePath = uploadFileName;
      }
      
      // Call edge function with standard invocation
      const response = await supabase.functions.invoke("parse-payment-slips", {
        body: requestBody
      });
      
      if (response.error) {
        // Check if it's a timeout or connection error
        const errMsg = response.error.message || '';
        if (errMsg.includes('Failed to') || 
            errMsg.includes('connection') ||
            errMsg.includes('timeout') ||
            errMsg.includes('edge function') ||
            errMsg.includes('aborted')) {
          throw new Error("Užklausa nutrūko. PDF apdorojimas gali užtrukti iki 2 min. Bandykite dar kartą.");
        }
        throw response.error;
      }
      
      // Check for error in response data
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      
      const { preview, residents: residentsList, stats, message, batchId } = response.data;
      
      if (!preview || preview.length === 0) {
        toast.warning(message || "Nepavyko išanalizuoti mokėjimo lapelių. Patikrinkite ar failas teisingas arba bandykite 'Importuoti iš teksto' funkciją.");
        setIsUploadDialogOpen(false);
        return;
      }
      
      // Show preview dialog
      setPreviewSlips(preview);
      setPreviewResidents(residentsList || []);
      setCurrentBatchId(batchId || null);
      setCurrentFileName(file.name);
      setCurrentFileType(isExcel ? 'excel' : 'pdf');
      setIsUploadDialogOpen(false);
      setIsPreviewDialogOpen(true);
      toast.success(`Rasta ${stats.total} lapelių. Peržiūrėkite ir patvirtinkite priskyrimą.`);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Klaida įkeliant failą: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  }, []);

  // Handle text-based import
  const handleTextImport = async (parsedText: string) => {
    setIsUploading(true);
    setUploadProgress("Apdorojami mokėjimo lapeliai...");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Neprisijungta");

      const response = await supabase.functions.invoke("parse-payment-slips", {
        body: {
          parsedText,
          periodMonth: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
          useAI: true
        }
      });

      if (response.error) throw response.error;

      const { preview, residents: residentsList, stats, batchId } = response.data;
      
      if (!preview || preview.length === 0) {
        toast.warning("Nepavyko rasti mokėjimo lapelių tekste.");
        return;
      }
      
      setPreviewSlips(preview);
      setPreviewResidents(residentsList || []);
      setCurrentBatchId(batchId || null);
      setCurrentFileName("Tekstas");
      setCurrentFileType("text");
      setIsUploadDialogOpen(false);
      setIsPreviewDialogOpen(true);
      toast.info(`Rasta ${stats.total} lapelių. Peržiūrėkite ir patvirtinkite priskyrimą.`);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Klaida importuojant: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Update preview slip resident assignment
  const updatePreviewAssignment = (tempId: string, residentId: string | null) => {
    setPreviewSlips(prev => prev.map(slip => {
      if (slip.tempId !== tempId) return slip;
      
      const resident = residentId ? previewResidents.find(r => r.id === residentId) : null;
      
      return {
        ...slip,
        matchedResident: resident ? {
          id: resident.id,
          full_name: resident.full_name,
          apartment_number: resident.apartment_number
        } : null,
        matchType: resident ? 'manual' : 'none',
        dataForSave: {
          ...slip.dataForSave,
          resident_id: resident?.id || null,
          profile_id: resident?.linked_profile_id || null,
          assignment_status: resident ? 'confirmed' : 'pending',
          matched_by: resident ? 'manual' : null
        }
      };
    }));
  };

  // Save confirmed slips
  const handleSaveSlips = async () => {
    setIsSaving(true);
    
    try {
      const slipsToSave = previewSlips.map(p => ({
        ...p.dataForSave,
        upload_batch_id: null // Will be set by the backend
      }));
      
      const periodMonth = slipsToSave[0]?.period_month || new Date().toISOString().split('T')[0].slice(0, 7) + '-01';
      
      const response = await supabase.functions.invoke("parse-payment-slips", {
        body: {
          action: 'save',
          slipsToSave,
          batchId: currentBatchId,
          pdfFileName: currentFileName,
          fileType: currentFileType,
          periodMonth
        }
      });
      
      if (response.error) throw response.error;
      
      const { stats } = response.data;
      toast.success(`Išsaugota ${stats.total} lapelių. Priskirta: ${stats.matched}, laukia: ${stats.pending}`);
      
      queryClient.invalidateQueries({ queryKey: ["admin-payment-slips"] });
      queryClient.invalidateQueries({ queryKey: ["upload-batches"] });
      setIsPreviewDialogOpen(false);
      setPreviewSlips([]);
      setCurrentBatchId(null);
      setCurrentFileName("");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Klaida išsaugant: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter slips by search
  const filteredSlips = paymentSlips?.filter(slip => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      slip.apartment_number?.toLowerCase().includes(query) ||
      slip.buyer_name?.toLowerCase().includes(query) ||
      slip.invoice_number.toLowerCase().includes(query) ||
      slip.residents?.full_name?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Laukia</Badge>;
      case "auto_matched":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Auto</Badge>;
      case "manually_assigned":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Rankinis</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Patvirtinta</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Atmesta</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case "apartment_number":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Pagal butą</Badge>;
      case "payment_code":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Pagal kodą</Badge>;
      case "name_exact":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Pagal vardą</Badge>;
      case "name_fuzzy":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300">Panašus vardas</Badge>;
      case "name":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Pagal vardą</Badge>;
      case "manual":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">Rankiniu</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Nepriskirta</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Stats
  const stats = {
    total: paymentSlips?.length || 0,
    pending: paymentSlips?.filter(s => s.assignment_status === "pending").length || 0,
    matched: paymentSlips?.filter(s => ["auto_matched", "manually_assigned", "confirmed"].includes(s.assignment_status)).length || 0,
    totalAmount: paymentSlips?.reduce((sum, s) => sum + (s.total_due || 0), 0) || 0
  };

  // Preview stats
  const previewStats = {
    total: previewSlips.length,
    matched: previewSlips.filter(s => s.matchedResident).length,
    pending: previewSlips.filter(s => !s.matchedResident).length,
    totalAmount: previewSlips.reduce((sum, s) => sum + (s.slip.totalDue || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viso lapelių</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Laukia priskyrimo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Priskirta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bendra suma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Įkelti lapelius
          </Button>
          {autoMatchedSlips.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleBulkConfirm}
              disabled={bulkConfirmMutation.isPending}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              {bulkConfirmMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Patvirtinti visus ({autoMatchedSlips.length})
            </Button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ieškoti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statusas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Visi statusai</SelectItem>
              <SelectItem value="pending">Laukia</SelectItem>
              <SelectItem value="auto_matched">Auto priskirta</SelectItem>
              <SelectItem value="manually_assigned">Rankiniu būdu</SelectItem>
              <SelectItem value="confirmed">Patvirtinta</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Periodas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Visi periodai</SelectItem>
              {periods.map(period => (
                <SelectItem key={period} value={period}>
                  {format(new Date(period), "yyyy MMMM", { locale: lt })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Batch History */}
      <PaymentSlipBatchHistory />

      {/* Payment Slips Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Butas</TableHead>
                <TableHead>Pirkėjas</TableHead>
                <TableHead>Sąskaita</TableHead>
                <TableHead>Periodas</TableHead>
                <TableHead className="text-right">Suma</TableHead>
                <TableHead>Priskirta</TableHead>
                <TableHead>Statusas</TableHead>
                <TableHead className="text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Kraunama...
                  </TableCell>
                </TableRow>
              ) : filteredSlips?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Mokėjimo lapelių nerasta
                  </TableCell>
                </TableRow>
              ) : (
                filteredSlips?.map((slip) => (
                  <TableRow key={slip.id}>
                    <TableCell className="font-medium">
                      {slip.apartment_number || "-"}
                    </TableCell>
                    <TableCell>{slip.buyer_name || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {slip.invoice_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(slip.period_month), "yyyy-MM", { locale: lt })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(slip.total_due)}
                    </TableCell>
                    <TableCell>
                      {slip.residents?.full_name || (
                        <span className="text-muted-foreground italic">Nepriskirta</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(slip.assignment_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSlip(slip);
                            setSelectedResidentId(slip.resident_id || "");
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {slip.assignment_status === "auto_matched" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => updateAssignmentMutation.mutate({
                                slipId: slip.id,
                                residentId: slip.resident_id,
                                status: "confirmed"
                              })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => updateAssignmentMutation.mutate({
                                slipId: slip.id,
                                residentId: null,
                                status: "pending"
                              })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Įkelti mokėjimo lapelius</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3">1. Įkelkite PDF arba Excel failą</h4>
              <FileDropzone
                onFilesSelected={handleFilesSelected}
                accept=".pdf,.xlsx,.xls"
                title="Nutempkite PDF arba Excel failą čia"
                description="arba spustelėkite norėdami pasirinkti"
                icon="file"
                disabled={isUploading}
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">arba</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">2. Įklijuokite tekstą rankiniu būdu</h4>
              <textarea
                className="w-full h-40 p-3 border rounded-md font-mono text-sm bg-muted/30"
                placeholder="Įklijuokite išanalizuoto PDF tekstą čia..."
                id="parsedTextInput"
                disabled={isUploading}
              />
            </div>
            
            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadProgress}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
              Atšaukti
            </Button>
            <Button
              onClick={() => {
                const textarea = document.getElementById('parsedTextInput') as HTMLTextAreaElement;
                if (textarea?.value) {
                  handleTextImport(textarea.value);
                } else {
                  toast.error("Prašome įvesti tekstą arba įkelti failą");
                }
              }}
              disabled={isUploading}
            >
              Importuoti tekstą
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview & Confirm Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Patvirtinti mokėjimo lapelių priskyrimą</DialogTitle>
          </DialogHeader>
          
          {/* Preview Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{previewStats.total}</div>
              <div className="text-xs text-muted-foreground">Viso lapelių</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{previewStats.matched}</div>
              <div className="text-xs text-muted-foreground">Priskirta</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{previewStats.pending}</div>
              <div className="text-xs text-muted-foreground">Nepriskirta</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold">{formatCurrency(previewStats.totalAmount)}</div>
              <div className="text-xs text-muted-foreground">Bendra suma</div>
            </div>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                  <TableHead className="w-[80px]">Butas</TableHead>
                  <TableHead>Pirkėjas (faile)</TableHead>
                  <TableHead className="text-right">Suma</TableHead>
                  <TableHead>Priskyrimo būdas</TableHead>
                  <TableHead>Priežastis / Paaiškinimas</TableHead>
                  <TableHead className="w-[250px]">Priskirti gyventojui</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewSlips.map((preview) => (
                  <TableRow key={preview.tempId} className={preview.matchedResident ? "bg-green-50/30" : "bg-yellow-50/30"}>
                    <TableCell className="font-medium">
                      {preview.slip.apartmentNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{preview.slip.buyerName || "-"}</div>
                        <div className="text-xs text-muted-foreground">{preview.slip.invoiceNumber}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(preview.slip.totalDue)}
                    </TableCell>
                    <TableCell>
                      {getMatchTypeBadge(preview.matchType)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {preview.matchedResident ? (
                        <span className="text-xs text-green-700">{preview.matchReason || 'Automatiškai priskirta'}</span>
                      ) : (
                        <span className="text-xs text-yellow-700">{preview.failureReason || 'Nepavyko priskirti automatiškai'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={preview.matchedResident?.id ?? "__none__"}
                        onValueChange={(value) =>
                          updatePreviewAssignment(
                            preview.tempId,
                            value === "__none__" ? null : value
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pasirinkite gyventoją">
                            {preview.matchedResident ? (
                              <span className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-green-600" />
                                {preview.matchedResident.apartment_number && `${preview.matchedResident.apartment_number} - `}
                                {preview.matchedResident.full_name}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-muted-foreground">
                                <UserX className="h-4 w-4" />
                                Nepriskirta
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">Nepriskirta</span>
                          </SelectItem>
                          {previewResidents.map((resident) => (
                            <SelectItem key={resident.id} value={resident.id}>
                              {resident.apartment_number ? `${resident.apartment_number} - ` : ""}
                              {resident.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPreviewDialogOpen(false);
                setPreviewSlips([]);
              }}
              disabled={isSaving}
            >
              Atšaukti
            </Button>
            <Button
              onClick={handleSaveSlips}
              disabled={isSaving || previewSlips.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saugoma...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Patvirtinti ir išsaugoti ({previewSlips.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mokėjimo lapelio informacija</DialogTitle>
          </DialogHeader>
          {selectedSlip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sąskaita</label>
                  <p className="font-medium">{selectedSlip.invoice_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Butas</label>
                  <p className="font-medium">{selectedSlip.apartment_number || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pirkėjas</label>
                  <p className="font-medium">{selectedSlip.buyer_name || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mokėtojo kodas</label>
                  <p className="font-medium">{selectedSlip.payment_code || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mokėtina suma</label>
                  <p className="font-medium text-lg">{formatCurrency(selectedSlip.total_due)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Terminas</label>
                  <p className="font-medium">{format(new Date(selectedSlip.due_date), "yyyy-MM-dd")}</p>
                </div>
              </div>

              {selectedSlip.line_items && selectedSlip.line_items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Paslaugos</label>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pavadinimas</TableHead>
                          <TableHead className="text-right">Suma</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSlip.line_items.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Priskirti gyventojui
                </label>
                <Select 
                  value={selectedResidentId || "__none__"} 
                  onValueChange={(value) => setSelectedResidentId(value === "__none__" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite gyventoją" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nepriskirta</SelectItem>
                    {residents?.map((resident) => (
                      <SelectItem key={resident.id} value={resident.id}>
                        {resident.apartment_number ? `${resident.apartment_number} - ` : ""}
                        {resident.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Atšaukti
            </Button>
            <Button
              onClick={() => {
                if (selectedSlip) {
                  updateAssignmentMutation.mutate({
                    slipId: selectedSlip.id,
                    residentId: selectedResidentId || null,
                    status: selectedResidentId ? "manually_assigned" : "pending"
                  });
                }
              }}
            >
              Išsaugoti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
