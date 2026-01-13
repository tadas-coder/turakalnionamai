import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, TrendingUp, TrendingDown, Euro, Wallet, Calendar, Download, ChevronLeft, ChevronRight, BarChart3, PieChart as PieChartIcon, Upload, Table, Eye } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

type MonthlyReport = {
  id: string;
  report_month: string;
  title: string;
  summary_data: {
    likutisPr: number;
    priskaitymai: number;
    isleista: number;
    likutisPab: number;
  } | null;
  main_categories: Array<{
    name: string;
    likutisPr: number;
    priskaitymai: number;
    isleista: number;
    likutisPab: number;
  }> | null;
  detailed_categories: Array<{
    name: string;
    priskaitymai: number;
    isleista: number;
    color: string;
  }> | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  published: boolean;
  created_at: string;
};

export default function MonthlyFinancialReport() {
  const navigate = useNavigate();
  const { user, isApproved, isAdmin } = useAuth();
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [activeView, setActiveView] = useState<string>("overview");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["monthly-reports", isAdmin],
    queryFn: async () => {
      // Admin can see all reports (including unpublished), users see only published
      const query = supabase
        .from("monthly_financial_reports")
        .select("*")
        .order("report_month", { ascending: false });
      
      if (!isAdmin) {
        query.eq("published", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as MonthlyReport[];
    },
    enabled: !!user && (isApproved || isAdmin),
  });

  // Set the first report as selected when data loads
  const selectedReport = reports.find(r => r.id === selectedReportId) || reports[0];
  
  if (!user || (!isApproved && !isAdmin)) {
    return (
      <Layout>
        <div className="py-12 bg-muted min-h-screen">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Turite būti prisijungęs ir patvirtintas, kad galėtumėte peržiūrėti ataskaitą.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("lt-LT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMonthName = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "yyyy LLLL", { locale: lt });
  };

  const handlePrevMonth = () => {
    const currentIndex = reports.findIndex(r => r.id === selectedReport?.id);
    if (currentIndex < reports.length - 1) {
      setSelectedReportId(reports[currentIndex + 1].id);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = reports.findIndex(r => r.id === selectedReport?.id);
    if (currentIndex > 0) {
      setSelectedReportId(reports[currentIndex - 1].id);
    }
  };

  const currentIndex = reports.findIndex(r => r.id === selectedReport?.id);
  const hasPrev = currentIndex < reports.length - 1;
  const hasNext = currentIndex > 0;

  return (
    <Layout>
      <div className="py-8 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
                  Mėnesio finansinė ataskaita
                </h1>
                <p className="text-muted-foreground">Pasirinkite mėnesį norėdami peržiūrėti detalizaciją</p>
              </div>
            </div>

            {/* Month Selector */}
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Kol kas nėra mėnesio ataskaitų</p>
                  {isAdmin && (
                    <Button
                      className="gap-2"
                      onClick={() => navigate("/admin?tab=monthly-reports&new=1")}
                    >
                      <Upload className="h-4 w-4" />
                      Įkelti mėnesio ataskaitą
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevMonth}
                    disabled={!hasPrev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <Select
                    value={selectedReport?.id || ""}
                    onValueChange={setSelectedReportId}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Pasirinkite mėnesį" />
                    </SelectTrigger>
                    <SelectContent>
                      {reports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          <span className="capitalize">{getMonthName(report.report_month)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextMonth}
                    disabled={!hasNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {selectedReport?.file_url && (
                    <Button variant="outline" asChild className="ml-auto gap-2">
                      <a href={selectedReport.file_url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                        Atsisiųsti Excel
                      </a>
                    </Button>
                  )}
                </div>

                {selectedReport && (
                  <>
                    {/* Report Title */}
                    <div className="mt-6 mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold">{selectedReport.title}</h2>
                        {!selectedReport.published && isAdmin && (
                          <Badge variant="secondary">Nepublikuota</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {getMonthName(selectedReport.report_month)}
                      </p>
                    </div>

                    {/* View Tabs */}
                    <Tabs value={activeView} onValueChange={setActiveView} className="mb-6">
                      <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="overview" className="gap-2">
                          <Eye className="h-4 w-4" />
                          Suvestinė
                        </TabsTrigger>
                        <TabsTrigger value="charts" className="gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Grafikai
                        </TabsTrigger>
                        <TabsTrigger value="tables" className="gap-2">
                          <Table className="h-4 w-4" />
                          Lentelės
                        </TabsTrigger>
                      </TabsList>

                      {/* Overview Tab - Summary Cards */}
                      <TabsContent value="overview" className="mt-6">
                        {selectedReport.summary_data && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                  <Wallet className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Likutis pradžioje</span>
                                </div>
                                <p className="text-2xl font-bold text-foreground">
                                  {formatCurrency(selectedReport.summary_data.likutisPr)}
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingUp className="h-5 w-5 text-success" />
                                  <span className="text-sm text-muted-foreground">Priskaitymai</span>
                                </div>
                                <p className="text-2xl font-bold text-success">
                                  {formatCurrency(selectedReport.summary_data.priskaitymai)}
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                  <TrendingDown className="h-5 w-5 text-destructive" />
                                  <span className="text-sm text-muted-foreground">Išleista</span>
                                </div>
                                <p className="text-2xl font-bold text-destructive">
                                  {formatCurrency(selectedReport.summary_data.isleista)}
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-6">
                                <div className="flex items-center gap-2 mb-2">
                                  <Euro className="h-5 w-5 text-primary" />
                                  <span className="text-sm text-muted-foreground">Likutis pabaigoje</span>
                                </div>
                                <p className="text-2xl font-bold text-primary">
                                  {formatCurrency(selectedReport.summary_data.likutisPab)}
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Quick summary pie chart */}
                        {selectedReport.summary_data && (
                          <Card>
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                <PieChartIcon className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Pajamos vs Išlaidos</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: "Priskaitymai", value: selectedReport.summary_data.priskaitymai, fill: "hsl(var(--primary))" },
                                      { name: "Išleista", value: Math.abs(selectedReport.summary_data.isleista), fill: "hsl(var(--destructive))" },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                  >
                                    <Cell fill="hsl(var(--primary))" />
                                    <Cell fill="hsl(var(--destructive))" />
                                  </Pie>
                                  <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "8px",
                                    }}
                                  />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      {/* Charts Tab */}
                      <TabsContent value="charts" className="mt-6 space-y-6">
                        {selectedReport.summary_data && (
                          <div className="grid lg:grid-cols-2 gap-6">
                            {/* Summary Bar Chart */}
                            <Card>
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="h-5 w-5 text-primary" />
                                  <CardTitle className="text-lg">Finansų apžvalga</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                  <BarChart
                                    data={[
                                      {
                                        name: "Likutis pr.",
                                        value: selectedReport.summary_data.likutisPr,
                                        fill: "hsl(var(--muted-foreground))",
                                      },
                                      {
                                        name: "Priskaitymai",
                                        value: selectedReport.summary_data.priskaitymai,
                                        fill: "hsl(var(--primary))",
                                      },
                                      {
                                        name: "Išleista",
                                        value: Math.abs(selectedReport.summary_data.isleista),
                                        fill: "hsl(var(--destructive))",
                                      },
                                      {
                                        name: "Likutis pab.",
                                        value: selectedReport.summary_data.likutisPab,
                                        fill: "hsl(var(--accent))",
                                      },
                                    ]}
                                    margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                      formatter={(value: number) => formatCurrency(value)}
                                      contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                      }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                      {[
                                        { name: "Likutis pr.", fill: "hsl(var(--muted-foreground))" },
                                        { name: "Priskaitymai", fill: "hsl(var(--primary))" },
                                        { name: "Išleista", fill: "hsl(var(--destructive))" },
                                        { name: "Likutis pab.", fill: "hsl(var(--accent))" },
                                      ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>

                            {/* Pie Chart for Income vs Expenses */}
                            <Card>
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                  <PieChartIcon className="h-5 w-5 text-primary" />
                                  <CardTitle className="text-lg">Pajamos vs Išlaidos</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={250}>
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: "Priskaitymai", value: selectedReport.summary_data.priskaitymai, fill: "hsl(var(--primary))" },
                                        { name: "Išleista", value: Math.abs(selectedReport.summary_data.isleista), fill: "hsl(var(--destructive))" },
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={90}
                                      paddingAngle={5}
                                      dataKey="value"
                                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                      labelLine={false}
                                    >
                                      <Cell fill="hsl(var(--primary))" />
                                      <Cell fill="hsl(var(--destructive))" />
                                    </Pie>
                                    <Tooltip
                                      formatter={(value: number) => formatCurrency(value)}
                                      contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                      }}
                                    />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Categories Chart */}
                        {selectedReport.main_categories && selectedReport.main_categories.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">Kategorijų palyginimas</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                  data={selectedReport.main_categories.slice(0, 8).map(cat => ({
                                    name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
                                    Priskaitymai: cat.priskaitymai,
                                    Išleista: Math.abs(cat.isleista),
                                  }))}
                                  margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                  <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 11 }} 
                                    stroke="hsl(var(--muted-foreground))" 
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                  />
                                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                  <Tooltip
                                    formatter={(value: number) => formatCurrency(value)}
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--card))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "8px",
                                    }}
                                  />
                                  <Legend />
                                  <Bar dataKey="Priskaitymai" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="Išleista" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}

                        {!selectedReport.summary_data && !selectedReport.main_categories && (
                          <Card>
                            <CardContent className="py-12 text-center">
                              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">Nėra duomenų grafikams</p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>

                      {/* Tables Tab */}
                      <TabsContent value="tables" className="mt-6 space-y-6">
                        {/* Main Categories Table */}
                        {selectedReport.main_categories && selectedReport.main_categories.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Pagrindinės kategorijos</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left py-3 px-4 font-medium">Kategorija</th>
                                      <th className="text-right py-3 px-4 font-medium">Likutis pr.</th>
                                      <th className="text-right py-3 px-4 font-medium">Priskaitymai</th>
                                      <th className="text-right py-3 px-4 font-medium">Išleista</th>
                                      <th className="text-right py-3 px-4 font-medium">Likutis pab.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedReport.main_categories.map((cat) => (
                                      <tr key={cat.name} className="border-b hover:bg-muted/50 transition-colors">
                                        <td className="py-3 px-4 font-medium">{cat.name}</td>
                                        <td className="text-right py-3 px-4">{formatCurrency(cat.likutisPr)}</td>
                                        <td className="text-right py-3 px-4 text-success">{formatCurrency(cat.priskaitymai)}</td>
                                        <td className="text-right py-3 px-4 text-destructive">{formatCurrency(cat.isleista)}</td>
                                        <td className="text-right py-3 px-4">
                                          <Badge variant={cat.likutisPab >= 0 ? "default" : "destructive"}>
                                            {formatCurrency(cat.likutisPab)}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Detailed Categories */}
                        {selectedReport.detailed_categories && selectedReport.detailed_categories.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Detalus išlaidų suskirstymas</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedReport.detailed_categories.map((cat) => (
                                  <div
                                    key={cat.name}
                                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                                  >
                                    <div className="flex items-center gap-2 mb-3">
                                      <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: cat.color || "hsl(var(--primary))" }}
                                      />
                                      <span className="font-medium text-sm">{cat.name}</span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Priskaitymai:</span>
                                        <span className="text-success font-medium">{formatCurrency(cat.priskaitymai)}</span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Išleista:</span>
                                        <span className="text-destructive font-medium">{formatCurrency(cat.isleista)}</span>
                                      </div>
                                      <div className="pt-2 border-t">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-muted-foreground">Skirtumas:</span>
                                          <Badge variant={cat.priskaitymai + cat.isleista >= 0 ? "default" : "destructive"}>
                                            {formatCurrency(cat.priskaitymai + cat.isleista)}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {!selectedReport.main_categories && !selectedReport.detailed_categories && (
                          <Card>
                            <CardContent className="py-12 text-center">
                              <Table className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">Nėra duomenų lentelėms</p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>
                    </Tabs>

                    {/* File download if available */}
                    {selectedReport.file_url && (
                      <Card className="mt-6">
                        <CardContent className="py-6 text-center">
                          <p className="text-muted-foreground mb-4">
                            Norite peržiūrėti pilną ataskaitą? Atsisiųskite Excel failą.
                          </p>
                          <Button asChild className="gap-2">
                            <a href={selectedReport.file_url} target="_blank" rel="noopener noreferrer" download>
                              <Download className="h-4 w-4" />
                              Atsisiųsti ataskaitą
                            </a>
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}