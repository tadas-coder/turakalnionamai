import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit2, Trash2, Package, FolderTree, Settings } from "lucide-react";
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

type Asset = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  location: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  depreciation_rate: number | null;
  notes: string | null;
  asset_group_id: string | null;
  created_at: string;
  updated_at: string;
};

type AssetGroup = {
  id: string;
  name: string;
  name2: string | null;
  description: string | null;
  parent_group_id: string | null;
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Aktyvus", variant: "default" },
  inactive: { label: "Neaktyvus", variant: "secondary" },
  maintenance: { label: "Remontas", variant: "outline" },
  disposed: { label: "Nurašytas", variant: "destructive" },
};

export function AdminAssets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    location: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    depreciation_rate: "",
    notes: "",
    asset_group_id: "",
  });
  const [groupFormData, setGroupFormData] = useState({
    name: "",
    name2: "",
    description: "",
    parent_group_id: "",
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["admin-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Asset[];
    },
  });

  const { data: assetGroups = [] } = useQuery({
    queryKey: ["admin-asset-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_groups")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as AssetGroup[];
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("assets").insert({
        name: data.name,
        description: data.description || null,
        status: data.status,
        location: data.location || null,
        serial_number: data.serial_number || null,
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
        current_value: data.current_value ? parseFloat(data.current_value) : null,
        depreciation_rate: data.depreciation_rate ? parseFloat(data.depreciation_rate) : null,
        notes: data.notes || null,
        asset_group_id: data.asset_group_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Turtas sukurtas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("assets")
        .update({
          name: data.name,
          description: data.description || null,
          status: data.status,
          location: data.location || null,
          serial_number: data.serial_number || null,
          purchase_date: data.purchase_date || null,
          purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
          current_value: data.current_value ? parseFloat(data.current_value) : null,
          depreciation_rate: data.depreciation_rate ? parseFloat(data.depreciation_rate) : null,
          notes: data.notes || null,
          asset_group_id: data.asset_group_id || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      setIsDialogOpen(false);
      setEditingAsset(null);
      resetForm();
      toast({ title: "Turtas atnaujintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-assets"] });
      setDeleteConfirmId(null);
      toast({ title: "Turtas pašalintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: typeof groupFormData) => {
      const { error } = await supabase.from("asset_groups").insert({
        name: data.name,
        name2: data.name2 || null,
        description: data.description || null,
        parent_group_id: data.parent_group_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-asset-groups"] });
      setIsGroupDialogOpen(false);
      setGroupFormData({ name: "", name2: "", description: "", parent_group_id: "" });
      toast({ title: "Grupė sukurta" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "active",
      location: "",
      serial_number: "",
      purchase_date: "",
      purchase_price: "",
      current_value: "",
      depreciation_rate: "",
      notes: "",
      asset_group_id: "",
    });
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      description: asset.description || "",
      status: asset.status,
      location: asset.location || "",
      serial_number: asset.serial_number || "",
      purchase_date: asset.purchase_date || "",
      purchase_price: asset.purchase_price?.toString() || "",
      current_value: asset.current_value?.toString() || "",
      depreciation_rate: asset.depreciation_rate?.toString() || "",
      notes: asset.notes || "",
      asset_group_id: asset.asset_group_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Klaida", description: "Įveskite turto pavadinimą", variant: "destructive" });
      return;
    }

    if (editingAsset) {
      updateAssetMutation.mutate({ id: editingAsset.id, data: formData });
    } else {
      createAssetMutation.mutate(formData);
    }
  };

  const filteredAssets = searchQuery
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.serial_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assets;

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return "-";
    const group = assetGroups.find((g) => g.id === groupId);
    return group?.name || "-";
  };

  const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0);
  const activeCount = assets.filter((a) => a.status === "active").length;

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Iš viso turto</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground">Aktyvaus: {activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bendra vertė</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString("lt-LT")} €</div>
            <p className="text-xs text-muted-foreground">Dabartinė vertė</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Grupės</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetGroups.length}</div>
            <p className="text-xs text-muted-foreground">Turto kategorijos</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ieškoti turto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FolderTree className="h-4 w-4" />
                Nauja grupė
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nauja turto grupė</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="group-name">Pavadinimas *</Label>
                  <Input
                    id="group-name"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="group-name2">Alternatyvus pavadinimas</Label>
                  <Input
                    id="group-name2"
                    value={groupFormData.name2}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name2: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="group-description">Aprašymas</Label>
                  <Textarea
                    id="group-description"
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="parent-group">Tėvinė grupė</Label>
                  <Select
                    value={groupFormData.parent_group_id}
                    onValueChange={(value) => setGroupFormData({ ...groupFormData, parent_group_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite grupę" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Jokia</SelectItem>
                      {assetGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                  Atšaukti
                </Button>
                <Button onClick={() => createGroupMutation.mutate(groupFormData)}>
                  Sukurti
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAsset(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Naujas turtas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAsset ? "Redaguoti turtą" : "Naujas turtas"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Pavadinimas *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                <div>
                  <Label htmlFor="description">Aprašymas</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="asset_group">Grupė</Label>
                    <Select
                      value={formData.asset_group_id}
                      onValueChange={(value) => setFormData({ ...formData, asset_group_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pasirinkite grupę" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Jokia</SelectItem>
                        {assetGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location">Vieta</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="serial_number">Serijinis numeris</Label>
                    <Input
                      id="serial_number"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchase_date">Įsigijimo data</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="purchase_price">Įsigijimo kaina (€)</Label>
                    <Input
                      id="purchase_price"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="current_value">Dabartinė vertė (€)</Label>
                    <Input
                      id="current_value"
                      type="number"
                      step="0.01"
                      value={formData.current_value}
                      onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="depreciation_rate">Nusidėvėjimas (%)</Label>
                    <Input
                      id="depreciation_rate"
                      type="number"
                      step="0.1"
                      value={formData.depreciation_rate}
                      onChange={(e) => setFormData({ ...formData, depreciation_rate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Pastabos</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Atšaukti
                </Button>
                <Button onClick={handleSubmit}>
                  {editingAsset ? "Atnaujinti" : "Sukurti"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pavadinimas</TableHead>
                <TableHead>Grupė</TableHead>
                <TableHead>Vieta</TableHead>
                <TableHead>Būsena</TableHead>
                <TableHead className="text-right">Vertė</TableHead>
                <TableHead className="w-[100px]">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Turto nerasta" : "Nėra įvesto turto"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        {asset.serial_number && (
                          <p className="text-xs text-muted-foreground">SN: {asset.serial_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getGroupName(asset.asset_group_id)}</TableCell>
                    <TableCell>{asset.location || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[asset.status]?.variant || "secondary"}>
                        {statusLabels[asset.status]?.label || asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {asset.current_value ? `${asset.current_value.toLocaleString("lt-LT")} €` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(asset)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(asset.id)}
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
              Šis veiksmas negrįžtamas. Turtas bus visam laikui pašalintas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteAssetMutation.mutate(deleteConfirmId)}
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
