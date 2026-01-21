import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit2, Trash2, Receipt, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { lt } from "date-fns/locale";

type VendorInvoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  vendor_id: string | null;
  description: string | null;
  subtotal: number;
  vat_amount: number | null;
  total_amount: number;
  paid_amount: number | null;
  status: string;
  period_month: string | null;
  cost_category_id: string | null;
  file_name: string | null;
  file_url: string | null;
  created_at: string;
};

type Vendor = {
  id: string;
  name: string;
};

type CostCategory = {
  id: string;
  name: string;
  code: string | null;
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Laukia", variant: "outline" },
  approved: { label: "Patvirtinta", variant: "secondary" },
  paid: { label: "Apmokėta", variant: "default" },
  overdue: { label: "Vėluoja", variant: "destructive" },
  cancelled: { label: "Atšaukta", variant: "secondary" },
};

export function AdminVendorInvoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<VendorInvoice | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    vendor_id: "",
    description: "",
    subtotal: "",
    vat_amount: "",
    total_amount: "",
    status: "pending",
    period_month: "",
    cost_category_id: "",
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["admin-vendor-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_invoices")
        .select("*")
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data as VendorInvoice[];
    },
  });

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

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("vendor_invoices").insert({
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        due_date: data.due_date || null,
        vendor_id: data.vendor_id || null,
        description: data.description || null,
        subtotal: parseFloat(data.subtotal) || 0,
        vat_amount: data.vat_amount ? parseFloat(data.vat_amount) : null,
        total_amount: parseFloat(data.total_amount) || 0,
        status: data.status,
        period_month: data.period_month || null,
        cost_category_id: data.cost_category_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-invoices"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Sąskaita sukurta" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("vendor_invoices")
        .update({
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          due_date: data.due_date || null,
          vendor_id: data.vendor_id || null,
          description: data.description || null,
          subtotal: parseFloat(data.subtotal) || 0,
          vat_amount: data.vat_amount ? parseFloat(data.vat_amount) : null,
          total_amount: parseFloat(data.total_amount) || 0,
          status: data.status,
          period_month: data.period_month || null,
          cost_category_id: data.cost_category_id || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-invoices"] });
      setIsDialogOpen(false);
      setEditingInvoice(null);
      resetForm();
      toast({ title: "Sąskaita atnaujinta" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor-invoices"] });
      setDeleteConfirmId(null);
      toast({ title: "Sąskaita pašalinta" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      invoice_number: "",
      invoice_date: "",
      due_date: "",
      vendor_id: "",
      description: "",
      subtotal: "",
      vat_amount: "",
      total_amount: "",
      status: "pending",
      period_month: "",
      cost_category_id: "",
    });
  };

  const handleEdit = (invoice: VendorInvoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || "",
      vendor_id: invoice.vendor_id || "",
      description: invoice.description || "",
      subtotal: invoice.subtotal.toString(),
      vat_amount: invoice.vat_amount?.toString() || "",
      total_amount: invoice.total_amount.toString(),
      status: invoice.status,
      period_month: invoice.period_month || "",
      cost_category_id: invoice.cost_category_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.invoice_number.trim()) {
      toast({ title: "Klaida", description: "Įveskite sąskaitos numerį", variant: "destructive" });
      return;
    }
    if (!formData.invoice_date) {
      toast({ title: "Klaida", description: "Įveskite sąskaitos datą", variant: "destructive" });
      return;
    }

    if (editingInvoice) {
      updateInvoiceMutation.mutate({ id: editingInvoice.id, data: formData });
    } else {
      createInvoiceMutation.mutate(formData);
    }
  };

  const calculateTotalFromSubtotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const vat = parseFloat(formData.vat_amount) || 0;
    setFormData({ ...formData, total_amount: (subtotal + vat).toString() });
  };

  const filteredInvoices = searchQuery
    ? invoices.filter(
        (i) =>
          i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : invoices;

  const getVendorName = (vendorId: string | null) => {
    if (!vendorId) return "-";
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor?.name || "-";
  };

  const totalPending = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + i.total_amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total_amount, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Iš viso sąskaitų</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Laukia apmokėjimo</CardTitle>
            <CreditCard className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPending.toLocaleString("lt-LT")} €</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Apmokėta</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaid.toLocaleString("lt-LT")} €</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vėluojančios</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ieškoti sąskaitų..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingInvoice(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nauja sąskaita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? "Redaguoti sąskaitą" : "Nauja sąskaita"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_number">Sąskaitos Nr. *</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Būsena</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoice_date">Sąskaitos data *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Apmokėti iki</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor">Tiekėjas</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite tiekėją" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nepasirinkta</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cost_category">Sąnaudų kategorija</Label>
                  <Select
                    value={formData.cost_category_id}
                    onValueChange={(value) => setFormData({ ...formData, cost_category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite kategoriją" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nepasirinkta</SelectItem>
                      {costCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.code ? `${cat.code} - ${cat.name}` : cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Aprašymas</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subtotal">Suma be PVM (€)</Label>
                  <Input
                    id="subtotal"
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    onBlur={calculateTotalFromSubtotal}
                  />
                </div>
                <div>
                  <Label htmlFor="vat_amount">PVM (€)</Label>
                  <Input
                    id="vat_amount"
                    type="number"
                    step="0.01"
                    value={formData.vat_amount}
                    onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value })}
                    onBlur={calculateTotalFromSubtotal}
                  />
                </div>
                <div>
                  <Label htmlFor="total_amount">Bendra suma (€) *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="period_month">Laikotarpis (mėnuo)</Label>
                <Input
                  id="period_month"
                  type="month"
                  value={formData.period_month}
                  onChange={(e) => setFormData({ ...formData, period_month: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Atšaukti
              </Button>
              <Button onClick={handleSubmit}>
                {editingInvoice ? "Atnaujinti" : "Sukurti"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sąskaitos Nr.</TableHead>
                <TableHead>Tiekėjas</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Apmokėti iki</TableHead>
                <TableHead className="text-right">Suma</TableHead>
                <TableHead>Būsena</TableHead>
                <TableHead className="w-[100px]">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Sąskaitų nerasta" : "Nėra įvestų sąskaitų"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        {invoice.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{invoice.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getVendorName(invoice.vendor_id)}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.invoice_date), "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date ? format(new Date(invoice.due_date), "yyyy-MM-dd") : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {invoice.total_amount.toLocaleString("lt-LT")} €
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[invoice.status]?.variant || "secondary"}>
                        {statusLabels[invoice.status]?.label || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(invoice)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(invoice.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ar tikrai norite pašalinti?</AlertDialogTitle>
            <AlertDialogDescription>
              Šis veiksmas negrįžtamas. Sąskaita bus visam laikui pašalinta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteInvoiceMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Pašalinti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
