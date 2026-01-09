import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Download, CreditCard, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// Mock data - will be replaced with Cloud data
const invoices = [
  {
    id: "INV-2024-001",
    period: "2024 Sausis",
    amount: 125.50,
    dueDate: "2024-02-15",
    status: "unpaid",
    items: [
      { name: "Namo išlaikymas", amount: 45.00 },
      { name: "Šildymas", amount: 55.50 },
      { name: "Vandentiekis", amount: 15.00 },
      { name: "Liftas", amount: 10.00 },
    ],
  },
  {
    id: "INV-2023-012",
    period: "2023 Gruodis",
    amount: 132.00,
    dueDate: "2024-01-15",
    status: "paid",
    paidDate: "2024-01-10",
    items: [
      { name: "Namo išlaikymas", amount: 45.00 },
      { name: "Šildymas", amount: 62.00 },
      { name: "Vandentiekis", amount: 15.00 },
      { name: "Liftas", amount: 10.00 },
    ],
  },
  {
    id: "INV-2023-011",
    period: "2023 Lapkritis",
    amount: 118.75,
    dueDate: "2023-12-15",
    status: "paid",
    paidDate: "2023-12-08",
    items: [
      { name: "Namo išlaikymas", amount: 45.00 },
      { name: "Šildymas", amount: 48.75 },
      { name: "Vandentiekis", amount: 15.00 },
      { name: "Liftas", amount: 10.00 },
    ],
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-success text-success-foreground gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Apmokėta
        </Badge>
      );
    case "unpaid":
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Neapmokėta
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="destructive" className="gap-1">
          <Clock className="h-3 w-3" />
          Vėluoja
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function Invoices() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const unpaidTotal = invoices
    .filter((inv) => inv.status === "unpaid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (loading) {
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

  const handleDownload = (invoiceId: string) => {
    toast.success("Sąskaita atsisiunčiama...");
  };

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
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

            <Card className="card-elevated animate-slide-up" style={{ animationDelay: "100ms" }}>
              <CardHeader>
                <CardTitle>Sąskaitų istorija</CardTitle>
                <CardDescription>
                  Visos jūsų sąskaitos ir mokėjimai
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numeris</TableHead>
                        <TableHead>Laikotarpis</TableHead>
                        <TableHead>Suma</TableHead>
                        <TableHead>Apmokėti iki</TableHead>
                        <TableHead>Būsena</TableHead>
                        <TableHead className="text-right">Veiksmai</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.id}</TableCell>
                          <TableCell>{invoice.period}</TableCell>
                          <TableCell className="font-semibold">{invoice.amount.toFixed(2)} €</TableCell>
                          <TableCell>{invoice.dueDate}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(invoice.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {invoice.status === "unpaid" && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePayment(invoice.id)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                  Mokėti
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated mt-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <CardHeader>
                <CardTitle className="text-lg">Sąskaitos detalės: {invoices[0].id}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paslauga</TableHead>
                      <TableHead className="text-right">Suma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices[0].items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">{item.amount.toFixed(2)} €</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell>Iš viso</TableCell>
                      <TableCell className="text-right">{invoices[0].amount.toFixed(2)} €</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
