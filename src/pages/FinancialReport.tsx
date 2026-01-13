import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { FileText, TrendingUp, TrendingDown, Building, Euro, Wallet, PieChart, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Data extracted from the Excel report
const summaryData = {
  likutisPr: 24860.20,
  priskaitymai: 152476.16,
  isleista: 153033.89,
  likutisPab: 24302.47,
  period: "2025-01-01 - 2025-12-31",
  organization: "DNSB Taurakalnio namai",
  address: "V. Mykolaičio-Putino g. 10, Vilnius",
};

const mainCategories = [
  { name: "Administravimo išlaidos", likutisPr: 11014.98, priskaitymai: 61171.55, isleista: 55964.46, likutisPab: 16222.07 },
  { name: "Nuolatinė techninė priežiūra", likutisPr: 1722.65, priskaitymai: 27971.74, isleista: 32174.73, likutisPab: -2480.34 },
  { name: "Komunalinės išlaidos", likutisPr: 446.07, priskaitymai: 17405.92, isleista: 21342.48, likutisPab: -3490.49 },
  { name: "Eksploatacija ir remontas", likutisPr: 2441.56, priskaitymai: 17420.35, isleista: 0, likutisPab: 19861.91 },
  { name: "Tikslinis remontas", likutisPr: 9234.94, priskaitymai: 28506.60, isleista: 43552.22, likutisPab: -5810.68 },
];

const detailedCategories = [
  { name: "T1 Patalpų priežiūra", priskaitymai: 24340.39, isleista: 26400, color: "#0d9488" },
  { name: "T2 Apskaita ir admin.", priskaitymai: 18415.58, isleista: 21437.17, color: "#0891b2" },
  { name: "T3 Valymo paslaugos", priskaitymai: 18415.58, isleista: 8127.29, color: "#06b6d4" },
  { name: "T6 Techninė priežiūra", priskaitymai: 26478.56, isleista: 31114.58, color: "#14b8a6" },
  { name: "T11 Draudimas", priskaitymai: 1493.18, isleista: 800, color: "#2dd4bf" },
  { name: "T18 Elektra", priskaitymai: 15573.77, isleista: 16028.13, color: "#5eead4" },
  { name: "T19 Vanduo", priskaitymai: 1832.15, isleista: 5314.35, color: "#99f6e4" },
];

const monthlyExpenses = [
  { month: "Sau", suma: 12500 },
  { month: "Vas", suma: 11800 },
  { month: "Kov", suma: 14200 },
  { month: "Bal", suma: 16500 },
  { month: "Geg", suma: 13200 },
  { month: "Bir", suma: 12100 },
  { month: "Lie", suma: 11500 },
  { month: "Rgp", suma: 10800 },
  { month: "Rgs", suma: 12400 },
  { month: "Spa", suma: 13800 },
  { month: "Lap", suma: 12200 },
  { month: "Grd", suma: 12000 },
];

const COLORS = ["#0d9488", "#0891b2", "#06b6d4", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

export default function FinancialReport() {
  const { user, isApproved, isAdmin } = useAuth();

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

  return (
    <Layout>
      <div className="py-8 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <PieChart className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">
                  Metinė finansinė ataskaita
                </h1>
                <p className="text-muted-foreground">{summaryData.period}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="p-4 bg-card rounded-lg border flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{summaryData.organization}</span>
                </div>
                <p className="text-sm text-muted-foreground">{summaryData.address}</p>
              </div>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/monthly-financial-report">
                  <Calendar className="h-4 w-4" />
                  Mėnesio ataskaitos
                </Link>
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Likutis pradžioje</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summaryData.likutisPr)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <span className="text-sm text-muted-foreground">Priskaitymai</span>
                </div>
                <p className="text-2xl font-bold text-success">{formatCurrency(summaryData.priskaitymai)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-muted-foreground">Išleista</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(summaryData.isleista)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Likutis pabaigoje</span>
                </div>
                <p className="text-2xl font-bold text-primary">{formatCurrency(summaryData.likutisPab)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mėnesinės išlaidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyExpenses}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Suma"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      />
                      <Bar dataKey="suma" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Expense Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Išlaidų pasiskirstymas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={detailedCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="isleista"
                        nameKey="name"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {detailedCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Išleista"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {detailedCategories.slice(0, 6).map((cat, index) => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Categories Table */}
          <Card className="mb-8">
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
                    {mainCategories.map((cat) => (
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
                  <tfoot>
                    <tr className="bg-muted/50 font-semibold">
                      <td className="py-3 px-4">VISO</td>
                      <td className="text-right py-3 px-4">{formatCurrency(summaryData.likutisPr)}</td>
                      <td className="text-right py-3 px-4 text-success">{formatCurrency(summaryData.priskaitymai)}</td>
                      <td className="text-right py-3 px-4 text-destructive">{formatCurrency(summaryData.isleista)}</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="default">{formatCurrency(summaryData.likutisPab)}</Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalus išlaidų suskirstymas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {detailedCategories.map((cat, index) => (
                  <div
                    key={cat.name}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
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
                          <Badge variant={cat.priskaitymai - cat.isleista >= 0 ? "default" : "destructive"}>
                            {formatCurrency(cat.priskaitymai - cat.isleista)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
