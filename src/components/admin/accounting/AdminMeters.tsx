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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Gauge, Search, Droplets, Thermometer, Zap, ClipboardList } from "lucide-react";
import { format } from "date-fns";

interface Meter {
  id: string;
  asset_id: string | null;
  resident_id: string | null;
  meter_number: string | null;
  meter_type: string;
  location: string | null;
  is_electronic: boolean | null;
  install_date: string | null;
  next_verification_date: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string;
}

interface MeterReading {
  id: string;
  meter_id: string;
  period_id: string | null;
  reading_date: string;
  reading_value: number;
  previous_value: number | null;
  consumption: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

interface Resident {
  id: string;
  full_name: string;
  apartment_number: string | null;
}

const METER_TYPES = [
  { value: "cold_water", label: "Šaltas vanduo", icon: Droplets, color: "text-blue-500" },
  { value: "hot_water", label: "Karštas vanduo", icon: Droplets, color: "text-red-500" },
  { value: "heat", label: "Šiluma", icon: Thermometer, color: "text-orange-500" },
  { value: "electricity_t1", label: "Elektra T1", icon: Zap, color: "text-yellow-500" },
  { value: "electricity_t2", label: "Elektra T2", icon: Zap, color: "text-yellow-600" },
];

export function AdminMeters() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("meters");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<Meter | null>(null);
  const [deletingMeter, setDeletingMeter] = useState<Meter | null>(null);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [formData, setFormData] = useState({
    resident_id: "",
    meter_number: "",
    meter_type: "cold_water",
    location: "",
    is_electronic: false,
    install_date: "",
    next_verification_date: "",
    notes: "",
  });

  const [readingFormData, setReadingFormData] = useState({
    reading_date: format(new Date(), "yyyy-MM-dd"),
    reading_value: "",
    notes: "",
  });

  const { data: meters = [], isLoading } = useQuery({
    queryKey: ["admin-meters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Meter[];
    },
  });

  const { data: readings = [] } = useQuery({
    queryKey: ["admin-meter-readings", selectedMeter?.id],
    queryFn: async () => {
      if (!selectedMeter) return [];
      const { data, error } = await supabase
        .from("meter_readings")
        .select("*")
        .eq("meter_id", selectedMeter.id)
        .order("reading_date", { ascending: false });
      if (error) throw error;
      return data as MeterReading[];
    },
    enabled: !!selectedMeter,
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
      const { error } = await supabase.from("meters").insert({
        resident_id: data.resident_id || null,
        meter_number: data.meter_number || null,
        meter_type: data.meter_type,
        location: data.location || null,
        is_electronic: data.is_electronic,
        install_date: data.install_date || null,
        next_verification_date: data.next_verification_date || null,
        notes: data.notes || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-meters"] });
      toast.success("Skaitiklis sukurtas");
      resetForm();
    },
    onError: () => toast.error("Klaida kuriant skaitiklį"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("meters")
        .update({
          resident_id: data.resident_id || null,
          meter_number: data.meter_number || null,
          meter_type: data.meter_type,
          location: data.location || null,
          is_electronic: data.is_electronic,
          install_date: data.install_date || null,
          next_verification_date: data.next_verification_date || null,
          notes: data.notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-meters"] });
      toast.success("Skaitiklis atnaujintas");
      resetForm();
    },
    onError: () => toast.error("Klaida atnaujinant skaitiklį"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-meters"] });
      toast.success("Skaitiklis ištrintas");
      setDeleteDialogOpen(false);
      setDeletingMeter(null);
    },
    onError: () => toast.error("Klaida trinant skaitiklį"),
  });

  const createReadingMutation = useMutation({
    mutationFn: async (data: typeof readingFormData) => {
      if (!selectedMeter) return;
      
      const lastReading = readings[0];
      const readingValue = parseFloat(data.reading_value);
      const previousValue = lastReading?.reading_value || 0;
      const consumption = readingValue - previousValue;

      const { error } = await supabase.from("meter_readings").insert({
        meter_id: selectedMeter.id,
        reading_date: data.reading_date,
        reading_value: readingValue,
        previous_value: previousValue,
        consumption: consumption > 0 ? consumption : 0,
        source: "manual",
        notes: data.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-meter-readings"] });
      toast.success("Rodmuo įvestas");
      setReadingDialogOpen(false);
      setReadingFormData({
        reading_date: format(new Date(), "yyyy-MM-dd"),
        reading_value: "",
        notes: "",
      });
    },
    onError: () => toast.error("Klaida įvedant rodmenį"),
  });

  const resetForm = () => {
    setFormData({
      resident_id: "",
      meter_number: "",
      meter_type: "cold_water",
      location: "",
      is_electronic: false,
      install_date: "",
      next_verification_date: "",
      notes: "",
    });
    setEditingMeter(null);
    setDialogOpen(false);
  };

  const handleEdit = (meter: Meter) => {
    setEditingMeter(meter);
    setFormData({
      resident_id: meter.resident_id || "",
      meter_number: meter.meter_number || "",
      meter_type: meter.meter_type,
      location: meter.location || "",
      is_electronic: meter.is_electronic || false,
      install_date: meter.install_date || "",
      next_verification_date: meter.next_verification_date || "",
      notes: meter.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingMeter) {
      updateMutation.mutate({ id: editingMeter.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getResidentName = (residentId: string | null) => {
    if (!residentId) return "-";
    const resident = residents.find((r) => r.id === residentId);
    return resident ? `${resident.full_name} ${resident.apartment_number ? `(${resident.apartment_number})` : ""}` : "-";
  };

  const getMeterTypeInfo = (type: string) => {
    return METER_TYPES.find((t) => t.value === type) || METER_TYPES[0];
  };

  const filteredMeters = meters.filter((meter) => {
    const matchesSearch =
      meter.meter_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meter.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getResidentName(meter.resident_id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || meter.meter_type === filterType;
    return matchesSearch && matchesType;
  });

  const activeMeters = meters.filter((m) => m.is_active).length;
  const typeStats = METER_TYPES.map((type) => ({
    ...type,
    count: meters.filter((m) => m.meter_type === type.value).length,
  }));

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
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viso skaitiklių</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meters.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktyvūs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeMeters}</div>
          </CardContent>
        </Card>
        {typeStats.slice(0, 4).map((type) => (
          <Card key={type.value}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <type.icon className={`h-4 w-4 ${type.color}`} />
                {type.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{type.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="meters" className="gap-2">
            <Gauge className="h-4 w-4" />
            Skaitikliai
          </TabsTrigger>
          <TabsTrigger value="readings" className="gap-2" disabled={!selectedMeter}>
            <ClipboardList className="h-4 w-4" />
            Rodmenys {selectedMeter && `(${getMeterTypeInfo(selectedMeter.meter_type).label})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meters" className="space-y-4">
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
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Visi tipai</SelectItem>
                  {METER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Naujas skaitiklis
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingMeter ? "Redaguoti skaitiklį" : "Naujas skaitiklis"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Gyventojas</Label>
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
                      <Label>Tipas</Label>
                      <Select
                        value={formData.meter_type}
                        onValueChange={(value) => setFormData({ ...formData, meter_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Numeris</Label>
                      <Input
                        value={formData.meter_number}
                        onChange={(e) => setFormData({ ...formData, meter_number: e.target.value })}
                        placeholder="Gamyklinis nr."
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Vieta</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Pvz.: Virtuvė, Vonia"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Įrengimo data</Label>
                      <Input
                        type="date"
                        value={formData.install_date}
                        onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Kita patikra</Label>
                      <Input
                        type="date"
                        value={formData.next_verification_date}
                        onChange={(e) => setFormData({ ...formData, next_verification_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_electronic}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_electronic: checked })}
                    />
                    <Label>Elektroninis skaitiklis</Label>
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
                    {editingMeter ? "Atnaujinti" : "Sukurti"}
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
                    <TableHead>Tipas</TableHead>
                    <TableHead>Numeris</TableHead>
                    <TableHead>Gyventojas</TableHead>
                    <TableHead>Vieta</TableHead>
                    <TableHead>Kita patikra</TableHead>
                    <TableHead>Statusas</TableHead>
                    <TableHead className="text-right">Veiksmai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Skaitiklių nerasta
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMeters.map((meter) => {
                      const typeInfo = getMeterTypeInfo(meter.meter_type);
                      const IconComponent = typeInfo.icon;
                      return (
                        <TableRow key={meter.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IconComponent className={`h-4 w-4 ${typeInfo.color}`} />
                              <span>{typeInfo.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{meter.meter_number || "-"}</TableCell>
                          <TableCell>{getResidentName(meter.resident_id)}</TableCell>
                          <TableCell className="text-muted-foreground">{meter.location || "-"}</TableCell>
                          <TableCell>
                            {meter.next_verification_date ? (
                              <Badge
                                variant={
                                  new Date(meter.next_verification_date) < new Date() ? "destructive" : "secondary"
                                }
                              >
                                {format(new Date(meter.next_verification_date), "yyyy-MM-dd")}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={meter.is_active ? "default" : "secondary"}>
                              {meter.is_active ? "Aktyvus" : "Neaktyvus"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedMeter(meter);
                                  setActiveTab("readings");
                                }}
                                title="Rodmenys"
                              >
                                <ClipboardList className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(meter)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeletingMeter(meter);
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
        </TabsContent>

        <TabsContent value="readings" className="space-y-4">
          {selectedMeter && (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">
                    {getMeterTypeInfo(selectedMeter.meter_type).label} - {selectedMeter.meter_number || "Be numerio"}
                  </h3>
                  <p className="text-muted-foreground">{getResidentName(selectedMeter.resident_id)}</p>
                </div>
                <Dialog open={readingDialogOpen} onOpenChange={setReadingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Naujas rodmuo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Įvesti rodmenį</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={readingFormData.reading_date}
                          onChange={(e) => setReadingFormData({ ...readingFormData, reading_date: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Rodmuo</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={readingFormData.reading_value}
                          onChange={(e) => setReadingFormData({ ...readingFormData, reading_value: e.target.value })}
                          placeholder="0.000"
                        />
                        {readings[0] && (
                          <p className="text-sm text-muted-foreground">
                            Paskutinis rodmuo: {readings[0].reading_value}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label>Pastabos</Label>
                        <Textarea
                          value={readingFormData.notes}
                          onChange={(e) => setReadingFormData({ ...readingFormData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReadingDialogOpen(false)}>
                        Atšaukti
                      </Button>
                      <Button onClick={() => createReadingMutation.mutate(readingFormData)}>
                        Įvesti
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Rodmuo</TableHead>
                        <TableHead>Ankstesnis</TableHead>
                        <TableHead>Suvartojimas</TableHead>
                        <TableHead>Šaltinis</TableHead>
                        <TableHead>Pastabos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Rodmenų nerasta
                          </TableCell>
                        </TableRow>
                      ) : (
                        readings.map((reading) => (
                          <TableRow key={reading.id}>
                            <TableCell>{format(new Date(reading.reading_date), "yyyy-MM-dd")}</TableCell>
                            <TableCell className="font-bold">{reading.reading_value}</TableCell>
                            <TableCell className="text-muted-foreground">{reading.previous_value ?? "-"}</TableCell>
                            <TableCell>
                              {reading.consumption != null && reading.consumption > 0 && (
                                <Badge variant="outline">{reading.consumption}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{reading.source === "manual" ? "Rankinis" : reading.source}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs truncate">
                              {reading.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti skaitiklį?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti šį skaitiklį ir visus jo rodmenis? Šis veiksmas negrįžtamas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMeter && deleteMutation.mutate(deletingMeter.id)}
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
