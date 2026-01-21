import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Calendar,
  Download,
  BarChart3,
  PieChartIcon,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { lt } from "date-fns/locale";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 65%, 60%)",
];

type PeriodType = "month" | "year";

export function AdminAccountingReports() {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = format(date, "yyyy MMMM", { locale: lt });
      options.push({ value, label });
    }
    return options;
  }, []);

  // Generate year options
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString(),
    }));
  }, []);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    if (periodType === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const date = new Date(year, month - 1, 1);
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    } else {
      const year = parseInt(selectedYear);
      return {
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1)),
      };
    }
  }, [periodType, selectedMonth, selectedYear]);

  // Fetch vendor invoices with items
  const { data: invoicesData = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["accounting-reports-invoices", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_invoices")
        .select(`
          *,
          vendors(name),
          vendor_invoice_items(
            *,
            cost_categories(id, name, code, parent_id)
          )
        `)
        .gte("invoice_date", dateRange.start.toISOString().split("T")[0])
        .lte("invoice_date", dateRange.end.toISOString().split("T")[0])
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch cost categories
  const { data: categories = [] } = useQuery({
    queryKey: ["cost-categories-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch monthly data for trend chart
  const { data: monthlyTrend = [] } = useQuery({
    queryKey: ["monthly-trend", selectedYear],
    queryFn: async () => {
      const year = parseInt(selectedYear);
      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(new Date(year, 0, 1));

      const { data, error } = await supabase
        .from("vendor_invoices")
        .select("invoice_date, total_amount")
        .gte("invoice_date", start.toISOString().split("T")[0])
        .lte("invoice_date", end.toISOString().split("T")[0]);

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, number> = {};
      data.forEach((invoice) => {
        const month = invoice.invoice_date.substring(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + (invoice.total_amount || 0);
      });

      // Create array for all 12 months
      return Array.from({ length: 12 }, (_, i) => {
        const month = `${year}-${String(i + 1).padStart(2, "0")}`;
        const monthName = format(new Date(year, i, 1), "MMM", { locale: lt });
        return {
          month: monthName,
          amount: monthlyData[month] || 0,
        };
      });
    },
    enabled: periodType === "year",
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const totalExpenses = invoicesData.reduce(
      (sum, inv) => sum + (inv.total_amount || 0),
      0
    );
    const totalInvoices = invoicesData.length;
    const paidInvoices = invoicesData.filter((inv) => inv.status === "paid").length;
    const unpaidAmount = invoicesData
      .filter((inv) => inv.status !== "paid")
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // Calculate by category
    const categorySpending: Record<string, { name: string; amount: number; budget: number }> = {};
    
    invoicesData.forEach((invoice) => {
      const items = invoice.vendor_invoice_items || [];
      items.forEach((item: any) => {
        const category = item.cost_categories;
        if (category) {
          if (!categorySpending[category.id]) {
            const cat = categories.find((c) => c.id === category.id);
            categorySpending[category.id] = {
              name: category.name,
              amount: 0,
              budget: (cat?.budget_monthly || 0) * (periodType === "year" ? 12 : 1),
            };
          }
          categorySpending[category.id].amount += item.total_price || 0;
        }
      });
    });

    // Calculate by vendor
    const vendorSpending: Record<string, { name: string; amount: number }> = {};
    invoicesData.forEach((invoice) => {
      const vendorName = invoice.vendors?.name || "Nežinomas";
      if (!vendorSpending[vendorName]) {
        vendorSpending[vendorName] = { name: vendorName, amount: 0 };
      }
      vendorSpending[vendorName].amount += invoice.total_amount || 0;
    });

    return {
      totalExpenses,
      totalInvoices,
      paidInvoices,
      unpaidAmount,
      categorySpending: Object.values(categorySpending).sort((a, b) => b.amount - a.amount),
      vendorSpending: Object.values(vendorSpending).sort((a, b) => b.amount - a.amount),
    };
  }, [invoicesData, categories, periodType]);

  // Prepare chart data
  const pieChartData = stats.categorySpending.slice(0, 8).map((cat, index) => ({
    name: cat.name,
    value: cat.amount,
    fill: COLORS[index % COLORS.length],
  }));

  const barChartData = stats.vendorSpending.slice(0, 10).map((vendor) => ({
    name: vendor.name.length > 15 ? vendor.name.substring(0, 15) + "..." : vendor.name,
    amount: vendor.amount,
  }));

  const budgetComparisonData = stats.categorySpending
    .filter((cat) => cat.budget > 0)
    .slice(0, 8)
    .map((cat) => ({
      name: cat.name.length > 12 ? cat.name.substring(0, 12) + "..." : cat.name,
      actual: cat.amount,
      budget: cat.budget,
    }));

  const chartConfig = {
    amount: {
      label: "Suma",
      color: "hsl(var(--chart-1))",
    },
    actual: {
      label: "Faktinės išlaidos",
      color: "hsl(var(--chart-1))",
    },
    budget: {
      label: "Biudžetas",
      color: "hsl(var(--chart-2))",
    },
  };

  const periodLabel = periodType === "month" 
    ? format(dateRange.start, "yyyy MMMM", { locale: lt })
    : selectedYear;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Apskaitos ataskaitos
              </CardTitle>
              <CardDescription>
                Išlaidų analizė ir biudžeto palyginimas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mėnesinis</SelectItem>
                  <SelectItem value="year">Metinis</SelectItem>
                </SelectContent>
              </Select>
              {periodType === "month" ? (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visos išlaidos</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sąskaitos</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidInvoices} apmokėtos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neapmokėta</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              €{stats.unpaidAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalInvoices - stats.paidInvoices} sąskaitos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kategorijos</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categorySpending.length}</div>
            <p className="text-xs text-muted-foreground">su išlaidomis</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Išlaidos pagal kategorijas</CardTitle>
            <CardDescription>Top 8 kategorijos pagal išlaidas</CardDescription>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`€${value.toFixed(2)}`, "Suma"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nėra duomenų
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendor bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Išlaidos pagal tiekėjus</CardTitle>
            <CardDescription>Top 10 tiekėjų pagal sumas</CardDescription>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `€${v}`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [`€${value.toFixed(2)}`, "Suma"]}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nėra duomenų
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget comparison */}
      {budgetComparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biudžeto palyginimas</CardTitle>
            <CardDescription>
              Faktinės išlaidos vs planuotas biudžetas ({periodLabel})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={budgetComparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `€${v}`} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => `€${value.toFixed(2)}`}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="actual" name="Faktinės" fill="hsl(var(--chart-1))" radius={4} />
                <Bar dataKey="budget" name="Biudžetas" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly trend for yearly view */}
      {periodType === "year" && monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mėnesinis trendas</CardTitle>
            <CardDescription>Išlaidų dinamika per {selectedYear} metus</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `€${v}`} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`€${value.toFixed(2)}`, "Suma"]}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-1))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Category details table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Išlaidos pagal kategorijas</CardTitle>
          <CardDescription>Detali suvestinė su biudžeto vykdymu</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stats.categorySpending.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategorija</TableHead>
                  <TableHead className="text-right">Išlaidos</TableHead>
                  <TableHead className="text-right">Biudžetas</TableHead>
                  <TableHead className="w-[200px]">Vykdymas</TableHead>
                  <TableHead className="text-center">Būsena</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.categorySpending.map((category) => {
                  const budgetPercent = category.budget > 0
                    ? (category.amount / category.budget) * 100
                    : 0;
                  const isOverBudget = budgetPercent > 100;
                  const isNearBudget = budgetPercent > 80 && budgetPercent <= 100;

                  return (
                    <TableRow key={category.name}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        €{category.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {category.budget > 0 ? (
                          `€${category.budget.toFixed(2)}`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {category.budget > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress
                              value={Math.min(budgetPercent, 100)}
                              className={`h-2 ${
                                isOverBudget
                                  ? "[&>div]:bg-destructive"
                                  : isNearBudget
                                  ? "[&>div]:bg-yellow-500"
                                  : ""
                              }`}
                            />
                            <span className="text-xs text-muted-foreground w-12">
                              {budgetPercent.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Biudžetas nenustatytas
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {category.budget > 0 ? (
                          <Badge
                            variant={
                              isOverBudget
                                ? "destructive"
                                : isNearBudget
                                ? "secondary"
                                : "default"
                            }
                          >
                            {isOverBudget
                              ? "Viršyta"
                              : isNearBudget
                              ? "Artėja"
                              : "Gerai"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Nėra išlaidų pasirinktam laikotarpiui
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
