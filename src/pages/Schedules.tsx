import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { lt } from "date-fns/locale";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Calendar, Wrench, User, Phone, Plus, Trash2, Edit, AlertTriangle, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
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

const workTypeColors: Record<string, string> = {
  maintenance: "bg-blue-500",
  repair: "bg-orange-500",
  water_shutoff: "bg-cyan-500",
  electricity_shutoff: "bg-yellow-500",
  other: "bg-gray-500",
};

const workTypeIcons: Record<string, string> = {
  maintenance: "🔧",
  repair: "🛠️",
  water_shutoff: "💧",
  electricity_shutoff: "⚡",
  other: "📋",
};

const personColors = [
  "bg-rose-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-pink-500",
];

export default function Schedules() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Dialog states
  const [isDutyDialogOpen, setIsDutyDialogOpen] = useState(false);
  const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<DutySchedule | null>(null);
  const [editingWork, setEditingWork] = useState<PlannedWork | null>(null);
  
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
  const [sendNotification, setSendNotification] = useState(true);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: dutySchedules = [] } = useQuery({
    queryKey: ["duty-schedules", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("duty_schedules")
        .select("*")
        .gte("duty_date", start)
        .lte("duty_date", end)
        .order("duty_date");

      if (error) throw error;
      return data as DutySchedule[];
    },
    enabled: !!user,
  });

  const { data: plannedWorks = [] } = useQuery({
    queryKey: ["planned-works", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("planned_works")
        .select("*")
        .or(`start_date.gte.${start},end_date.gte.${start}`)
        .or(`start_date.lte.${end},end_date.lte.${end}`)
        .order("start_date");

      if (error) throw error;
      return data as PlannedWork[];
    },
    enabled: !!user,
  });

  // Upcoming works (next 30 days)
  const { data: upcomingWorks = [] } = useQuery({
    queryKey: ["upcoming-works"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const thirtyDaysLater = format(addMonths(new Date(), 1), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("planned_works")
        .select("*")
        .gte("start_date", today)
        .lte("start_date", thirtyDaysLater)
        .order("start_date");

      if (error) throw error;
      return data as PlannedWork[];
    },
    enabled: !!user,
  });

  // Mutations
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
      queryClient.invalidateQueries({ queryKey: ["duty-schedules"] });
      toast.success("Budėjimas pridėtas");
      setIsDutyDialogOpen(false);
      resetDutyForm();
    },
    onError: () => {
      toast.error("Nepavyko pridėti budėjimo");
    },
  });

  const updateDutyMutation = useMutation({
    mutationFn: async () => {
      if (!editingDuty) return;
      const { error } = await supabase
        .from("duty_schedules")
        .update({
          person_name: dutyPersonName,
          person_phone: dutyPersonPhone || null,
          duty_date: dutyDate,
        })
        .eq("id", editingDuty.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["duty-schedules"] });
      toast.success("Budėjimas atnaujintas");
      setIsDutyDialogOpen(false);
      setEditingDuty(null);
      resetDutyForm();
    },
    onError: () => {
      toast.error("Nepavyko atnaujinti budėjimo");
    },
  });

  const deleteDutyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("duty_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
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

      // Send notification to residents if checkbox is checked
      if (sendNotification) {
        setIsSendingNotification(true);
        try {
          const { data, error: notifError } = await supabase.functions.invoke("send-work-notification", {
            body: {
              title: workTitle,
              description: workDescription || null,
              work_type: workType,
              start_date: workStartDate,
              end_date: workEndDate || null,
            },
          });
          
          if (notifError) {
            console.error("Notification error:", notifError);
            toast.error("Darbas sukurtas, bet pranešimų išsiųsti nepavyko");
          } else {
            console.log("Notification result:", data);
            toast.success(`Pranešimai išsiųsti ${data.successful} gyventojams`);
          }
        } catch (e) {
          console.error("Failed to send notifications:", e);
          toast.error("Darbas sukurtas, bet pranešimų išsiųsti nepavyko");
        } finally {
          setIsSendingNotification(false);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-works"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-works"] });
      if (!sendNotification) {
        toast.success("Darbas pridėtas");
      }
      setIsWorkDialogOpen(false);
      resetWorkForm();
    },
    onError: () => {
      toast.error("Nepavyko pridėti darbo");
    },
  });

  const updateWorkMutation = useMutation({
    mutationFn: async () => {
      if (!editingWork) return;
      const { error } = await supabase
        .from("planned_works")
        .update({
          title: workTitle,
          description: workDescription || null,
          work_type: workType,
          start_date: workStartDate,
          end_date: workEndDate || null,
        })
        .eq("id", editingWork.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-works"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-works"] });
      toast.success("Darbas atnaujintas");
      setIsWorkDialogOpen(false);
      setEditingWork(null);
      resetWorkForm();
    },
    onError: () => {
      toast.error("Nepavyko atnaujinti darbo");
    },
  });

  const deleteWorkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planned_works").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-works"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-works"] });
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
    setSendNotification(true);
  };

  const openEditDuty = (duty: DutySchedule) => {
    setEditingDuty(duty);
    setDutyPersonName(duty.person_name);
    setDutyPersonPhone(duty.person_phone || "");
    setDutyDate(duty.duty_date);
    setIsDutyDialogOpen(true);
  };

  const openEditWork = (work: PlannedWork) => {
    setEditingWork(work);
    setWorkTitle(work.title);
    setWorkDescription(work.description || "");
    setWorkType(work.work_type);
    setWorkStartDate(work.start_date);
    setWorkEndDate(work.end_date || "");
    setIsWorkDialogOpen(true);
  };

  const handleDutyDialogClose = (open: boolean) => {
    if (!open) {
      setEditingDuty(null);
      resetDutyForm();
    }
    setIsDutyDialogOpen(open);
  };

  const handleWorkDialogClose = (open: boolean) => {
    if (!open) {
      setEditingWork(null);
      resetWorkForm();
    }
    setIsWorkDialogOpen(open);
  };

  // Get unique persons for legend
  const uniquePersons = [...new Set(dutySchedules.map(d => d.person_name))];
  const personColorMap = new Map<string, string>();
  uniquePersons.forEach((person, index) => {
    personColorMap.set(person, personColors[index % personColors.length]);
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getDutyForDay = (date: Date) => {
    return dutySchedules.filter(d => isSameDay(new Date(d.duty_date), date));
  };

  const getWorksForDay = (date: Date) => {
    return plannedWorks.filter(w => {
      const startDate = new Date(w.start_date);
      const endDate = w.end_date ? new Date(w.end_date) : startDate;
      return date >= startDate && date <= endDate;
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display mb-2">Darbų kalendorius</h1>
          <p className="text-muted-foreground">
            Budinčių asmenų grafikai, planuojami ir vykdomi darbai
          </p>
        </div>

        {/* Upcoming works alert */}
        {upcomingWorks.length > 0 && (
          <Card className="mb-6 border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Artėjantys darbai
              </CardTitle>
              <CardDescription>
                Per artimiausias 30 dienų suplanuota {upcomingWorks.length} {upcomingWorks.length === 1 ? "darbas" : "darbai"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {upcomingWorks.slice(0, 6).map((work) => (
                  <div
                    key={work.id}
                    className="flex items-start gap-3 p-3 bg-background rounded-lg border"
                  >
                    <div className="text-2xl">{workTypeIcons[work.work_type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{work.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(work.start_date), "MMMM d", { locale: lt })}
                        {work.end_date && work.end_date !== work.start_date && (
                          <> – {format(new Date(work.end_date), "MMMM d", { locale: lt })}</>
                        )}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {workTypeLabels[work.work_type]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="duty" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="duty" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Budinčių grafikai
            </TabsTrigger>
            <TabsTrigger value="works" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Planuojami darbai
            </TabsTrigger>
          </TabsList>

          <TabsContent value="duty">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Budinčių asmenų grafikas
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Budintys asmenys gali padėti esant neatidėliotiniems atvejams
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Dialog open={isDutyDialogOpen} onOpenChange={handleDutyDialogClose}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Pridėti
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingDuty ? "Redaguoti budėjimą" : "Naujas budėjimas"}
                          </DialogTitle>
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
                            onClick={() => editingDuty ? updateDutyMutation.mutate() : createDutyMutation.mutate()}
                            disabled={!dutyPersonName || !dutyDate || createDutyMutation.isPending || updateDutyMutation.isPending}
                          >
                            {(createDutyMutation.isPending || updateDutyMutation.isPending) 
                              ? "Išsaugoma..." 
                              : editingDuty ? "Atnaujinti" : "Pridėti"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[140px] text-center">
                    {format(currentMonth, "LLLL yyyy", { locale: lt })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                {uniquePersons.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
                    {uniquePersons.map((person) => (
                      <div key={person} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${personColorMap.get(person)}`} />
                        <span className="text-sm">{person}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"].map((day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-sm font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                  
                  {/* Empty cells for days before month start */}
                  {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2" />
                  ))}
                  
                  {days.map((day) => {
                    const duties = getDutyForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[80px] p-2 border rounded-lg ${
                          isToday ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className={`text-sm mb-1 ${isToday ? "font-bold text-primary" : ""}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-1">
                          {duties.map((duty) => (
                            <div
                              key={duty.id}
                              className={`text-xs p-1 rounded text-white truncate ${personColorMap.get(duty.person_name)} ${isAdmin ? "cursor-pointer hover:opacity-80" : ""}`}
                              title={`${duty.person_name}${duty.person_phone ? ` - ${duty.person_phone}` : ""}`}
                              onClick={() => isAdmin && openEditDuty(duty)}
                            >
                              {duty.person_name.split(" ")[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Duty List for current month */}
                {dutySchedules.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-semibold mb-4">Šio mėnesio budėjimai</h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {dutySchedules.map((duty) => (
                        <div
                          key={duty.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
                        >
                          <div className={`w-2 h-8 rounded ${personColorMap.get(duty.person_name)}`} />
                          <div className="flex-1">
                            <div className="font-medium">{duty.person_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(duty.duty_date), "MMMM d, EEEE", { locale: lt })}
                            </div>
                          </div>
                          {duty.person_phone && (
                            <a href={`tel:${duty.person_phone}`} className="text-primary hover:underline flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              <span className="text-sm hidden sm:inline">{duty.person_phone}</span>
                            </a>
                          )}
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDuty(duty)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => deleteDutyMutation.mutate(duty.id)}
                                disabled={deleteDutyMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dutySchedules.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Šiam mėnesiui budėjimų nėra</p>
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setIsDutyDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Pridėti pirmą budėjimą
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="works">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Planuojami darbai
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Informacija apie planuojamus ir vykdomus darbus name
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Dialog open={isWorkDialogOpen} onOpenChange={handleWorkDialogClose}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Pridėti
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingWork ? "Redaguoti darbą" : "Naujas planuojamas darbas"}
                          </DialogTitle>
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
                                    {workTypeIcons[value]} {label}
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
                              placeholder="Papildoma informacija gyventojams..."
                              rows={3}
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
                          {!editingWork && (
                            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                              <Checkbox
                                id="send_notification"
                                checked={sendNotification}
                                onCheckedChange={(checked) => setSendNotification(checked as boolean)}
                              />
                              <div className="flex-1">
                                <Label htmlFor="send_notification" className="flex items-center gap-2 cursor-pointer">
                                  <Mail className="h-4 w-4" />
                                  Išsiųsti pranešimą gyventojams
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Visi patvirtinti gyventojai gaus el. laišką apie šį darbą
                                </p>
                              </div>
                            </div>
                          )}
                          <Button
                            className="w-full"
                            onClick={() => editingWork ? updateWorkMutation.mutate() : createWorkMutation.mutate()}
                            disabled={!workTitle || !workStartDate || createWorkMutation.isPending || updateWorkMutation.isPending || isSendingNotification}
                          >
                            {isSendingNotification ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Siunčiami pranešimai...
                              </>
                            ) : (createWorkMutation.isPending || updateWorkMutation.isPending) 
                              ? "Išsaugoma..." 
                              : editingWork ? "Atnaujinti" : sendNotification ? "Pridėti ir išsiųsti pranešimus" : "Pridėti"
                            }
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium min-w-[140px] text-center">
                    {format(currentMonth, "LLLL yyyy", { locale: lt })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-6 p-4 bg-muted/50 rounded-lg">
                  {Object.entries(workTypeLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${workTypeColors[key]}`} />
                      <span className="text-sm">{workTypeIcons[key]} {label}</span>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"].map((day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-sm font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                  
                  {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2" />
                  ))}
                  
                  {days.map((day) => {
                    const works = getWorksForDay(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[80px] p-2 border rounded-lg ${
                          isToday ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className={`text-sm mb-1 ${isToday ? "font-bold text-primary" : ""}`}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-1">
                          {works.slice(0, 2).map((work) => (
                            <div
                              key={work.id}
                              className={`text-xs p-1 rounded text-white truncate ${workTypeColors[work.work_type]} ${isAdmin ? "cursor-pointer hover:opacity-80" : ""}`}
                              title={work.title}
                              onClick={() => isAdmin && openEditWork(work)}
                            >
                              {work.title.substring(0, 10)}
                            </div>
                          ))}
                          {works.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{works.length - 2} daugiau
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Works List */}
                {plannedWorks.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-semibold mb-4">Planuojami darbai šį mėnesį</h3>
                    <div className="space-y-3">
                      {plannedWorks.map((work) => (
                        <div
                          key={work.id}
                          className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg group"
                        >
                          <div className={`w-2 h-full min-h-[40px] rounded ${workTypeColors[work.work_type]}`} />
                          <div className="text-2xl">{workTypeIcons[work.work_type]}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{work.title}</span>
                              <Badge variant="outline">{workTypeLabels[work.work_type]}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mb-1">
                              {format(new Date(work.start_date), "MMMM d", { locale: lt })}
                              {work.end_date && work.end_date !== work.start_date && (
                                <> – {format(new Date(work.end_date), "MMMM d", { locale: lt })}</>
                              )}
                            </div>
                            {work.description && (
                              <p className="text-sm text-muted-foreground">{work.description}</p>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditWork(work)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => deleteWorkMutation.mutate(work.id)}
                                disabled={deleteWorkMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plannedWorks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Šiam mėnesiui planuojamų darbų nėra</p>
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setIsWorkDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Pridėti pirmą darbą
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
