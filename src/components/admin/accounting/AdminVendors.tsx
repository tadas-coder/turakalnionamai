import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit2, Trash2, Building2, Phone, Mail, MapPin } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Vendor = {
  id: string;
  name: string;
  category: string | null;
  company_code: string | null;
  vat_code: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  contact_person: string | null;
  bank_name: string | null;
  bank_account: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

export function AdminVendors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    company_code: "",
    vat_code: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Lietuva",
    phone: "",
    email: "",
    contact_person: "",
    bank_name: "",
    bank_account: "",
    notes: "",
    is_active: true,
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Vendor[];
    },
  });

  const createVendorMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("vendors").insert({
        name: data.name,
        category: data.category || null,
        company_code: data.company_code || null,
        vat_code: data.vat_code || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        phone: data.phone || null,
        email: data.email || null,
        contact_person: data.contact_person || null,
        bank_name: data.bank_name || null,
        bank_account: data.bank_account || null,
        notes: data.notes || null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Tiekėjas sukurtas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("vendors")
        .update({
          name: data.name,
          category: data.category || null,
          company_code: data.company_code || null,
          vat_code: data.vat_code || null,
          address: data.address || null,
          city: data.city || null,
          postal_code: data.postal_code || null,
          country: data.country || null,
          phone: data.phone || null,
          email: data.email || null,
          contact_person: data.contact_person || null,
          bank_name: data.bank_name || null,
          bank_account: data.bank_account || null,
          notes: data.notes || null,
          is_active: data.is_active,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      setIsDialogOpen(false);
      setEditingVendor(null);
      resetForm();
      toast({ title: "Tiekėjas atnaujintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors"] });
      setDeleteConfirmId(null);
      toast({ title: "Tiekėjas pašalintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      company_code: "",
      vat_code: "",
      address: "",
      city: "",
      postal_code: "",
      country: "Lietuva",
      phone: "",
      email: "",
      contact_person: "",
      bank_name: "",
      bank_account: "",
      notes: "",
      is_active: true,
    });
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      category: vendor.category || "",
      company_code: vendor.company_code || "",
      vat_code: vendor.vat_code || "",
      address: vendor.address || "",
      city: vendor.city || "",
      postal_code: vendor.postal_code || "",
      country: vendor.country || "Lietuva",
      phone: vendor.phone || "",
      email: vendor.email || "",
      contact_person: vendor.contact_person || "",
      bank_name: vendor.bank_name || "",
      bank_account: vendor.bank_account || "",
      notes: vendor.notes || "",
      is_active: vendor.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Klaida", description: "Įveskite tiekėjo pavadinimą", variant: "destructive" });
      return;
    }

    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, data: formData });
    } else {
      createVendorMutation.mutate(formData);
    }
  };

  const filteredVendors = searchQuery
    ? vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.company_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : vendors;

  const activeVendors = filteredVendors.filter((v) => v.is_active !== false);

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
            <CardTitle className="text-sm font-medium">Iš viso tiekėjų</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-xs text-muted-foreground">Aktyvių: {activeVendors.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ieškoti tiekėjų..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingVendor(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Naujas tiekėjas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Redaguoti tiekėją" : "Naujas tiekėjas"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Pavadinimas *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Kategorija</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="pvz. Statyba, Valymas..."
                  />
                </div>
                <div>
                  <Label htmlFor="contact_person">Kontaktinis asmuo</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_code">Įmonės kodas</Label>
                  <Input
                    id="company_code"
                    value={formData.company_code}
                    onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="vat_code">PVM kodas</Label>
                  <Input
                    id="vat_code"
                    value={formData.vat_code}
                    onChange={(e) => setFormData({ ...formData, vat_code: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Adresas</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">Miestas</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Pašto kodas</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Šalis</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefonas</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">El. paštas</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">Bankas</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account">Banko sąskaita</Label>
                  <Input
                    id="bank_account"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
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
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Aktyvus tiekėjas</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Atšaukti
              </Button>
              <Button onClick={handleSubmit}>
                {editingVendor ? "Atnaujinti" : "Sukurti"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vendors Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pavadinimas</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead>Kontaktai</TableHead>
                <TableHead>Įmonės kodas</TableHead>
                <TableHead>Būsena</TableHead>
                <TableHead className="w-[100px]">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Tiekėjų nerasta" : "Nėra įvestų tiekėjų"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        {vendor.contact_person && (
                          <p className="text-xs text-muted-foreground">{vendor.contact_person}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vendor.category || "-"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {vendor.phone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="h-3 w-3" />
                            {vendor.phone}
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3" />
                            {vendor.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vendor.company_code || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={vendor.is_active !== false ? "default" : "secondary"}>
                        {vendor.is_active !== false ? "Aktyvus" : "Neaktyvus"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(vendor)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(vendor.id)}
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
              Šis veiksmas negrįžtamas. Tiekėjas bus visam laikui pašalintas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteVendorMutation.mutate(deleteConfirmId)}
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
