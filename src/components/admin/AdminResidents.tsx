import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Users, 
  Mail, 
  Upload, 
  Building2, 
  Phone, 
  CheckCircle, 
  Clock,
  Send,
  Trash2,
  Edit2,
  X,
  Save,
  FileSpreadsheet
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";

type Resident = {
  id: string;
  payment_code: string | null;
  full_name: string;
  address: string | null;
  apartment_number: string | null;
  phone: string | null;
  email: string | null;
  correspondence_address: string | null;
  company_code: string | null;
  pvm_code: string | null;
  receives_mail: boolean;
  receives_email: boolean;
  is_active: boolean;
  linked_profile_id: string | null;
  invitation_sent_at: string | null;
  invitation_token: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function AdminResidents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set());
  const [newResident, setNewResident] = useState({
    full_name: "",
    email: "",
    phone: "",
    apartment_number: "",
    address: "",
    notes: "",
  });

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["admin-residents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .order("apartment_number", { ascending: true });
      if (error) throw error;
      return data as Resident[];
    },
  });

  const addResidentMutation = useMutation({
    mutationFn: async (resident: typeof newResident) => {
      const { error } = await supabase.from("residents").insert({
        full_name: resident.full_name,
        email: resident.email || null,
        phone: resident.phone || null,
        apartment_number: resident.apartment_number || null,
        address: resident.address || null,
        notes: resident.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
      setIsAddDialogOpen(false);
      setNewResident({ full_name: "", email: "", phone: "", apartment_number: "", address: "", notes: "" });
      toast({ title: "Gyventojas pridėtas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const updateResidentMutation = useMutation({
    mutationFn: async (resident: Resident) => {
      const { error } = await supabase
        .from("residents")
        .update({
          full_name: resident.full_name,
          email: resident.email,
          phone: resident.phone,
          apartment_number: resident.apartment_number,
          address: resident.address,
          notes: resident.notes,
          is_active: resident.is_active,
        })
        .eq("id", resident.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
      setEditingResident(null);
      toast({ title: "Gyventojas atnaujintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteResidentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("residents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
      setDeleteConfirmId(null);
      toast({ title: "Gyventojas pašalintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const sendInvitationMutation = useMutation({
    mutationFn: async (resident: Resident) => {
      const portalUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke("send-resident-invitation", {
        body: {
          residentId: resident.id,
          residentName: resident.full_name,
          residentEmail: resident.email,
          portalUrl,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
      toast({ title: "Pakvietimas išsiųstas", description: "El. laiškas su pakvietimu sėkmingai išsiųstas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida siunčiant pakvietimą", description: error.message, variant: "destructive" });
    },
  });

  const sendBulkInvitationsMutation = useMutation({
    mutationFn: async (residentIds: string[]) => {
      const portalUrl = window.location.origin;
      const results = await Promise.allSettled(
        residentIds.map(async (id) => {
          const resident = residents.find((r) => r.id === id);
          if (!resident || !resident.email) return null;
          
          const { data, error } = await supabase.functions.invoke("send-resident-invitation", {
            body: {
              residentId: resident.id,
              residentName: resident.full_name,
              residentEmail: resident.email,
              portalUrl,
            },
          });
          if (error) throw error;
          return data;
        })
      );
      
      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      
      return { successful, failed };
    },
    onSuccess: ({ successful, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
      setSelectedResidents(new Set());
      toast({ 
        title: "Pakvietimai išsiųsti", 
        description: `Sėkmingai: ${successful}, Nepavyko: ${failed}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const importResidentsMutation = useMutation({
    mutationFn: async (residentsData: Array<{ full_name: string; [key: string]: any }>) => {
      const { error } = await supabase.from("residents").insert(residentsData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-residents"] });
      setIsUploadDialogOpen(false);
      toast({ title: "Gyventojai importuoti", description: "Duomenys sėkmingai įkelti" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida importuojant", description: error.message, variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Find header row (the one with "Eil. Nr.")
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.some((cell: any) => String(cell).includes("Eil. Nr."))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          toast({ title: "Klaida", description: "Nepavyko rasti antraštės eilutės", variant: "destructive" });
          return;
        }

        const dataRows = jsonData.slice(headerRowIndex + 1);
        const residentsToImport: Partial<Resident>[] = [];

        for (const row of dataRows) {
          if (!row || row.length < 3) continue;
          
          const paymentCode = row[1]?.toString();
          const fullName = row[2]?.toString();
          const address = row[3]?.toString();
          const phone = row[5]?.toString();
          const email = row[6]?.toString()?.replace(/\\/g, "");
          const correspondenceAddress = row[7]?.toString();
          const companyCode = row[8]?.toString();
          const pvmCode = row[9]?.toString();
          const receivesMail = row[10]?.toString()?.includes("Pašto");
          const receivesEmail = row[11]?.toString()?.includes("El.");

          if (!fullName || fullName.trim() === "") continue;

          // Extract apartment number from address
          let apartmentNumber = "";
          const apartmentMatch = address?.match(/- (\d+)/);
          if (apartmentMatch) {
            apartmentNumber = apartmentMatch[1];
          } else if (address?.includes("garažas") || address?.includes("parkingas")) {
            const specialMatch = address?.match(/\(([^)]+)\)/);
            if (specialMatch) {
              apartmentNumber = specialMatch[1];
            }
          }

          // Get first email if multiple
          const primaryEmail = email?.split(",")[0]?.trim();

          residentsToImport.push({
            payment_code: paymentCode || null,
            full_name: fullName.trim(),
            address: address || null,
            apartment_number: apartmentNumber || null,
            phone: phone || null,
            email: primaryEmail || null,
            correspondence_address: correspondenceAddress || null,
            company_code: companyCode || null,
            pvm_code: pvmCode || null,
            receives_mail: !!receivesMail,
            receives_email: !!receivesEmail,
            is_active: !fullName.includes("(Negyvena)"),
          });
        }

        if (residentsToImport.length === 0) {
          toast({ title: "Klaida", description: "Nepavyko rasti gyventojų duomenų", variant: "destructive" });
          return;
        }

        importResidentsMutation.mutate(residentsToImport as Array<{ full_name: string; [key: string]: any }>);
      } catch (error: any) {
        toast({ title: "Klaida skaitant failą", description: error.message, variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredResidents = searchQuery
    ? residents.filter(
        (r) =>
          r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.apartment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.phone?.includes(searchQuery)
      )
    : residents;

  const activeResidents = filteredResidents.filter((r) => r.is_active);
  const inactiveResidents = filteredResidents.filter((r) => !r.is_active);

  const toggleSelectResident = (id: string) => {
    const newSelected = new Set(selectedResidents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResidents(newSelected);
  };

  const selectAllWithEmail = () => {
    const withEmail = residents.filter((r) => r.email && r.is_active && !r.invitation_sent_at);
    setSelectedResidents(new Set(withEmail.map((r) => r.id)));
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ieškoti pagal vardą, el. paštą, butą..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Importuoti iš Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importuoti gyventojus</DialogTitle>
                <DialogDescription>
                  Įkelkite Excel failą su gyventojų sąrašu. Failas turi turėti stulpelius: Vardas, Adresas, Telefonas, El. paštas.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="excel-file">Excel failas</Label>
                <Input
                  id="excel-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="mt-2"
                />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Users className="h-4 w-4" />
                Pridėti gyventoją
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pridėti naują gyventoją</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">Vardas, pavardė *</Label>
                  <Input
                    id="name"
                    value={newResident.full_name}
                    onChange={(e) => setNewResident({ ...newResident, full_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="apartment">Buto numeris</Label>
                    <Input
                      id="apartment"
                      value={newResident.apartment_number}
                      onChange={(e) => setNewResident({ ...newResident, apartment_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefonas</Label>
                    <Input
                      id="phone"
                      value={newResident.phone}
                      onChange={(e) => setNewResident({ ...newResident, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">El. paštas</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newResident.email}
                    onChange={(e) => setNewResident({ ...newResident, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="address">Adresas</Label>
                  <Input
                    id="address"
                    value={newResident.address}
                    onChange={(e) => setNewResident({ ...newResident, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Pastabos</Label>
                  <Textarea
                    id="notes"
                    value={newResident.notes}
                    onChange={(e) => setNewResident({ ...newResident, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => addResidentMutation.mutate(newResident)}
                  disabled={!newResident.full_name || addResidentMutation.isPending}
                >
                  Pridėti
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{residents.length}</p>
                <p className="text-sm text-muted-foreground">Iš viso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{activeResidents.length}</p>
                <p className="text-sm text-muted-foreground">Aktyvūs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{residents.filter((r) => r.email).length}</p>
                <p className="text-sm text-muted-foreground">Su el. paštu</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{residents.filter((r) => r.invitation_sent_at).length}</p>
                <p className="text-sm text-muted-foreground">Pakviesti</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedResidents.size > 0 && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-sm">
                Pažymėta: <strong>{selectedResidents.size}</strong> gyventojų
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedResidents(new Set())}
                >
                  Atšaukti
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => sendBulkInvitationsMutation.mutate(Array.from(selectedResidents))}
                  disabled={sendBulkInvitationsMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                  Siųsti pakvietimus
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select All Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={selectAllWithEmail} className="gap-2">
          <Mail className="h-4 w-4" />
          Pažymėti visus su el. paštu (nepakviestus)
        </Button>
      </div>

      {/* Residents Table */}
      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Kraunama...</p>
      ) : residents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Gyventojų sąrašas tuščias</p>
            <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Importuoti iš Excel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Aktyvūs gyventojai ({activeResidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Butas</TableHead>
                    <TableHead>Vardas, pavardė</TableHead>
                    <TableHead>El. paštas</TableHead>
                    <TableHead>Telefonas</TableHead>
                    <TableHead>Būsena</TableHead>
                    <TableHead className="text-right">Veiksmai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeResidents.map((resident) => (
                    <TableRow key={resident.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedResidents.has(resident.id)}
                          onChange={() => toggleSelectResident(resident.id)}
                          disabled={!resident.email}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {resident.apartment_number || "-"}
                      </TableCell>
                      <TableCell>
                        {editingResident?.id === resident.id ? (
                          <Input
                            value={editingResident.full_name}
                            onChange={(e) =>
                              setEditingResident({ ...editingResident, full_name: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          resident.full_name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingResident?.id === resident.id ? (
                          <Input
                            value={editingResident.email || ""}
                            onChange={(e) =>
                              setEditingResident({ ...editingResident, email: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm">{resident.email || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingResident?.id === resident.id ? (
                          <Input
                            value={editingResident.phone || ""}
                            onChange={(e) =>
                              setEditingResident({ ...editingResident, phone: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm">{resident.phone || "-"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {resident.linked_profile_id ? (
                          <Badge variant="default" className="bg-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Prisijungęs
                          </Badge>
                        ) : resident.invitation_sent_at ? (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pakviestas
                          </Badge>
                        ) : resident.email ? (
                          <Badge variant="outline">Nepakvietas</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Nėra el. pašto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {editingResident?.id === resident.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateResidentMutation.mutate(editingResident)}
                                disabled={updateResidentMutation.isPending}
                              >
                                <Save className="h-4 w-4 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingResident(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {resident.email && !resident.linked_profile_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => sendInvitationMutation.mutate(resident)}
                                  disabled={sendInvitationMutation.isPending}
                                  title="Siųsti pakvietimą"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingResident(resident)}
                                title="Redaguoti"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirmId(resident.id)}
                                title="Ištrinti"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inactive Residents */}
      {inactiveResidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              Neaktyvūs / Negyvena ({inactiveResidents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Butas</TableHead>
                    <TableHead>Vardas, pavardė</TableHead>
                    <TableHead>El. paštas</TableHead>
                    <TableHead className="text-right">Veiksmai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveResidents.map((resident) => (
                    <TableRow key={resident.id} className="text-muted-foreground">
                      <TableCell>{resident.apartment_number || "-"}</TableCell>
                      <TableCell>{resident.full_name}</TableCell>
                      <TableCell>{resident.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(resident.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ar tikrai norite ištrinti?</AlertDialogTitle>
            <AlertDialogDescription>
              Šis veiksmas negrįžtamas. Gyventojo duomenys bus pašalinti visam laikui.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteResidentMutation.mutate(deleteConfirmId)}
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
