import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Phone, Mail, Home, UserPlus, Trash2, Save, Users, FileText, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  apartment_number: string | null;
  phone: string | null;
};

type LinkedAccount = {
  id: string;
  primary_user_id: string;
  linked_email: string;
  linked_name: string | null;
  relationship: string | null;
  created_at: string;
};

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

export default function Profile() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLinkedEmail, setNewLinkedEmail] = useState("");
  const [newLinkedName, setNewLinkedName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const { data: linkedAccounts = [], isLoading: linkedLoading } = useQuery({
    queryKey: ["linked_accounts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("linked_accounts")
        .select("*")
        .eq("primary_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LinkedAccount[];
    },
    enabled: !!user?.id,
  });

  // Fetch user's payment slips via profile_id
  const { data: paymentSlips = [], isLoading: slipsLoading } = useQuery({
    queryKey: ["profile-payment-slips", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("payment_slips")
        .select("*")
        .eq("profile_id", user.id)
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data as PaymentSlip[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setApartmentNumber(profile.apartment_number || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Neprisijungęs");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          apartment_number: apartmentNumber || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profilis atnaujintas sėkmingai" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const addLinkedAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newLinkedEmail) throw new Error("Užpildykite el. paštą");
      const { error } = await supabase.from("linked_accounts").insert({
        primary_user_id: user.id,
        linked_email: newLinkedEmail,
        linked_name: newLinkedName || null,
        relationship: newRelationship || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linked_accounts", user?.id] });
      toast({ title: "Vartotojas pridėtas" });
      setNewLinkedEmail("");
      setNewLinkedName("");
      setNewRelationship("");
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteLinkedAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("linked_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linked_accounts", user?.id] });
      toast({ title: "Vartotojas pašalintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('lt-LT', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Payment slips statistics
  const slipStats = {
    totalSlips: paymentSlips.length,
    totalAmount: paymentSlips.reduce((sum, s) => sum + (s.total_due || 0), 0),
    avgMonthly: paymentSlips.length > 0 
      ? paymentSlips.reduce((sum, s) => sum + (s.total_due || 0), 0) / paymentSlips.length
      : 0
  };

  // Prepare chart data - monthly totals
  const monthlyData = paymentSlips.reduce((acc, slip) => {
    const month = format(new Date(slip.period_month), "yyyy-MM");
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.amount += slip.total_due;
    } else {
      acc.push({ month, amount: slip.total_due, label: format(new Date(slip.period_month), "MMM yy", { locale: lt }) });
    }
    return acc;
  }, [] as Array<{ month: string; amount: number; label: string }>).sort((a, b) => a.month.localeCompare(b.month));

  // Expense breakdown from latest slip
  const latestSlip = paymentSlips[0];
  const expenseBreakdown = latestSlip?.line_items?.map((item: any, idx: number) => ({
    name: item.name?.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    value: item.amount,
    color: COLORS[idx % COLORS.length]
  })) || [];

  // Compare with previous month
  const previousSlip = paymentSlips[1];
  const changePercent = latestSlip && previousSlip 
    ? ((latestSlip.total_due - previousSlip.total_due) / previousSlip.total_due * 100)
    : 0;

  if (loading || profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Kraunama...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mano profilis</h1>
          <p className="text-muted-foreground mt-1">
            Tvarkyti kontaktinę informaciją, mokėjimo lapelius ir susijusius vartotojus
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profilis
            </TabsTrigger>
            <TabsTrigger value="slips" className="gap-2">
              <FileText className="h-4 w-4" />
              Lapeliai
              {paymentSlips.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {paymentSlips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="linked" className="gap-2">
              <Users className="h-4 w-4" />
              Susiję
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Kontaktinė informacija
                </CardTitle>
                <CardDescription>
                  Atnaujinkite savo kontaktinius duomenis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    El. paštas
                  </Label>
                  <Input
                    id="email"
                    value={profile?.email || ""}
                    disabled
                    className="mt-1.5 bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El. pašto adresas negali būti pakeistas
                  </p>
                </div>

                <div>
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Vardas ir pavardė
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Įveskite vardą ir pavardę"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefono numeris
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+370 600 00000"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="apartment" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Buto numeris
                  </Label>
                  <Input
                    id="apartment"
                    value={apartmentNumber}
                    onChange={(e) => setApartmentNumber(e.target.value)}
                    placeholder="pvz. 15"
                    className="mt-1.5"
                  />
                </div>

                <Button
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                  className="w-full gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateProfileMutation.isPending ? "Saugoma..." : "Išsaugoti pakeitimus"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Slips Tab */}
          <TabsContent value="slips" className="space-y-6">
            {slipsLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Kraunama...
                </CardContent>
              </Card>
            ) : paymentSlips.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Mokėjimo lapelių nerasta</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kai administratorius prisegsi jūsų lapelius, jie bus rodomi čia
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Viso lapelių</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{slipStats.totalSlips}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Paskutinis lapelis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(latestSlip?.total_due || 0)}</div>
                      {changePercent !== 0 && (
                        <div className={`flex items-center text-sm ${changePercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {changePercent > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                          {Math.abs(changePercent).toFixed(1)}% nuo praeito mėn.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Mėn. vidurkis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(slipStats.avgMonthly)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Mėnesinė tendencija
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {monthlyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(value) => `${value}€`} tick={{ fontSize: 12 }} />
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
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
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
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={expenseBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
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
                              wrapperStyle={{ fontSize: '11px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          Nėra duomenų
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Comparison Bar Chart */}
                {monthlyData.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Mėnesių palyginimas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(value) => `${value}€`} tick={{ fontSize: 12 }} />
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
                    </CardContent>
                  </Card>
                )}

                {/* Slips List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Visi lapeliai</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {paymentSlips.map((slip) => (
                      <div key={slip.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">
                            {format(new Date(slip.period_month), "yyyy m. MMMM", { locale: lt })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sąskaita: {slip.invoice_number} | Terminas: {format(new Date(slip.due_date), "yyyy-MM-dd")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(slip.total_due)}</p>
                          {slip.balance !== 0 && slip.balance !== null && (
                            <Badge variant={slip.balance > 0 ? "destructive" : "secondary"} className="text-xs">
                              {slip.balance > 0 ? "Skola" : "Permoka"}: {formatCurrency(Math.abs(slip.balance))}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Linked Accounts Tab */}
          <TabsContent value="linked" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Susiję vartotojai
                    </CardTitle>
                    <CardDescription>
                      Pridėkite šeimos narius ar kitus su paskyra susijusius asmenis
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Pridėti
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Pridėti susijusį vartotoją</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="linkedEmail">El. paštas *</Label>
                          <Input
                            id="linkedEmail"
                            type="email"
                            value={newLinkedEmail}
                            onChange={(e) => setNewLinkedEmail(e.target.value)}
                            placeholder="asmuo@paštas.lt"
                          />
                        </div>
                        <div>
                          <Label htmlFor="linkedName">Vardas</Label>
                          <Input
                            id="linkedName"
                            value={newLinkedName}
                            onChange={(e) => setNewLinkedName(e.target.value)}
                            placeholder="Vardas Pavardė"
                          />
                        </div>
                        <div>
                          <Label htmlFor="relationship">Ryšys</Label>
                          <Input
                            id="relationship"
                            value={newRelationship}
                            onChange={(e) => setNewRelationship(e.target.value)}
                            placeholder="pvz. Šeimos narys, Nuomininkas"
                          />
                        </div>
                        <Button
                          onClick={() => addLinkedAccountMutation.mutate()}
                          disabled={addLinkedAccountMutation.isPending || !newLinkedEmail}
                          className="w-full"
                        >
                          {addLinkedAccountMutation.isPending ? "Pridedama..." : "Pridėti vartotoją"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {linkedLoading ? (
                  <p className="text-muted-foreground text-center py-4">Kraunama...</p>
                ) : linkedAccounts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nėra pridėtų susijusių vartotojų</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {account.linked_name || account.linked_email}
                          </p>
                          {account.linked_name && (
                            <p className="text-sm text-muted-foreground">{account.linked_email}</p>
                          )}
                          {account.relationship && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {account.relationship}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Ar tikrai norite pašalinti šį vartotoją?")) {
                              deleteLinkedAccountMutation.mutate(account.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
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