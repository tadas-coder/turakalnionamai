import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, CreditCard, CheckCircle2, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { lt } from "date-fns/locale";

const getStatusBadge = (status: string, dueDate: string) => {
  const isOverdue = new Date(dueDate) < new Date() && status !== "paid";
  
  if (status === "paid") {
    return (
      <Badge className="bg-success text-success-foreground gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Apmokėta
      </Badge>
    );
  }
  
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock className="h-3 w-3" />
        Vėluoja
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Neapmokėta
    </Badge>
  );
};

const formatMonth = (dateStr: string) => {
  const date = parseISO(dateStr);
  return format(date, "yyyy MMM", { locale: lt });
};

export default function Invoices() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user?.id)
        .order("due_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const unpaidTotal = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  // Prepare chart data - sort by date ascending for chart
  const chartData = [...invoices]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .map((inv) => ({
      month: formatMonth(inv.due_date),
      amount: Number(inv.amount),
      status: inv.status,
    }));

  if (loading || invoicesLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const handlePayment = (invoiceId: string) => {
    toast.info("Mokėjimo sistema netrukus bus aktyvi", {
      description: "Šiuo metu mokėjimas internetu nėra galimas.",
    });
  };

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-warning/10 text-warning px-4 py-2 rounded-full mb-4">
                <Receipt className="h-4 w-4" />
                <span className="text-sm font-medium">Sąskaitos</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Mano sąskaitos
              </h1>
              <p className="text-muted-foreground">
                Peržiūrėkite ir apmokėkite komunalines sąskaitas
              </p>
            </div>

            {unpaidTotal > 0 && (
              <Card className="card-elevated mb-8 border-destructive/30 bg-destructive/5 animate-slide-up">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Neapmokėta suma</p>
                      <p className="text-2xl font-bold text-destructive">{unpaidTotal.toFixed(2)} €</p>
                    </div>
                  </div>
                  <Button variant="hero" size="lg" onClick={() => handlePayment("all")}>
                    <CreditCard className="h-4 w-4" />
                    Apmokėti viską
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Chart Section */}
            {chartData.length > 0 && (
              <Card className="card-elevated mb-8 animate-slide-up" style={{ animationDelay: "50ms" }}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle>Mokėjimų istorija</CardTitle>
                  </div>
                  <CardDescription>
                    Mėnesinių sąskaitų sumos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(value) => `${value} €`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)} €`, 'Suma']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.status === 'paid' ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-success" />
                      <span className="text-muted-foreground">Apmokėta</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-primary" />
                      <span className="text-muted-foreground">Neapmokėta</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="card-elevated animate-slide-up" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle>Sąskaitų sąrašas</CardTitle>
                <CardDescription>
                  Visos jūsų sąskaitos ir mokėjimai
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sąskaitų nerasta</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pavadinimas</TableHead>
                          <TableHead>Suma</TableHead>
                          <TableHead>Apmokėti iki</TableHead>
                          <TableHead>Būsena</TableHead>
                          <TableHead className="text-right">Veiksmai</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.title}</TableCell>
                            <TableCell className="font-semibold">{Number(invoice.amount).toFixed(2)} €</TableCell>
                            <TableCell>{format(parseISO(invoice.due_date), "yyyy-MM-dd")}</TableCell>
                            <TableCell>{getStatusBadge(invoice.status || 'pending', invoice.due_date)}</TableCell>
                            <TableCell className="text-right">
                              {invoice.status !== "paid" && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayment(invoice.id)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  Mokėti
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            {invoices.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Iš viso sąskaitų</p>
                      <p className="text-3xl font-bold text-foreground">{invoices.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Bendra suma</p>
                      <p className="text-3xl font-bold text-foreground">
                        {invoices.reduce((sum, inv) => sum + Number(inv.amount), 0).toFixed(2)} €
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-elevated">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Vidutinė sąskaita</p>
                      <p className="text-3xl font-bold text-foreground">
                        {(invoices.reduce((sum, inv) => sum + Number(inv.amount), 0) / invoices.length).toFixed(2)} €
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
