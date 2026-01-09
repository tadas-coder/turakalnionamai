import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, XCircle, TrendingUp, Calendar } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

const statusLabels: { [key: string]: string } = {
  new: "Naujas",
  in_progress: "Vykdomas",
  resolved: "Išspręstas",
  closed: "Uždarytas",
};

const categoryLabels: { [key: string]: string } = {
  doors: "Durų problemos",
  water: "Vandentiekio problemos",
  walls: "Sienų pažeidimai",
  electricity: "Elektros problemos",
  heating: "Šildymo problemos",
  elevator: "Lifto problemos",
  security: "Saugumo problemos",
  cleanliness: "Švaros problemos",
  other: "Kita",
};

const COLORS = ["hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--muted))"];

export default function TicketStatistics() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchTickets();
    }
  }, [isAdmin]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  // Filter tickets by selected year
  const filteredTickets = tickets.filter(t => 
    new Date(t.created_at).getFullYear().toString() === selectedYear
  );

  // Get available years
  const years = [...new Set(tickets.map(t => new Date(t.created_at).getFullYear()))].sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  // Status statistics
  const statusStats = [
    { name: "Nauji", value: filteredTickets.filter(t => t.status === "new").length, color: COLORS[0] },
    { name: "Vykdomi", value: filteredTickets.filter(t => t.status === "in_progress").length, color: COLORS[1] },
    { name: "Išspręsti", value: filteredTickets.filter(t => t.status === "resolved").length, color: COLORS[2] },
    { name: "Uždaryti", value: filteredTickets.filter(t => t.status === "closed").length, color: COLORS[3] },
  ];

  // Category statistics
  const categoryStats = Object.entries(categoryLabels).map(([key, label]) => ({
    name: label,
    count: filteredTickets.filter(t => t.category === key).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

  // Monthly statistics
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthTickets = filteredTickets.filter(t => {
      const date = new Date(t.created_at);
      return date.getMonth() + 1 === month;
    });
    return {
      name: new Date(2024, i).toLocaleDateString("lt-LT", { month: "short" }),
      gauta: monthTickets.length,
      išspręsta: monthTickets.filter(t => t.status === "resolved" || t.status === "closed").length,
    };
  });

  // Calculate resolution time (average days from created to resolved)
  const resolvedTickets = filteredTickets.filter(t => 
    (t.status === "resolved" || t.status === "closed") && t.updated_at
  );
  
  const avgResolutionDays = resolvedTickets.length > 0
    ? Math.round(resolvedTickets.reduce((acc, t) => {
        const created = new Date(t.created_at);
        const updated = new Date(t.updated_at!);
        return acc + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / resolvedTickets.length)
    : 0;

  // Resolution rate
  const resolutionRate = filteredTickets.length > 0 
    ? Math.round((resolvedTickets.length / filteredTickets.length) * 100) 
    : 0;

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      new: "bg-destructive",
      in_progress: "bg-warning",
      resolved: "bg-success",
      closed: "bg-muted",
    };
    return (
      <Badge className={`${colors[status]} text-white`}>
        {statusLabels[status]}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Problemų šalinimo statistika</h1>
            <p className="text-muted-foreground mt-2">
              Detali pranešimų apie gedimus analizė ir statistika
            </p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Metai" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Iš viso pranešimų</p>
                  <p className="text-2xl font-bold">{filteredTickets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vykdomi</p>
                  <p className="text-2xl font-bold">
                    {filteredTickets.filter(t => t.status === "in_progress").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Išspręsta %</p>
                  <p className="text-2xl font-bold">{resolutionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vid. sprendimo laikas</p>
                  <p className="text-2xl font-bold">{avgResolutionDays} d.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Būsenų pasiskirstymas</CardTitle>
              <CardDescription>Pranešimų skaičius pagal būseną</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusStats.filter(s => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Kategorijų pasiskirstymas</CardTitle>
              <CardDescription>Pranešimų skaičius pagal kategoriją</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Mėnesinė tendencija</CardTitle>
            <CardDescription>Gautų ir išspręstų pranešimų dinamika per metus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="gauta" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="Gauta pranešimų"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="išspręsta" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Išspręsta"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tickets Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Paskutiniai pranešimai</CardTitle>
            <CardDescription>Naujausių pranešimų istorija</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pavadinimas</TableHead>
                    <TableHead>Kategorija</TableHead>
                    <TableHead>Vieta</TableHead>
                    <TableHead>Būsena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.slice(0, 10).map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString("lt-LT")}
                      </TableCell>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>{categoryLabels[ticket.category] || ticket.category}</TableCell>
                      <TableCell>{ticket.location || "-"}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nėra pranešimų šiais metais
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
