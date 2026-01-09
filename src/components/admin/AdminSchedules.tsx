import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, Trash2, User, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DutySchedule {
  id: string;
  person_name: string;
  person_phone: string | null;
  duty_date: string;
}

interface PlannedWork {
  id: string;
  title: string;
  description: string | null;
  work_type: string;
  start_date: string;
  end_date: string | null;
}

const workTypeLabels: Record<string, string> = {
  maintenance: "Priežiūra",
  repair: "Remontas",
  water_shutoff: "Vandens atjungimas",
  electricity_shutoff: "Elektros atjungimas",
  other: "Kita",
};

export function AdminSchedules() {
  const queryClient = useQueryClient();
  const [isDutyDialogOpen, setIsDutyDialogOpen] = useState(false);
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
  
  // Duty form state
  const [dutyPersonName, setDutyPersonName] = useState("");
  const [dutyPersonPhone, setDutyPersonPhone] = useState("");
  const [dutyDate, setDutyDate] = useState("");

  // Work form state
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [workType, setWorkType] = useState("maintenance");
  const [workStartDate, setWorkStartDate] = useState("");
  const [workEndDate, setWorkEndDate] = useState("");

  const { data: dutySchedules = [], isLoading: loadingDuties } = useQuery({
    queryKey: ["admin-duty-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("duty_schedules")
        .select("*")
        .order("duty_date", { ascending: true });

      if (error) throw error;
      return data as DutySchedule[];
    },
  });

  const { data: plannedWorks = [], isLoading: loadingWorks } = useQuery({
    queryKey: ["admin-planned-works"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planned_works")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data as PlannedWork[];
    },
  });

  const createDutyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("duty_schedules").insert({
        person_name: dutyPersonName,
        person_phone: dutyPersonPhone || null,
        duty_date: dutyDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-duty-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["duty-schedules"] });
      toast.success("Budėjimas pridėtas");
      setIsDutyDialogOpen(false);
      resetDutyForm();
    },
    onError: () => {
      toast.error("Nepavyko pridėti budėjimo");
    },
  });

  const deleteDutyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("duty_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-duty-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["duty-schedules"] });
      toast.success("Budėjimas ištrintas");
    },
    onError: () => {
      toast.error("Nepavyko ištrinti budėjimo");
    },
  });

  const createWorkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("planned_works").insert({
        title: workTitle,
        description: workDescription || null,
        work_type: workType,
        start_date: workStartDate,
        end_date: workEndDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-planned-works"] });
      queryClient.invalidateQueries({ queryKey: ["planned-works"] });
      toast.success("Darbas pridėtas");
      setIsWorkDialogOpen(false);
      resetWorkForm();
    },
    onError: () => {
      toast.error("Nepavyko pridėti darbo");
    },
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planned_works").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-planned-works"] });
      queryClient.invalidateQueries({ queryKey: ["planned-works"] });
      toast.success("Darbas ištrintas");
    },
    onError: () => {
      toast.error("Nepavyko ištrinti darbo");
    },
  });

  const resetDutyForm = () => {
    setDutyPersonName("");
    setDutyPersonPhone("");
    setDutyDate("");
  };

  const resetWorkForm = () => {
    setWorkTitle("");
    setWorkDescription("");
    setWorkType("maintenance");
    setWorkStartDate("");
    setWorkEndDate("");
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="duties">
        <TabsList>
          <TabsTrigger value="duties" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Budinčių grafikai
          </TabsTrigger>
          <TabsTrigger value="works" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Planuojami darbai
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duties" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Budinčių asmenų grafikai
              </CardTitle>
              <Dialog open={isDutyDialogOpen} onOpenChange={setIsDutyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Pridėti budėjimą
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Naujas budėjimas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="person_name">Asmens vardas *</Label>
                      <Input
                        id="person_name"
                        value={dutyPersonName}
                        onChange={(e) => setDutyPersonName(e.target.value)}
                        placeholder="Pvz.: Jonas Jonaitis"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="person_phone">Telefono numeris</Label>
                      <Input
                        id="person_phone"
                        value={dutyPersonPhone}
                        onChange={(e) => setDutyPersonPhone(e.target.value)}
                        placeholder="Pvz.: +370 600 00000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duty_date">Budėjimo data *</Label>
                      <Input
                        id="duty_date"
                        type="date"
                        value={dutyDate}
                        onChange={(e) => setDutyDate(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createDutyMutation.mutate()}
                      disabled={!dutyPersonName || !dutyDate || createDutyMutation.isPending}
                    >
                      {createDutyMutation.isPending ? "Pridedama..." : "Pridėti"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingDuties ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : dutySchedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Budėjimų nėra</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asmuo</TableHead>
                      <TableHead>Telefonas</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-[80px]">Veiksmai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dutySchedules.map((duty) => (
                      <TableRow key={duty.id}>
                        <TableCell className="font-medium">{duty.person_name}</TableCell>
                        <TableCell>{duty.person_phone || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(duty.duty_date), "yyyy-MM-dd, EEEE", { locale: lt })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDutyMutation.mutate(duty.id)}
                            disabled={deleteDutyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="works" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Planuojami darbai
              </CardTitle>
              <Dialog open={isWorkDialogOpen} onOpenChange={setIsWorkDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Pridėti darbą
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Naujas planuojamas darbas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="work_title">Pavadinimas *</Label>
                      <Input
                        id="work_title"
                        value={workTitle}
                        onChange={(e) => setWorkTitle(e.target.value)}
                        placeholder="Pvz.: Lifto remontas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work_type">Tipas *</Label>
                      <Select value={workType} onValueChange={setWorkType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(workTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="work_description">Aprašymas</Label>
                      <Textarea
                        id="work_description"
                        value={workDescription}
                        onChange={(e) => setWorkDescription(e.target.value)}
                        placeholder="Papildoma informacija..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="work_start_date">Pradžios data *</Label>
                        <Input
                          id="work_start_date"
                          type="date"
                          value={workStartDate}
                          onChange={(e) => setWorkStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="work_end_date">Pabaigos data</Label>
                        <Input
                          id="work_end_date"
                          type="date"
                          value={workEndDate}
                          onChange={(e) => setWorkEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createWorkMutation.mutate()}
                      disabled={!workTitle || !workStartDate || createWorkMutation.isPending}
                    >
                      {createWorkMutation.isPending ? "Pridedama..." : "Pridėti"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingWorks ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : plannedWorks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Planuojamų darbų nėra</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pavadinimas</TableHead>
                      <TableHead>Tipas</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-[80px]">Veiksmai</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plannedWorks.map((work) => (
                      <TableRow key={work.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{work.title}</div>
                            {work.description && (
                              <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {work.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{workTypeLabels[work.work_type]}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(work.start_date), "yyyy-MM-dd")}
                          {work.end_date && work.end_date !== work.start_date && (
                            <> – {format(new Date(work.end_date), "yyyy-MM-dd")}</>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteWorkMutation.mutate(work.id)}
                            disabled={deleteWorkMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
