import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText, Search, Eye, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface ResidentInvoice {
  id: string;
  resident_id: string;
  period_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  previous_balance: number | null;
  current_amount: number;
  penalty_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  status: string | null;
  notes: string | null;
  created_at: string;
}

interface Resident {
  id: string;
  full_name: string;
  apartment_number: string | null;
}

interface Period {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Laukiama", icon: Clock, variant: "secondary" },
  partially_paid: { label: "Dalinai apmokėta", icon: AlertTriangle, variant: "outline" },
  paid: { label: "Apmokėta", icon: CheckCircle, variant: "default" },
  overdue: { label: "Vėluojama", icon: AlertTriangle, variant: "destructive" },
};

export function AdminResidentInvoices() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ResidentInvoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<ResidentInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState({
    resident_id: "",
    period_id: "",
    invoice_number: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    due_date: "",
    previous_balance: "0",
    current_amount: "0",
    penalty_amount: "0",
    paid_amount: "0",
    notes: "",
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["admin-resident-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resident_invoices")
        .select("*")
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data as ResidentInvoice[];
    },
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id, full_name, apartment_number")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as Resident[];
    },
  });

  const { data: periods = [] } = useQuery({
    queryKey: ["periods-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periods")
        .select("id, name")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data as Period[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const previousBalance = parseFloat(data.previous_balance) || 0;
      const currentAmount = parseFloat(data.current_amount) || 0;
      const penaltyAmount = parseFloat(data.penalty_amount) || 0;
      const totalAmount = previousBalance + currentAmount + penaltyAmount;
      const paidAmount = parseFloat(data.paid_amount) || 0;

      let status = "pending";
      if (paidAmount >= totalAmount) status = "paid";
      else if (paidAmount > 0) status = "partially_paid";
      else if (new Date(data.due_date) < new Date()) status = "overdue";

      const { error } = await supabase.from("resident_invoices").insert({
        resident_id: data.resident_id,
        period_id: data.period_id || null,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        due_date: data.due_date,
        previous_balance: previousBalance,
        current_amount: currentAmount,
        penalty_amount: penaltyAmount,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        status,
        notes: data.notes || null,
        fully_paid_at: status === "paid" ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resident-invoices"] });
      toast.success("Sąskaita sukurta");
      resetForm();
    },
    onError: () => toast.error("Klaida kuriant sąskaitą"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const previousBalance = parseFloat(data.previous_balance) || 0;
      const currentAmount = parseFloat(data.current_amount) || 0;
      const penaltyAmount = parseFloat(data.penalty_amount) || 0;
      const totalAmount = previousBalance + currentAmount + penaltyAmount;
      const paidAmount = parseFloat(data.paid_amount) || 0;

      let status = "pending";
      if (paidAmount >= totalAmount) status = "paid";
      else if (paidAmount > 0) status = "partially_paid";
      else if (new Date(data.due_date) < new Date()) status = "overdue";

      const { error } = await supabase
        .from("resident_invoices")
        .update({
          resident_id: data.resident_id,
          period_id: data.period_id || null,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          previous_balance: previousBalance,
          current_amount: currentAmount,
          penalty_amount: penaltyAmount,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          status,
          notes: data.notes || null,
          fully_paid_at: status === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resident-invoices"] });
      toast.success("Sąskaita atnaujinta");
      resetForm();
    },
    onError: () => toast.error("Klaida atnaujinant sąskaitą"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resident_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-resident-invoices"] });
      toast.success("Sąskaita ištrinta");
      setDeleteDialogOpen(false);
      setDeletingInvoice(null);
    },
    onError: () => toast.error("Klaida trinant sąskaitą"),
  });

  const resetForm = () => {
    setFormData({
      resident_id: "",
      period_id: "",
      invoice_number: "",
      invoice_date: format(new Date(), "yyyy-MM-dd"),
      due_date: "",
      previous_balance: "0",
      current_amount: "0",
      penalty_amount: "0",
      paid_amount: "0",
      notes: "",
    });
    setEditingInvoice(null);
    setDialogOpen(false);
  };

  const handleEdit = (invoice: ResidentInvoice) => {
    setEditingInvoice(invoice);
    setFormData({
      resident_id: invoice.resident_id,
      period_id: invoice.period_id || "",
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      previous_balance: (invoice.previous_balance || 0).toString(),
      current_amount: invoice.current_amount.toString(),
      penalty_amount: (invoice.penalty_amount || 0).toString(),
      paid_amount: (invoice.paid_amount || 0).toString(),
      notes: invoice.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.resident_id) {
      toast.error("Pasirinkite gyventoją");
      return;
    }
    if (!formData.invoice_number.trim()) {
      toast.error("Įveskite sąskaitos numerį");
      return;
    }
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getResidentName = (residentId: string) => {
    const resident = residents.find((r) => r.id === residentId);
    return resident ? `${resident.full_name} ${resident.apartment_number ? `(${resident.apartment_number})` : ""}` : "-";
  };

  const getPeriodName = (periodId: string | null) => {
    if (!periodId) return "-";
    const period = periods.find((p) => p.id === periodId);
    return period?.name || "-";
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getResidentName(invoice.resident_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalDue = invoices.reduce((sum, inv) => sum + inv.total_amount - (inv.paid_amount || 0), 0);
  const paidInvoices = invoices.filter((inv) => inv.status === "paid").length;
  const overdueInvoices = invoices.filter((inv) => inv.status === "overdue").length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR" }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viso sąskaitų</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Neapmokėta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalDue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Apmokėtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vėluojančios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ieškoti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Statusas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Visi</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nauja sąskaita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? "Redaguoti sąskaitą" : "Nauja sąskaita"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label>Gyventojas *</Label>
                <Select
                  value={formData.resident_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, resident_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite gyventoją" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nepasirinkta</SelectItem>
                    {residents.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.full_name} {r.apartment_number ? `(${r.apartment_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Periodas</Label>
                  <Select
                    value={formData.period_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, period_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nepasirinkta</SelectItem>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Sąskaitos Nr. *</Label>
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="SAS-2024-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Sąskaitos data</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Apmokėti iki</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Ankstesnis likutis (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.previous_balance}
                    onChange={(e) => setFormData({ ...formData, previous_balance: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Einamoji suma (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.current_amount}
                    onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Delspinigiai (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.penalty_amount}
                    onChange={(e) => setFormData({ ...formData, penalty_amount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Apmokėta (EUR)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Bendra suma</div>
                <div className="text-lg font-bold">
                  {formatCurrency(
                    (parseFloat(formData.previous_balance) || 0) +
                      (parseFloat(formData.current_amount) || 0) +
                      (parseFloat(formData.penalty_amount) || 0)
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Pastabos</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Atšaukti
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingInvoice ? "Atnaujinti" : "Sukurti"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Gyventojas</TableHead>
                <TableHead>Periodas</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Suma</TableHead>
                <TableHead>Apmokėta</TableHead>
                <TableHead>Statusas</TableHead>
                <TableHead className="text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Sąskaitų nerasta
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const statusConfig = STATUS_CONFIG[invoice.status || "pending"];
                  const IconComponent = statusConfig.icon;
                  const remaining = invoice.total_amount - (invoice.paid_amount || 0);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>{getResidentName(invoice.resident_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{getPeriodName(invoice.period_id)}</TableCell>
                      <TableCell>{format(new Date(invoice.invoice_date), "yyyy-MM-dd")}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>
                        <span className={invoice.paid_amount && invoice.paid_amount > 0 ? "text-green-600" : ""}>
                          {formatCurrency(invoice.paid_amount || 0)}
                        </span>
                        {remaining > 0 && (
                          <span className="text-sm text-muted-foreground ml-1">
                            (liko {formatCurrency(remaining)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(invoice)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingInvoice(invoice);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti sąskaitą?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti sąskaitą "{deletingInvoice?.invoice_number}"? Šis veiksmas negrįžtamas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInvoice && deleteMutation.mutate(deletingInvoice.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ištrinti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
