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
import { Plus, Pencil, Trash2, Upload, Link2, Search, ArrowUpRight, ArrowDownLeft, FileText } from "lucide-react";
import { format } from "date-fns";

interface BankStatement {
  id: string;
  account_number: string | null;
  transaction_date: string;
  document_no: string | null;
  payer_recipient: string | null;
  details: string | null;
  reference: string | null;
  entry_unique_no: string | null;
  amount: number;
  currency: string | null;
  entry_type: string | null;
  assigned_vendor_id: string | null;
  assigned_resident_id: string | null;
  assigned_vendor_invoice_id: string | null;
  assigned_resident_invoice_id: string | null;
  assignment_status: string | null;
  period_id: string | null;
  notes: string | null;
  created_at: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Resident {
  id: string;
  full_name: string;
  apartment_number: string | null;
}

export function AdminBankStatements() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingStatement, setEditingStatement] = useState<BankStatement | null>(null);
  const [deletingStatement, setDeletingStatement] = useState<BankStatement | null>(null);
  const [assigningStatement, setAssigningStatement] = useState<BankStatement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState({
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    payer_recipient: "",
    details: "",
    reference: "",
    amount: "",
    entry_type: "credit",
    notes: "",
  });

  const [assignData, setAssignData] = useState({
    assigned_vendor_id: "",
    assigned_resident_id: "",
  });

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ["admin-bank-statements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_statements")
        .select("*")
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data as BankStatement[];
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Vendor[];
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("bank_statements").insert({
        transaction_date: data.transaction_date,
        payer_recipient: data.payer_recipient || null,
        details: data.details || null,
        reference: data.reference || null,
        amount: parseFloat(data.amount),
        entry_type: data.entry_type,
        notes: data.notes || null,
        assignment_status: "unassigned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bank-statements"] });
      toast.success("Įrašas sukurtas");
      resetForm();
    },
    onError: () => toast.error("Klaida kuriant įrašą"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("bank_statements")
        .update({
          transaction_date: data.transaction_date,
          payer_recipient: data.payer_recipient || null,
          details: data.details || null,
          reference: data.reference || null,
          amount: parseFloat(data.amount),
          entry_type: data.entry_type,
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bank-statements"] });
      toast.success("Įrašas atnaujintas");
      resetForm();
    },
    onError: () => toast.error("Klaida atnaujinant įrašą"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_statements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bank-statements"] });
      toast.success("Įrašas ištrintas");
      setDeleteDialogOpen(false);
      setDeletingStatement(null);
    },
    onError: () => toast.error("Klaida trinant įrašą"),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof assignData }) => {
      const { error } = await supabase
        .from("bank_statements")
        .update({
          assigned_vendor_id: data.assigned_vendor_id || null,
          assigned_resident_id: data.assigned_resident_id || null,
          assignment_status: data.assigned_vendor_id || data.assigned_resident_id ? "manually_matched" : "unassigned",
          assigned_at: data.assigned_vendor_id || data.assigned_resident_id ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bank-statements"] });
      toast.success("Sudengimas atnaujintas");
      setAssignDialogOpen(false);
      setAssigningStatement(null);
    },
    onError: () => toast.error("Klaida priskiriant"),
  });

  const resetForm = () => {
    setFormData({
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      payer_recipient: "",
      details: "",
      reference: "",
      amount: "",
      entry_type: "credit",
      notes: "",
    });
    setEditingStatement(null);
    setDialogOpen(false);
  };

  const handleEdit = (statement: BankStatement) => {
    setEditingStatement(statement);
    setFormData({
      transaction_date: statement.transaction_date,
      payer_recipient: statement.payer_recipient || "",
      details: statement.details || "",
      reference: statement.reference || "",
      amount: statement.amount.toString(),
      entry_type: statement.entry_type || "credit",
      notes: statement.notes || "",
    });
    setDialogOpen(true);
  };

  const handleAssign = (statement: BankStatement) => {
    setAssigningStatement(statement);
    setAssignData({
      assigned_vendor_id: statement.assigned_vendor_id || "",
      assigned_resident_id: statement.assigned_resident_id || "",
    });
    setAssignDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.amount || isNaN(parseFloat(formData.amount))) {
      toast.error("Įveskite teisingą sumą");
      return;
    }
    if (editingStatement) {
      updateMutation.mutate({ id: editingStatement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredStatements = statements.filter((s) => {
    const matchesSearch =
      s.payer_recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || s.assignment_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCredit = statements.filter((s) => s.entry_type === "credit").reduce((sum, s) => sum + s.amount, 0);
  const totalDebit = statements.filter((s) => s.entry_type === "debit").reduce((sum, s) => sum + s.amount, 0);
  const unassignedCount = statements.filter((s) => s.assignment_status === "unassigned").length;

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Viso įrašų</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statements.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gauta (Credit)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCredit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Išmokėta (Debit)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDebit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nepriskirta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unassignedCount}</div>
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
              <SelectItem value="unassigned">Nepriskirti</SelectItem>
              <SelectItem value="manually_matched">Priskirti</SelectItem>
              <SelectItem value="auto_matched">Auto priskirti</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Naujas įrašas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingStatement ? "Redaguoti įrašą" : "Naujas banko įrašas"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="transaction_date">Data</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entry_type">Tipas</Label>
                  <Select
                    value={formData.entry_type}
                    onValueChange={(value) => setFormData({ ...formData, entry_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Gauta (Credit)</SelectItem>
                      <SelectItem value="debit">Išmokėta (Debit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Suma (EUR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payer_recipient">Mokėtojas / Gavėjas</Label>
                <Input
                  id="payer_recipient"
                  value={formData.payer_recipient}
                  onChange={(e) => setFormData({ ...formData, payer_recipient: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="details">Paskirtis</Label>
                <Textarea
                  id="details"
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reference">Nuoroda</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Pastabos</Label>
                <Textarea
                  id="notes"
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
                {editingStatement ? "Atnaujinti" : "Sukurti"}
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
                <TableHead>Data</TableHead>
                <TableHead>Tipas</TableHead>
                <TableHead>Suma</TableHead>
                <TableHead>Mokėtojas / Gavėjas</TableHead>
                <TableHead>Paskirtis</TableHead>
                <TableHead>Statusas</TableHead>
                <TableHead className="text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStatements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Įrašų nerasta
                  </TableCell>
                </TableRow>
              ) : (
                filteredStatements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell>{format(new Date(statement.transaction_date), "yyyy-MM-dd")}</TableCell>
                    <TableCell>
                      {statement.entry_type === "credit" ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <ArrowDownLeft className="h-3 w-3 mr-1" />
                          Gauta
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          Išmokėta
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className={statement.entry_type === "credit" ? "text-green-600" : "text-red-600"}>
                        {statement.entry_type === "credit" ? "+" : "-"}
                        {formatCurrency(Math.abs(statement.amount))}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{statement.payer_recipient || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {statement.details || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statement.assignment_status === "unassigned"
                            ? "destructive"
                            : statement.assignment_status === "auto_matched"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {statement.assignment_status === "unassigned"
                          ? "Nepriskirta"
                          : statement.assignment_status === "auto_matched"
                          ? "Auto"
                          : "Priskirta"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleAssign(statement)} title="Priskirti">
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(statement)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingStatement(statement);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Priskirti mokėjimą</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground">Suma</div>
              <div className="text-lg font-bold">
                {assigningStatement && formatCurrency(assigningStatement.amount)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {assigningStatement?.payer_recipient}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Priskirti tiekėjui</Label>
              <Select
                value={assignData.assigned_vendor_id || "none"}
                onValueChange={(value) =>
                  setAssignData({
                    ...assignData,
                    assigned_vendor_id: value === "none" ? "" : value,
                    assigned_resident_id: "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pasirinkite tiekėją" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nepasirinkta</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priskirti gyventojui</Label>
              <Select
                value={assignData.assigned_resident_id || "none"}
                onValueChange={(value) =>
                  setAssignData({
                    ...assignData,
                    assigned_resident_id: value === "none" ? "" : value,
                    assigned_vendor_id: "",
                  })
                }
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Atšaukti
            </Button>
            <Button
              onClick={() => assigningStatement && assignMutation.mutate({ id: assigningStatement.id, data: assignData })}
              disabled={assignMutation.isPending}
            >
              Priskirti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti įrašą?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti šį banko įrašą? Šis veiksmas negrįžtamas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStatement && deleteMutation.mutate(deletingStatement.id)}
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
