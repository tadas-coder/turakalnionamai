import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Building2, Receipt, FolderTree, BarChart3 } from "lucide-react";
import { AdminAssets } from "./accounting/AdminAssets";
import { AdminVendors } from "./accounting/AdminVendors";
import { AdminVendorInvoices } from "./accounting/AdminVendorInvoices";
import { AdminCostCategories } from "./accounting/AdminCostCategories";
import { AdminAccountingReports } from "./accounting/AdminAccountingReports";

export function AdminAccounting() {
  const [activeTab, setActiveTab] = useState("assets");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="assets" className="gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Turtas</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tiekėjai</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Sąskaitos</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Kategorijos</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Ataskaitos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="mt-4">
          <AdminAssets />
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <AdminVendors />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <AdminVendorInvoices />
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <AdminCostCategories />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <AdminAccountingReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
