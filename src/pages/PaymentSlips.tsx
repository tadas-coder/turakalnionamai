import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, TrendingUp, TrendingDown, BarChart3, ChevronDown, Receipt, Wallet, CalendarDays, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";

interface PaymentSlip {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  period_month: string;
  buyer_name: string | null;
  apartment_address: string;
  apartment_number: string | null;
  payment_code: string | null;
  previous_amount: number;
  payments_received: number;
  balance: number;
  accrued_amount: number;
  total_due: number;
  line_items: any[];
  utility_readings: any;
  pdf_url: string | null;
  pdf_file_name: string | null;
  assignment_status: string;
  created_at: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#ec4899', '#06b6d4', '#84cc16'];

function PaymentSlipCard({ slip, formatCurrency }: { slip: PaymentSlip; formatCurrency: (n: number) => string }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDebt = slip.balance > 0;
  const hasOverpayment = slip.balance < 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full text-left rounded-xl border bg-card transition-all duration-200",
          "hover:shadow-md hover:border-primary/30",
          isOpen && "shadow-md border-primary/30",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  hasDebt ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}>
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {format(new Date(slip.period_month), "yyyy m. MMMM", { locale: lt })}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Nr. {slip.invoice_number}
                    {slip.apartment_number && ` • But. ${slip.apartment_number}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-bold text-base">{formatCurrency(slip.total_due)}</p>
                  {hasDebt && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Skola {formatCurrency(slip.balance)}
                    </Badge>
                  )}
                  {hasOverpayment && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Permoka {formatCurrency(Math.abs(slip.balance))}
                    </Badge>
                  )}
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </div>
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="px-4 pb-4 -mt-2 pt-3 border border-t-0 rounded-b-xl bg-card border-primary/30">
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ankstesnė</p>
                <p className="text-sm font-medium">{formatCurrency(slip.previous_amount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Įmokos</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">-{formatCurrency(slip.payments_received)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Receipt className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Priskaityta</p>
                <p className="text-sm font-medium">{formatCurrency(slip.accrued_amount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
              <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Terminas</p>
                <p className="text-sm font-medium">{format(new Date(slip.due_date), "MM-dd")}</p>
              </div>
            </div>
          </div>

          {/* Line items */}
          {slip.line_items?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Paslaugos</p>
              <div className="space-y-1.5">
                {slip.line_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-sm">
                    <span className="text-foreground truncate mr-3">{item.name}</span>
                    <span className="font-medium whitespace-nowrap tabular-nums">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 mt-1 border-t font-bold text-sm px-2">
                  <span>Mokėtina suma</span>
                  <span className="tabular-nums">{formatCurrency(slip.total_due)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment code */}
          {slip.payment_code && (
            <div className="mt-3 p-2.5 rounded-lg bg-muted/70 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Mokėtojo kodas:</span>
              <code className="text-xs font-mono font-semibold text-foreground bg-background px-2 py-0.5 rounded">{slip.payment_code}</code>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PaymentSlips() {
  const { user, isApproved, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const { data: paymentSlips, isLoading } = useQuery({
    queryKey: ["user-payment-slips", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_slips")
        .select("*")
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data as PaymentSlip[];
    },
    enabled: !!user
  });

  if (!user || (!isApproved && !isAdmin)) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Prašome prisijungti ir sulaukti patvirtinimo, kad galėtumėte matyti mokėjimo lapelius.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const periods = paymentSlips
    ? [...new Set(paymentSlips.map(s => s.period_month))].sort().reverse()
    : [];

  const filteredSlips = paymentSlips?.filter(slip =>
    selectedPeriod === "all" || slip.period_month === selectedPeriod
  );

  const stats = {
    totalSlips: filteredSlips?.length || 0,
    totalAmount: filteredSlips?.reduce((sum, s) => sum + (s.total_due || 0), 0) || 0,
    totalPaid: filteredSlips?.reduce((sum, s) => sum + (s.payments_received || 0), 0) || 0,
    avgMonthly: paymentSlips && paymentSlips.length > 0
      ? paymentSlips.reduce((sum, s) => sum + (s.total_due || 0), 0) / new Set(paymentSlips.map(s => s.period_month)).size
      : 0
  };

  const monthlyData = paymentSlips?.reduce((acc, slip) => {
    const month = format(new Date(slip.period_month), "yyyy-MM");
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.amount += slip.total_due;
    } else {
      acc.push({ month, amount: slip.total_due, label: format(new Date(slip.period_month), "MMM yy", { locale: lt }) });
    }
    return acc;
  }, [] as Array<{ month: string; amount: number; label: string }>).sort((a, b) => a.month.localeCompare(b.month)) || [];

  const latestSlip = paymentSlips?.[0];
  const expenseBreakdown = latestSlip?.line_items?.map((item: any, idx: number) => ({
    name: item.name?.length > 25 ? item.name.substring(0, 25) + '...' : item.name,
    fullName: item.name,
    value: item.amount,
    color: COLORS[idx % COLORS.length]
  })) || [];

  const currentPeriodSlip = filteredSlips?.[0];
  const previousPeriodIndex = paymentSlips?.findIndex(s => s.period_month === currentPeriodSlip?.period_month);
  const previousPeriodSlip = previousPeriodIndex !== undefined && previousPeriodIndex >= 0
    ? paymentSlips?.[previousPeriodIndex + 1]
    : null;

  const changePercent = currentPeriodSlip && previousPeriodSlip
    ? ((currentPeriodSlip.total_due - previousPeriodSlip.total_due) / previousPeriodSlip.total_due * 100)
    : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Sąskaitos ir mokėjimai</h1>
            <p className="text-muted-foreground text-sm">Paspauskite lapelį, kad matytumėte detalią informaciją</p>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Pasirinkite periodą" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Visi periodai</SelectItem>
              {periods.map(period => (
                <SelectItem key={period} value={period}>
                  {format(new Date(period), "yyyy MMMM", { locale: lt })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{selectedPeriod === "all" ? "Viso lapelių" : "Šio periodo"}</p>
              <p className="text-2xl font-bold mt-1">{stats.totalSlips}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500/5 to-transparent">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Mokėtina</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
              {changePercent !== 0 && selectedPeriod !== "all" && (
                <div className={cn("flex items-center text-xs mt-0.5", changePercent > 0 ? 'text-destructive' : 'text-green-600')}>
                  {changePercent > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {Math.abs(changePercent).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Sumokėta</p>
              <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{formatCurrency(stats.totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Mėn. vidurkis</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.avgMonthly)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">
              <FileText className="h-4 w-4 mr-2" />
              Lapeliai
            </TabsTrigger>
            <TabsTrigger value="charts">
              <BarChart3 className="h-4 w-4 mr-2" />
              Grafikai
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-[72px] rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredSlips?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  Mokėjimo lapelių nerasta
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredSlips?.map((slip) => (
                  <PaymentSlipCard key={slip.id} slip={slip} formatCurrency={formatCurrency} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mėnesinė tendencija</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={(value) => `${value}€`} />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Suma"]}
                          labelFormatter={(label) => `Periodas: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nėra duomenų</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Išlaidų pasiskirstymas</CardTitle>
                  {latestSlip && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(latestSlip.period_month), "yyyy MMMM", { locale: lt })}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  {expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {expenseBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name, props) => [
                            formatCurrency(value),
                            props.payload.fullName
                          ]}
                        />
                        <Legend
                          formatter={(value, entry: any) => entry.payload.name}
                          wrapperStyle={{ fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nėra duomenų</div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Mėnesių palyginimas</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis tickFormatter={(value) => `${value}€`} />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), "Suma"]}
                          labelFormatter={(label) => `Periodas: ${label}`}
                        />
                        <Bar
                          dataKey="amount"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nėra duomenų</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
