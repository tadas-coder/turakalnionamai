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
import { Plus, Pencil, Trash2, Calendar, Lock, Unlock, Search } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";

interface Period {
  id: string;
  name: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  is_open: boolean;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const MONTHS = [
  { value: 1, label: "Sausis" },
  { value: 2, label: "Vasaris" },
  { value: 3, label: "Kovas" },
  { value: 4, label: "Balandis" },
  { value: 5, label: "Gegužė" },
  { value: 6, label: "Birželis" },
  { value: 7, label: "Liepa" },
  { value: 8, label: "Rugpjūtis" },
  { value: 9, label: "Rugsėjis" },
  { value: 10, label: "Spalis" },
  { value: 11, label: "Lapkritis" },
  { value: 12, label: "Gruodis" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export function AdminPeriods() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState<Period | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");

  const [formData, setFormData] = useState({
    year: currentYear,
    month: new Date().getMonth() + 1,
    notes: "",
  });

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["admin-periods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("periods")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data as Period[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const monthName = MONTHS.find((m) => m.value === data.month)?.label || "";
      const startDate = new Date(data.year, data.month - 1, 1);
      const endDate = new Date(data.year, data.month, 0);

      const { error } = await supabase.from("periods").insert({
        name: `${data.year} ${monthName}`,
        year: data.year,
        month: data.month,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-periods"] });
      toast.success("Periodas sukurtas");
      resetForm();
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Šis periodas jau egzistuoja");
      } else {
        toast.error("Klaida kuriant periodą");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const monthName = MONTHS.find((m) => m.value === data.month)?.label || "";
      const startDate = new Date(data.year, data.month - 1, 1);
      const endDate = new Date(data.year, data.month, 0);

      const { error } = await supabase
        .from("periods")
        .update({
          name: `${data.year} ${monthName}`,
          year: data.year,
          month: data.month,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-periods"] });
      toast.success("Periodas atnaujintas");
      resetForm();
    },
    onError: () => toast.error("Klaida atnaujinant periodą"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("periods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-periods"] });
      toast.success("Periodas ištrintas");
      setDeleteDialogOpen(false);
      setDeletingPeriod(null);
    },
    onError: () => toast.error("Klaida trinant periodą"),
  });

  const toggleOpenMutation = useMutation({
    mutationFn: async ({ id, is_open }: { id: string; is_open: boolean }) => {
      const { error } = await supabase
        .from("periods")
        .update({
          is_open,
          closed_at: is_open ? null : new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-periods"] });
      toast.success("Periodo statusas pakeistas");
    },
    onError: () => toast.error("Klaida keičiant statusą"),
  });

  const resetForm = () => {
    setFormData({
      year: currentYear,
      month: new Date().getMonth() + 1,
      notes: "",
    });
    setEditingPeriod(null);
    setDialogOpen(false);
  };

  const handleEdit = (period: Period) => {
    setEditingPeriod(period);
    setFormData({
      year: period.year,
      month: period.month,
      notes: period.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPeriod) {
      updateMutation.mutate({ id: editingPeriod.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPeriods = periods.filter((period) => {
    const matchesSearch = period.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = filterYear === "all" || period.year.toString() === filterYear;
    return matchesSearch && matchesYear;
  });

  const openPeriods = periods.filter((p) => p.is_open).length;
  const closedPeriods = periods.filter((p) => !p.is_open).length;

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viso periodų</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{periods.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atviri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{openPeriods}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uždaryti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{closedPeriods}</div>
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
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Metai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Visi metai</SelectItem>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Naujas periodas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPeriod ? "Redaguoti periodą" : "Naujas periodas"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="year">Metai</Label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="month">Mėnuo</Label>
                  <Select
                    value={formData.month.toString()}
                    onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Pastabos</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Papildomos pastabos..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Atšaukti
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPeriod ? "Atnaujinti" : "Sukurti"}
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
                <TableHead>Periodas</TableHead>
                <TableHead>Datos</TableHead>
                <TableHead>Statusas</TableHead>
                <TableHead>Pastabos</TableHead>
                <TableHead className="text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPeriods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Periodų nerasta
                  </TableCell>
                </TableRow>
              ) : (
                filteredPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(period.start_date), "yyyy-MM-dd")} — {format(new Date(period.end_date), "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={period.is_open ? "default" : "secondary"}>
                        {period.is_open ? (
                          <>
                            <Unlock className="h-3 w-3 mr-1" />
                            Atviras
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Uždarytas
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {period.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleOpenMutation.mutate({ id: period.id, is_open: !period.is_open })}
                          title={period.is_open ? "Uždaryti periodą" : "Atidaryti periodą"}
                        >
                          {period.is_open ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(period)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingPeriod(period);
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti periodą?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti periodą "{deletingPeriod?.name}"? Šis veiksmas negrįžtamas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPeriod && deleteMutation.mutate(deletingPeriod.id)}
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
