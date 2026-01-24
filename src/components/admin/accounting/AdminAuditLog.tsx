import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, History, Plus, Pencil, Trash2, LogIn, LogOut, Eye } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  details: string | null;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: "Sukurta", icon: Plus, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  update: { label: "Atnaujinta", icon: Pencil, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  delete: { label: "Ištrinta", icon: Trash2, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  login: { label: "Prisijungė", icon: LogIn, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  logout: { label: "Atsijungė", icon: LogOut, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
  view: { label: "Peržiūrėjo", icon: Eye, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
};

const TABLE_NAMES: Record<string, string> = {
  profiles: "Profiliai",
  residents: "Gyventojai",
  assets: "Turtas",
  vendors: "Tiekėjai",
  vendor_invoices: "Tiekėjų sąskaitos",
  cost_categories: "Sąnaudų kategorijos",
  periods: "Periodai",
  bank_statements: "Banko išrašai",
  meters: "Skaitikliai",
  meter_readings: "Skaitiklių rodmenys",
  tariffs: "Tarifai",
  tickets: "Pranešimai",
  news: "Naujienos",
  polls: "Apklausos",
};

export function AdminAuditLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTable, setFilterTable] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.table_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = filterAction === "all" || log.action === filterAction;
    const matchesTable = filterTable === "all" || log.table_name === filterTable;
    return matchesSearch && matchesAction && matchesTable;
  });

  const uniqueTables = [...new Set(logs.map((l) => l.table_name).filter(Boolean))];
  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  const todayCount = logs.filter((l) => {
    const today = new Date();
    const logDate = new Date(l.created_at);
    return logDate.toDateString() === today.toDateString();
  }).length;

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || { label: action, icon: History, color: "bg-gray-100 text-gray-800" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viso įrašų</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Šiandien</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{todayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sukūrimai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {logs.filter((l) => l.action === "create").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atnaujinimai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {logs.filter((l) => l.action === "update").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Ieškoti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Veiksmas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Visi veiksmai</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {getActionConfig(action).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Lentelė" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Visos lentelės</SelectItem>
            {uniqueTables.map((table) => (
              <SelectItem key={table} value={table!}>
                {TABLE_NAMES[table!] || table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Laikas</TableHead>
                  <TableHead>Veiksmas</TableHead>
                  <TableHead>Lentelė</TableHead>
                  <TableHead>Detalės</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Audito įrašų nerasta
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const config = getActionConfig(log.action);
                    const IconComponent = config.icon;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.table_name ? (
                            <Badge variant="outline">{TABLE_NAMES[log.table_name] || log.table_name}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-md">
                          {log.details ? (
                            <span className="text-sm text-muted-foreground truncate block">{log.details}</span>
                          ) : log.new_values ? (
                            <span className="text-sm text-muted-foreground truncate block">
                              {JSON.stringify(log.new_values).slice(0, 100)}...
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {log.ip_address || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
