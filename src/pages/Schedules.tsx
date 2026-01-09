import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { lt } from "date-fns/locale";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar, Wrench, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

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

const personColors = [
  "bg-rose-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
];

export default function Schedules() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
          <h1 className="text-3xl font-bold font-display mb-2">Grafikai</h1>
          <p className="text-muted-foreground">
            Budinčių asmenų ir planuojamų darbų kalendorius
          </p>
        </div>

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
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Budinčių asmenų grafikas
                </CardTitle>
                <div className="flex items-center gap-2">
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
                              className={`text-xs p-1 rounded text-white truncate ${personColorMap.get(duty.person_name)}`}
                              title={`${duty.person_name}${duty.person_phone ? ` - ${duty.person_phone}` : ""}`}
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
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
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
                              <span className="text-sm">{duty.person_phone}</span>
                            </a>
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="works">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Planuojami darbai
                </CardTitle>
                <div className="flex items-center gap-2">
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
                      <span className="text-sm">{label}</span>
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
                              className={`text-xs p-1 rounded text-white truncate ${workTypeColors[work.work_type]}`}
                              title={work.title}
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
                          className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg"
                        >
                          <div className={`w-2 h-full min-h-[40px] rounded ${workTypeColors[work.work_type]}`} />
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plannedWorks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Šiam mėnesiui planuojamų darbų nėra</p>
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
