import { useState } from "react";
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
import { Upload, FileText, Check, X, AlertCircle, Search, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";

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
}

export default function AdminPaymentSlips() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<PaymentSlip | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
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
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ slipId, residentId, status }: { slipId: string; residentId: string | null; status: string }) => {
      const resident = residents?.find(r => r.id === residentId);
      const { error } = await supabase
        .from("payment_slips")
        .update({
          resident_id: residentId,
          profile_id: null, // Will be updated when resident links their profile
          assignment_status: status,
          matched_by: residentId ? "manual" : null
        })
        .eq("id", slipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-slips"] });
      toast.success("Priskyrimas atnaujintas");
      setIsAssignDialogOpen(false);
      setSelectedSlip(null);
      setSelectedResidentId("");
    },
    onError: (error: any) => {
      toast.error("Klaida: " + error.message);
    }
  });

  // Handle PDF upload and parsing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) {
      toast.error("Prašome pasirinkti PDF failą");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Įkeliamas failas...");

    try {
      // Upload PDF to storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-slips")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-slips")
        .getPublicUrl(fileName);

      setUploadProgress("Analizuojamas PDF...");

      // Read PDF as text (simplified - in production you'd use a proper PDF parser)
      // For now, we'll send to edge function which will parse it
      const formData = new FormData();
      formData.append('file', file);

      // Since we can't parse PDF directly in browser, we'll use a manual approach
      // The user will need to provide parsed text or we'll store the PDF and parse later
      
      // For now, let's create a simple entry with the PDF attached
      toast.info("PDF įkeltas. Naudokite 'Importuoti iš teksto' funkciją duomenims įvesti.");
      
      setUploadProgress("");
      setIsUploading(false);
      setIsUploadDialogOpen(false);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Klaida įkeliant failą: " + error.message);
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  // Handle text-based import (from parsed document)
  const handleTextImport = async (parsedText: string) => {
    setIsUploading(true);
    setUploadProgress("Apdorojami mokėjimo lapeliai...");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Neprisijungta");

      const response = await supabase.functions.invoke("parse-payment-slips", {
        body: {
          parsedText,
          periodMonth: new Date().toISOString().split('T')[0].slice(0, 7) + '-01'
        }
      });

      if (response.error) throw response.error;

      const { stats } = response.data;
      toast.success(`Importuota ${stats.total} lapelių. Priskirta: ${stats.matched}, laukia: ${stats.pending}`);
      queryClient.invalidateQueries({ queryKey: ["admin-payment-slips"] });
      setIsUploadDialogOpen(false);
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Klaida importuojant: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress("");
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
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Įkopijuokite išanalizuotą PDF tekstą žemiau
              </p>
              <textarea
                className="w-full h-64 p-3 border rounded-md font-mono text-sm"
                placeholder="Įklijuokite mokėjimo lapelių tekstą čia..."
                id="parsedTextInput"
              />
            </div>
            {uploadProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                {uploadProgress}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Atšaukti
            </Button>
            <Button
              onClick={() => {
                const textarea = document.getElementById('parsedTextInput') as HTMLTextAreaElement;
                if (textarea?.value) {
                  handleTextImport(textarea.value);
                } else {
                  toast.error("Prašome įvesti tekstą");
                }
              }}
              disabled={isUploading}
            >
              Importuoti
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
                <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite gyventoją" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nepriskirta</SelectItem>
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
