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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Search, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Tariff {
  id: string;
  cost_category_id: string | null;
  name: string;
  tariff_type: string;
  rate: number;
  unit: string | null;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
}

interface CostCategory {
  id: string;
  name: string;
  code: string | null;
}

const TARIFF_TYPES = [
  { value: "fixed", label: "Fiksuotas", unit: "EUR" },
  { value: "per_unit", label: "Už vienetą", unit: "EUR/vnt" },
  { value: "per_m2", label: "Už m²", unit: "EUR/m²" },
  { value: "per_m3", label: "Už m³", unit: "EUR/m³" },
  { value: "per_kwh", label: "Už kWh", unit: "EUR/kWh" },
  { value: "per_invoice", label: "Pagal SF", unit: "%" },
];

export function AdminTariffs() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);
  const [deletingTariff, setDeletingTariff] = useState<Tariff | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    cost_category_id: "",
    tariff_type: "fixed",
    rate: "",
    unit: "EUR",
    valid_from: format(new Date(), "yyyy-MM-dd"),
    valid_to: "",
    is_active: true,
    notes: "",
  });

  const { data: tariffs = [], isLoading } = useQuery({
    queryKey: ["admin-tariffs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tariffs")
        .select("*")
        .order("valid_from", { ascending: false });
      if (error) throw error;
      return data as Tariff[];
    },
  });

  const { data: costCategories = [] } = useQuery({
    queryKey: ["cost-categories-list"],
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("tariffs").insert({
        name: data.name,
        cost_category_id: data.cost_category_id || null,
        tariff_type: data.tariff_type,
        rate: parseFloat(data.rate),
        unit: data.unit || null,
        valid_from: data.valid_from,
        valid_to: data.valid_to || null,
        is_active: data.is_active,
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tariffs"] });
      toast.success("Tarifas sukurtas");
      resetForm();
    },
    onError: () => toast.error("Klaida kuriant tarifą"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("tariffs")
        .update({
          name: data.name,
          cost_category_id: data.cost_category_id || null,
          tariff_type: data.tariff_type,
          rate: parseFloat(data.rate),
          unit: data.unit || null,
          valid_from: data.valid_from,
          valid_to: data.valid_to || null,
          is_active: data.is_active,
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tariffs"] });
      toast.success("Tarifas atnaujintas");
      resetForm();
    },
    onError: () => toast.error("Klaida atnaujinant tarifą"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tariffs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tariffs"] });
      toast.success("Tarifas ištrintas");
      setDeleteDialogOpen(false);
      setDeletingTariff(null);
    },
    onError: () => toast.error("Klaida trinant tarifą"),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      cost_category_id: "",
      tariff_type: "fixed",
      rate: "",
      unit: "EUR",
      valid_from: format(new Date(), "yyyy-MM-dd"),
      valid_to: "",
      is_active: true,
      notes: "",
    });
    setEditingTariff(null);
    setDialogOpen(false);
  };

  const handleEdit = (tariff: Tariff) => {
    setEditingTariff(tariff);
    setFormData({
      name: tariff.name,
      cost_category_id: tariff.cost_category_id || "",
      tariff_type: tariff.tariff_type,
      rate: tariff.rate.toString(),
      unit: tariff.unit || "EUR",
      valid_from: tariff.valid_from,
      valid_to: tariff.valid_to || "",
      is_active: tariff.is_active ?? true,
      notes: tariff.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Įveskite tarifo pavadinimą");
      return;
    }
    if (!formData.rate || isNaN(parseFloat(formData.rate))) {
      toast.error("Įveskite teisingą tarifą");
      return;
    }
    if (editingTariff) {
      updateMutation.mutate({ id: editingTariff.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTariffTypeChange = (type: string) => {
    const typeInfo = TARIFF_TYPES.find((t) => t.value === type);
    setFormData({
      ...formData,
      tariff_type: type,
      unit: typeInfo?.unit || "EUR",
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "-";
    const category = costCategories.find((c) => c.id === categoryId);
    return category ? (category.code ? `${category.code} - ${category.name}` : category.name) : "-";
  };

  const isCurrentlyActive = (tariff: Tariff) => {
    const now = new Date();
    const validFrom = new Date(tariff.valid_from);
    const validTo = tariff.valid_to ? new Date(tariff.valid_to) : null;
    return tariff.is_active && validFrom <= now && (!validTo || validTo >= now);
  };

  const filteredTariffs = tariffs.filter((tariff) => {
    const matchesSearch =
      tariff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryName(tariff.cost_category_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive =
      filterActive === "all" ||
      (filterActive === "active" && isCurrentlyActive(tariff)) ||
      (filterActive === "inactive" && !isCurrentlyActive(tariff));
    return matchesSearch && matchesActive;
  });

  const activeTariffs = tariffs.filter(isCurrentlyActive).length;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(amount);
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viso tarifų</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tariffs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktyvūs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeTariffs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kategorijų</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costCategories.length}</div>
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
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statusas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Visi</SelectItem>
              <SelectItem value="active">Aktyvūs</SelectItem>
              <SelectItem value="inactive">Neaktyvūs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Naujas tarifas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTariff ? "Redaguoti tarifą" : "Naujas tarifas"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Pavadinimas *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Pvz.: Šaltas vanduo 2024"
                />
              </div>
              <div className="grid gap-2">
                <Label>Sąnaudų kategorija</Label>
                <Select
                  value={formData.cost_category_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, cost_category_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite kategoriją" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nepasirinkta</SelectItem>
                    {costCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.code ? `${cat.code} - ${cat.name}` : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tarifo tipas</Label>
                  <Select value={formData.tariff_type} onValueChange={handleTariffTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TARIFF_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tarifas ({formData.unit})</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="0.0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Galioja nuo *</Label>
                  <Input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Galioja iki</Label>
                  <Input
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Aktyvus</Label>
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
                {editingTariff ? "Atnaujinti" : "Sukurti"}
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
                <TableHead>Pavadinimas</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead>Tipas</TableHead>
                <TableHead>Tarifas</TableHead>
                <TableHead>Galiojimas</TableHead>
                <TableHead>Statusas</TableHead>
                <TableHead className="text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTariffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Tarifų nerasta
                  </TableCell>
                </TableRow>
              ) : (
                filteredTariffs.map((tariff) => {
                  const typeInfo = TARIFF_TYPES.find((t) => t.value === tariff.tariff_type);
                  const active = isCurrentlyActive(tariff);
                  return (
                    <TableRow key={tariff.id}>
                      <TableCell className="font-medium">{tariff.name}</TableCell>
                      <TableCell className="text-muted-foreground">{getCategoryName(tariff.cost_category_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeInfo?.label || tariff.tariff_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(tariff.rate)} {tariff.unit}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(tariff.valid_from), "yyyy-MM-dd")}
                        {tariff.valid_to ? ` — ${format(new Date(tariff.valid_to), "yyyy-MM-dd")}` : " — ∞"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={active ? "default" : "secondary"}>
                          {active ? (
                            <>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Aktyvus
                            </>
                          ) : (
                            "Neaktyvus"
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tariff)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingTariff(tariff);
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
            <AlertDialogTitle>Ištrinti tarifą?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti tarifą "{deletingTariff?.name}"? Šis veiksmas negrįžtamas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTariff && deleteMutation.mutate(deletingTariff.id)}
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
