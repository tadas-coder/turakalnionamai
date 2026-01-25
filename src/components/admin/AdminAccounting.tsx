import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShoppingCart, FolderTree, BarChart3, Calendar, Landmark, Gauge, Tag, FileText, History } from "lucide-react";
import { AdminAssets } from "./accounting/AdminAssets";
import { AdminVendors } from "./accounting/AdminVendors";
import { AdminVendorInvoices } from "./accounting/AdminVendorInvoices";
import { AdminCostCategories } from "./accounting/AdminCostCategories";
import { AdminAccountingReports } from "./accounting/AdminAccountingReports";
import { AdminPeriods } from "./accounting/AdminPeriods";
import { AdminBankStatements } from "./accounting/AdminBankStatements";
import { AdminMeters } from "./accounting/AdminMeters";
import { AdminTariffs } from "./accounting/AdminTariffs";
import { AdminResidentInvoices } from "./accounting/AdminResidentInvoices";
import { AdminAuditLog } from "./accounting/AdminAuditLog";

export function AdminAccounting() {
  const [activeTab, setActiveTab] = useState("assets");
  const [purchasesSubTab, setPurchasesSubTab] = useState("vendors");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-2">
          <TabsTrigger value="assets" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Turtas</span>
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Pirkimai</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Ataskaitos</span>
          </TabsTrigger>
          <TabsTrigger value="resident-invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Gyv. sąskaitos</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Kategorijos</span>
          </TabsTrigger>
          <TabsTrigger value="periods" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Periodai</span>
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <Landmark className="h-4 w-4" />
            <span className="hidden sm:inline">Bankas</span>
          </TabsTrigger>
          <TabsTrigger value="meters" className="gap-2">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Skaitikliai</span>
          </TabsTrigger>
          <TabsTrigger value="tariffs" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Tarifai</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Auditas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4"><AdminAssets /></TabsContent>
        
        <TabsContent value="purchases" className="mt-4">
          <Tabs value={purchasesSubTab} onValueChange={setPurchasesSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="vendors">Tiekėjai</TabsTrigger>
              <TabsTrigger value="invoices">Sąskaitos faktūros</TabsTrigger>
            </TabsList>
            <TabsContent value="vendors"><AdminVendors /></TabsContent>
            <TabsContent value="invoices"><AdminVendorInvoices /></TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="reports" className="mt-4"><AdminAccountingReports /></TabsContent>
        <TabsContent value="resident-invoices" className="mt-4"><AdminResidentInvoices /></TabsContent>
        <TabsContent value="categories" className="mt-4"><AdminCostCategories /></TabsContent>
        <TabsContent value="periods" className="mt-4"><AdminPeriods /></TabsContent>
        <TabsContent value="bank" className="mt-4"><AdminBankStatements /></TabsContent>
        <TabsContent value="meters" className="mt-4"><AdminMeters /></TabsContent>
        <TabsContent value="tariffs" className="mt-4"><AdminTariffs /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AdminAuditLog /></TabsContent>
      </Tabs>
    </div>
  );
}