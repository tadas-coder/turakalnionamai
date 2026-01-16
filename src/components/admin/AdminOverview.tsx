import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Send, Vote, AlertTriangle, Clock, ClipboardList, Users, FileText, Calendar, Bell, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface Stats {
  totalTickets: number;
  newTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalNews: number;
  publishedNews: number;
  totalPolls: number;
  activePolls: number;
  pendingUsers: number;
  unpublishedDocuments: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  tab?: string;
  isWeekly?: boolean;
  completed?: boolean;
}

interface AdminOverviewProps {
  onTabChange: (tab: string) => void;
}

export function AdminOverview({ onTabChange }: AdminOverviewProps) {
  const [stats, setStats] = useState<Stats>({
    totalTickets: 0,
    newTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    totalNews: 0,
    publishedNews: 0,
    totalPolls: 0,
    activePolls: 0,
    pendingUsers: 0,
    unpublishedDocuments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [weeklyTaskCompleted, setWeeklyTaskCompleted] = useState(false);

  useEffect(() => {
    fetchStats();
    // Check if weekly task was completed this week
    const lastCompleted = localStorage.getItem("calendarTaskCompleted");
    if (lastCompleted) {
      const lastDate = new Date(lastCompleted);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (lastDate > weekAgo) {
        setWeeklyTaskCompleted(true);
      }
    }
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch ticket stats
      const { data: tickets } = await supabase.from("tickets").select("status");
      const totalTickets = tickets?.length || 0;
      const newTickets = tickets?.filter(t => t.status === "new").length || 0;
      const inProgressTickets = tickets?.filter(t => t.status === "in_progress").length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === "resolved" || t.status === "closed").length || 0;

      // Fetch news stats
      const { data: news } = await supabase.from("news").select("published");
      const totalNews = news?.length || 0;
      const publishedNews = news?.filter(n => n.published).length || 0;

      // Fetch poll stats
      const { data: polls } = await supabase.from("polls").select("active");
      const totalPolls = polls?.length || 0;
      const activePolls = polls?.filter(p => p.active).length || 0;

      // Fetch pending users (not approved)
      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("approved")
        .eq("approved", false);
      const pendingUsers = pendingProfiles?.length || 0;

      // Fetch unpublished documents
      const { data: documents } = await supabase
        .from("documents")
        .select("visible")
        .eq("visible", false);
      const unpublishedDocuments = documents?.length || 0;

      setStats({
        totalTickets,
        newTickets,
        inProgressTickets,
        resolvedTickets,
        totalNews,
        publishedNews,
        totalPolls,
        activePolls,
        pendingUsers,
        unpublishedDocuments,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyTaskToggle = (checked: boolean) => {
    setWeeklyTaskCompleted(checked);
    if (checked) {
      localStorage.setItem("calendarTaskCompleted", new Date().toISOString());
    } else {
      localStorage.removeItem("calendarTaskCompleted");
    }
  };

  const tasks: Task[] = [
    {
      id: "pending-users",
      title: "Naujų vartotojų registracijos",
      description: "Laukia patvirtinimo",
      count: stats.pendingUsers,
      icon: <Users className="h-4 w-4" />,
      tab: "users",
    },
    {
      id: "new-tickets",
      title: "Naujos užduotys",
      description: "Laukia peržiūros",
      count: stats.newTickets,
      icon: <AlertTriangle className="h-4 w-4" />,
      tab: "tickets",
    },
    {
      id: "in-progress-tickets",
      title: "Vykdomos užduotys",
      description: "Reikia dėmesio",
      count: stats.inProgressTickets,
      icon: <Clock className="h-4 w-4" />,
      tab: "tickets",
    },
    {
      id: "active-polls",
      title: "Balsavimų stebėjimas",
      description: "Aktyvios apklausos",
      count: stats.activePolls,
      icon: <Vote className="h-4 w-4" />,
      tab: "polls",
    },
    {
      id: "unpublished-docs",
      title: "Dokumentų patvirtinimas",
      description: "Nepaskelbti dokumentai",
      count: stats.unpublishedDocuments,
      icon: <FileText className="h-4 w-4" />,
      tab: "reports",
    },
    {
      id: "news-draft",
      title: "Pranešimų siuntimas",
      description: "Sukurti naujienas",
      count: stats.totalNews - stats.publishedNews,
      icon: <Bell className="h-4 w-4" />,
      tab: "news",
    },
    {
      id: "calendar-update",
      title: "Kalendoriaus atnaujinimas",
      description: "Atnaujinti kartą per savaitę",
      count: weeklyTaskCompleted ? 0 : 1,
      icon: <Calendar className="h-4 w-4" />,
      tab: "schedules",
      isWeekly: true,
      completed: weeklyTaskCompleted,
    },
    {
      id: "monthly-report",
      title: "Mėnesio finansinė ataskaita",
      description: "Įkelti kartą per mėnesį",
      count: 1,
      icon: <FileSpreadsheet className="h-4 w-4" />,
      tab: "monthly-reports",
    },
  ];

  const totalTasks = tasks.reduce((sum, task) => sum + task.count, 0);
  const activeTasks = tasks.filter(task => task.count > 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-6 w-48 bg-muted rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted rounded" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Tasks Section */}
      <Card className="card-elevated border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Mano užduotys</CardTitle>
              <CardDescription>Užduotys, kurias reikia atlikti</CardDescription>
            </div>
          </div>
          <Badge 
            variant={totalTasks > 0 ? "destructive" : "secondary"}
            className="text-lg px-3 py-1"
          >
            {totalTasks}
          </Badge>
        </CardHeader>
        <CardContent>
          {activeTasks.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 mr-2 text-success" />
              Visos užduotys atliktos!
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    task.count > 0 
                      ? "bg-background hover:bg-muted cursor-pointer hover:border-primary/50" 
                      : "bg-muted/30 opacity-60"
                  }`}
                  onClick={() => task.count > 0 && task.tab && onTabChange(task.tab)}
                >
                  <div className="flex items-center gap-3">
                    {task.isWeekly ? (
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => {
                          handleWeeklyTaskToggle(checked as boolean);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className={`p-2 rounded-full ${task.count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {task.icon}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  {task.count > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {task.count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="card-elevated cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onTabChange("tickets")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Naujos užduotys</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newTickets}</div>
            <p className="text-xs text-muted-foreground">
              Iš viso: {stats.totalTickets} užduočių
            </p>
          </CardContent>
        </Card>

        <Card 
          className="card-elevated cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onTabChange("tickets")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vykdomos</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTickets}</div>
            <p className="text-xs text-muted-foreground">
              Išspręsta: {stats.resolvedTickets}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="card-elevated cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onTabChange("news")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pranešimai</CardTitle>
            <Send className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNews}</div>
            <p className="text-xs text-muted-foreground">
              Išsiųsta gyventojams
            </p>
          </CardContent>
        </Card>

        <Card 
          className="card-elevated cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onTabChange("polls")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktyvios apklausos</CardTitle>
            <Vote className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePolls}</div>
            <p className="text-xs text-muted-foreground">
              Iš viso: {stats.totalPolls} apklausų
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Greita statistika</CardTitle>
            <CardDescription>Užduočių būsenos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm">Naujos</span>
                </div>
                <span className="font-medium">{stats.newTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm">Vykdomos</span>
                </div>
                <span className="font-medium">{stats.inProgressTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm">Išspręstos</span>
                </div>
                <span className="font-medium">{stats.resolvedTickets}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Veiksmai</CardTitle>
            <CardDescription>Greitosios nuorodos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button 
                onClick={() => onTabChange("tickets")}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
              >
                • Naujos užduotys laukia jūsų dėmesio
              </button>
              <button 
                onClick={() => onTabChange("news")}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
              >
                • Siųsti pranešimą gyventojams
              </button>
              <button 
                onClick={() => onTabChange("polls")}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
              >
                • Paleiskite apklausą svarbiems klausimams
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
