import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Vote, AlertTriangle, Clock } from "lucide-react";

interface Stats {
  totalTickets: number;
  newTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalNews: number;
  publishedNews: number;
  totalPolls: number;
  activePolls: number;
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
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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

      setStats({
        totalTickets,
        newTickets,
        inProgressTickets,
        resolvedTickets,
        totalNews,
        publishedNews,
        totalPolls,
        activePolls,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="card-elevated cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onTabChange("tickets")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nauji pranešimai</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newTickets}</div>
            <p className="text-xs text-muted-foreground">
              Iš viso: {stats.totalTickets} pranešimų
            </p>
          </CardContent>
        </Card>

        <Card 
          className="card-elevated cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onTabChange("tickets")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vykdomi</CardTitle>
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
            <CardTitle className="text-sm font-medium">Naujienos</CardTitle>
            <Newspaper className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedNews}</div>
            <p className="text-xs text-muted-foreground">
              Paskelbta iš {stats.totalNews}
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
            <CardDescription>Pranešimų būsenos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm">Nauji</span>
                </div>
                <span className="font-medium">{stats.newTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm">Vykdomi</span>
                </div>
                <span className="font-medium">{stats.inProgressTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm">Išspręsti</span>
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
                • Nauji pranešimai laukia jūsų dėmesio
              </button>
              <button 
                onClick={() => onTabChange("news")}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
              >
                • Sukurkite naujieną gyventojams informuoti
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
