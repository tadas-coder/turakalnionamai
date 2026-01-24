import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Vote, Users, LayoutDashboard, ClipboardList, CalendarDays, FileSpreadsheet, Building2, Receipt, Calculator } from "lucide-react";
import { AdminTickets } from "@/components/admin/AdminTickets";
import { AdminPolls } from "@/components/admin/AdminPolls";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminResidents } from "@/components/admin/AdminResidents";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminSchedules } from "@/components/admin/AdminSchedules";
import { AdminMonthlyReports } from "@/components/admin/AdminMonthlyReports";
import AdminPaymentSlips from "@/components/admin/AdminPaymentSlips";
import { AdminAccounting } from "@/components/admin/AdminAccounting";
import { toast } from "sonner";

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // Support deep-linking to a tab, e.g. /admin?tab=monthly-reports
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, [location.search]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (!isAdmin) {
        toast.error("Neturite prieigos prie administratoriaus skydelio");
        navigate("/");
      }
    }
  }, [user, isAdmin, loading, navigate]);

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
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold">Reikia prisijungti</h1>
            <p className="text-muted-foreground">Administratoriaus skiltis pasiekiama tik prisijungus.</p>
            <Button onClick={() => navigate("/auth")}>Prisijungti</Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold">Nėra prieigos</h1>
            <p className="text-muted-foreground">Jūsų paskyra neturi administratoriaus teisių.</p>
            <Button variant="outline" onClick={() => navigate("/")}>Grįžti į pradžią</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl font-bold font-display text-foreground mb-2">
              Administratoriaus skiltis
            </h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 h-auto p-2 bg-background border shadow-sm rounded-lg">
              <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Apžvalga</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Vartotojai</span>
              </TabsTrigger>
              <TabsTrigger value="residents" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Gyventojai</span>
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <ClipboardCheck className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Mano užduotys</span>
              </TabsTrigger>
              <TabsTrigger value="polls" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <Vote className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Apklausos ir susirinkimai</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Ataskaitos</span>
              </TabsTrigger>
              <TabsTrigger value="monthly-reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Mėnesio</span>
              </TabsTrigger>
              <TabsTrigger value="schedules" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Grafikai</span>
              </TabsTrigger>
              <TabsTrigger value="payment-slips" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Lapeliai</span>
              </TabsTrigger>
              <TabsTrigger value="accounting" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Apskaita</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="animate-fade-in">
              <AdminOverview onTabChange={setActiveTab} />
            </TabsContent>

            <TabsContent value="users" className="animate-fade-in">
              <AdminUsers />
            </TabsContent>

            <TabsContent value="residents" className="animate-fade-in">
              <AdminResidents />
            </TabsContent>

            <TabsContent value="tickets" className="animate-fade-in">
              <AdminTickets />
            </TabsContent>

            <TabsContent value="polls" className="animate-fade-in">
              <AdminPolls />
            </TabsContent>

            <TabsContent value="reports" className="animate-fade-in">
              <AdminReports />
            </TabsContent>

            <TabsContent value="monthly-reports" className="animate-fade-in">
              <AdminMonthlyReports />
            </TabsContent>

            <TabsContent value="schedules" className="animate-fade-in">
              <AdminSchedules />
            </TabsContent>

            <TabsContent value="payment-slips" className="animate-fade-in">
              <AdminPaymentSlips />
            </TabsContent>

            <TabsContent value="accounting" className="animate-fade-in">
              <AdminAccounting />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
