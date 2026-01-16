import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, TrendingUp, TrendingDown, Minus, BarChart3, X } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function PaymentSlips() {
  const { user, isApproved, isAdmin } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedSlip, setSelectedSlip] = useState<PaymentSlip | null>(null);

  // Fetch user's payment slips
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

  // Get unique periods
  const periods = paymentSlips 
    ? [...new Set(paymentSlips.map(s => s.period_month))].sort().reverse()
    : [];

  // Filter by period
  const filteredSlips = paymentSlips?.filter(slip => 
    selectedPeriod === "all" || slip.period_month === selectedPeriod
  );

  // Calculate stats
  const stats = {
    totalSlips: filteredSlips?.length || 0,
    totalAmount: filteredSlips?.reduce((sum, s) => sum + (s.total_due || 0), 0) || 0,
    totalPaid: filteredSlips?.reduce((sum, s) => sum + (s.payments_received || 0), 0) || 0,
    avgMonthly: paymentSlips && paymentSlips.length > 0 
      ? paymentSlips.reduce((sum, s) => sum + (s.total_due || 0), 0) / new Set(paymentSlips.map(s => s.period_month)).size
      : 0
  };

  // Prepare chart data - monthly totals
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

  // Prepare expense breakdown from latest slip
  const latestSlip = paymentSlips?.[0];
  const expenseBreakdown = latestSlip?.line_items?.map((item: any, idx: number) => ({
    name: item.name?.length > 25 ? item.name.substring(0, 25) + '...' : item.name,
    fullName: item.name,
    value: item.amount,
    color: COLORS[idx % COLORS.length]
  })) || [];

  // Compare with previous period
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
            <h1 className="text-2xl font-bold">Sąskaitos ir skolos</h1>
            <p className="text-muted-foreground">Jūsų mėnesiniai mokėjimai ir statistika</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {selectedPeriod === "all" ? "Viso lapelių" : "Šio periodo"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSlips}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mokėtina suma</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
              {changePercent !== 0 && selectedPeriod !== "all" && (
                <div className={`flex items-center text-sm ${changePercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {changePercent > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {Math.abs(changePercent).toFixed(1)}% nuo praeito mėn.
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sumokėta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mėn. vidurkis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgMonthly)}</div>
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

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center">
                  Kraunama...
                </CardContent>
              </Card>
            ) : filteredSlips?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Mokėjimo lapelių nerasta
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSlips?.map((slip) => (
                  <Card key={slip.id} className="overflow-hidden">
                    <CardHeader className="pb-2 bg-muted/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {format(new Date(slip.period_month), "yyyy m. MMMM", { locale: lt })}
                          </CardTitle>
                          <p className="text-sm font-medium">
                            {slip.apartment_number && `Butas ${slip.apartment_number}`}
                            {slip.apartment_number && slip.buyer_name && " • "}
                            {slip.buyer_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sąskaita: {slip.invoice_number} | Terminas: {format(new Date(slip.due_date), "yyyy-MM-dd")}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{formatCurrency(slip.total_due)}</div>
                          {slip.balance !== 0 && (
                            <Badge variant={slip.balance > 0 ? "destructive" : "secondary"}>
                              {slip.balance > 0 ? "Skola" : "Permoka"}: {formatCurrency(Math.abs(slip.balance))}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Line Items */}
                        <div>
                          <h4 className="font-medium mb-2 text-sm text-muted-foreground">Paslaugos</h4>
                          <div className="space-y-1">
                            {slip.line_items?.slice(0, 5).map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="truncate mr-2">{item.name}</span>
                                <span className="font-medium whitespace-nowrap">{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                            {slip.line_items?.length > 5 && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() => setSelectedSlip(slip)}
                              >
                                Rodyti visas ({slip.line_items.length})
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-2">
                          <h4 className="font-medium mb-2 text-sm text-muted-foreground">Suvestinė</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Ankstesnė suma:</span>
                              <span>{formatCurrency(slip.previous_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gautos įmokos:</span>
                              <span className="text-green-600">-{formatCurrency(slip.payments_received)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Priskaityta:</span>
                              <span>{formatCurrency(slip.accrued_amount)}</span>
                            </div>
                            <div className="flex justify-between font-bold pt-1 border-t">
                              <span>Mokėtina:</span>
                              <span>{formatCurrency(slip.total_due)}</span>
                            </div>
                          </div>
                          {slip.payment_code && (
                            <div className="mt-3 p-2 bg-muted rounded text-xs">
                              <span className="text-muted-foreground">Mokėtojo kodas: </span>
                              <span className="font-mono font-medium">{slip.payment_code}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Charts View */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mėnesinė mokėjimų tendencija</CardTitle>
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
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nėra duomenų
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
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
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
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
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nėra duomenų
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Comparison Bar Chart */}
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
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nėra duomenų
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Line Items Detail Dialog */}
        <Dialog open={!!selectedSlip} onOpenChange={(open) => !open && setSelectedSlip(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Visos paslaugos
              </DialogTitle>
              {selectedSlip && (
                <DialogDescription>
                  {format(new Date(selectedSlip.period_month), "yyyy m. MMMM", { locale: lt })} • Sąskaita: {selectedSlip.invoice_number}
                </DialogDescription>
              )}
            </DialogHeader>
            {selectedSlip && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2 pr-4">
                  {selectedSlip.line_items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{item.name}</span>
                      <span className="font-medium text-sm whitespace-nowrap ml-4">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 font-bold border-t">
                    <span>Viso priskaityta:</span>
                    <span>{formatCurrency(selectedSlip.accrued_amount)}</span>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
