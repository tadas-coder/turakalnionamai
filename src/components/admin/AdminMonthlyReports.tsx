import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, FileSpreadsheet, Trash2, Edit, Calendar, Eye, EyeOff } from "lucide-react";
import { format, parse } from "date-fns";
import { lt } from "date-fns/locale";

type MonthlyReport = {
  id: string;
  report_month: string;
  title: string;
  summary_data: {
    likutisPr: number;
    priskaitymai: number;
    isleista: number;
    likutisPab: number;
  } | null;
  main_categories: Array<{
    name: string;
    likutisPr: number;
    priskaitymai: number;
    isleista: number;
    likutisPab: number;
  }> | null;
  detailed_categories: Array<{
    name: string;
    priskaitymai: number;
    isleista: number;
    color: string;
  }> | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  published: boolean;
  created_at: string;
};

const MONTHS = [
  { value: "01", label: "Sausis" },
  { value: "02", label: "Vasaris" },
  { value: "03", label: "Kovas" },
  { value: "04", label: "Balandis" },
  { value: "05", label: "Gegužė" },
  { value: "06", label: "Birželis" },
  { value: "07", label: "Liepa" },
  { value: "08", label: "Rugpjūtis" },
  { value: "09", label: "Rugsėjis" },
  { value: "10", label: "Spalis" },
  { value: "11", label: "Lapkritis" },
  { value: "12", label: "Gruodis" },
];

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: year.toString(), label: year.toString() };
});

export function AdminMonthlyReports() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editingReport, setEditingReport] = useState<MonthlyReport | null>(null);
  const [summaryData, setSummaryData] = useState({
    likutisPr: "",
    priskaitymai: "",
    isleista: "",
    likutisPab: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["monthly-reports-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_financial_reports")
        .select("*")
        .order("report_month", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MonthlyReport[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      report_month: string;
      title: string;
      summary_data: Record<string, unknown> | null;
      file_url: string | null;
      file_name: string | null;
      file_size: number | null;
      published: boolean;
    }) => {
      const { error } = await supabase
        .from("monthly_financial_reports")
        .insert({
          report_month: data.report_month,
          title: data.title,
          summary_data: data.summary_data as unknown as undefined,
          file_url: data.file_url,
          file_name: data.file_name,
          file_size: data.file_size,
          published: data.published,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports-admin"] });
      toast({ title: "Ataskaita sukurta" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      title: string;
      summary_data: Record<string, unknown> | null;
      file_url: string | null;
      file_name: string | null;
      file_size: number | null;
      published: boolean;
    }) => {
      const { error } = await supabase
        .from("monthly_financial_reports")
        .update({
          title: data.title,
          summary_data: data.summary_data as unknown as undefined,
          file_url: data.file_url,
          file_name: data.file_name,
          file_size: data.file_size,
          published: data.published,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports-admin"] });
      toast({ title: "Ataskaita atnaujinta" });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("monthly_financial_reports")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports-admin"] });
      toast({ title: "Ataskaita ištrinta" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("monthly_financial_reports")
        .update({ published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports-admin"] });
      toast({ title: "Būsena pakeista" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setSelectedMonth("");
    setSelectedYear(new Date().getFullYear().toString());
    setTitle("");
    setFile(null);
    setEditingReport(null);
    setSummaryData({ likutisPr: "", priskaitymai: "", isleista: "", likutisPab: "" });
  };

  const handleEdit = (report: MonthlyReport) => {
    setEditingReport(report);
    const date = new Date(report.report_month);
    setSelectedMonth((date.getMonth() + 1).toString().padStart(2, "0"));
    setSelectedYear(date.getFullYear().toString());
    setTitle(report.title);
    if (report.summary_data) {
      setSummaryData({
        likutisPr: report.summary_data.likutisPr?.toString() || "",
        priskaitymai: report.summary_data.priskaitymai?.toString() || "",
        isleista: report.summary_data.isleista?.toString() || "",
        likutisPab: report.summary_data.likutisPab?.toString() || "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${selectedYear}-${selectedMonth}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("financial-reports")
        .upload(filePath, file);
      
      if (uploadError) {
        toast({ title: "Klaida įkeliant failą", description: uploadError.message, variant: "destructive" });
        return;
      }

      const { data: urlData } = supabase.storage
        .from("financial-reports")
        .getPublicUrl(filePath);
      
      fileUrl = urlData.publicUrl;
      fileName = file.name;
      fileSize = file.size;
    }

    const summary = {
      likutisPr: parseFloat(summaryData.likutisPr) || 0,
      priskaitymai: parseFloat(summaryData.priskaitymai) || 0,
      isleista: parseFloat(summaryData.isleista) || 0,
      likutisPab: parseFloat(summaryData.likutisPab) || 0,
    };

    if (editingReport) {
      updateMutation.mutate({
        id: editingReport.id,
        title,
        summary_data: summary,
        file_url: fileUrl || editingReport.file_url,
        file_name: fileName || editingReport.file_name,
        file_size: fileSize || editingReport.file_size,
        published: editingReport.published,
      });
    } else {
      const reportMonth = `${selectedYear}-${selectedMonth}-01`;
      createMutation.mutate({
        report_month: reportMonth,
        title,
        summary_data: summary,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        published: false,
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("lt-LT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getMonthName = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, "yyyy LLLL", { locale: lt });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mėnesio finansinės ataskaitos</h2>
          <p className="text-sm text-muted-foreground">Valdykite mėnesines ataskaitas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nauja ataskaita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReport ? "Redaguoti ataskaitą" : "Nauja mėnesio ataskaita"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mėnuo</Label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                    disabled={!!editingReport}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite mėnesį" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Metai</Label>
                  <Select
                    value={selectedYear}
                    onValueChange={setSelectedYear}
                    disabled={!!editingReport}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite metus" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Pavadinimas</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Pvz.: Sausio mėnesio finansinė ataskaita"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Finansinė suvestinė</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Likutis pradžioje (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={summaryData.likutisPr}
                      onChange={(e) => setSummaryData({ ...summaryData, likutisPr: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Priskaitymai (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={summaryData.priskaitymai}
                      onChange={(e) => setSummaryData({ ...summaryData, priskaitymai: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Išleista (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={summaryData.isleista}
                      onChange={(e) => setSummaryData({ ...summaryData, isleista: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Likutis pabaigoje (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={summaryData.likutisPab}
                      onChange={(e) => setSummaryData({ ...summaryData, likutisPab: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Excel/PDF failas (neprivaloma)</Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                {editingReport?.file_name && !file && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dabartinis failas: {editingReport.file_name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Atšaukti
                </Button>
                <Button type="submit" disabled={!selectedMonth || !title}>
                  {editingReport ? "Atnaujinti" : "Sukurti"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Kol kas nėra mėnesio ataskaitų</p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Pridėti pirmą ataskaitą
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{report.title}</h3>
                        <Badge variant={report.published ? "default" : "secondary"}>
                          {report.published ? "Paskelbta" : "Juodraštis"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {getMonthName(report.report_month)}
                      </p>
                      {report.summary_data && (
                        <div className="flex flex-wrap gap-3 mt-2 text-xs">
                          <span className="text-muted-foreground">
                            Likutis pr.: <span className="font-medium text-foreground">{formatCurrency(report.summary_data.likutisPr)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Išleista: <span className="font-medium text-destructive">{formatCurrency(report.summary_data.isleista)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Likutis pab.: <span className="font-medium text-foreground">{formatCurrency(report.summary_data.likutisPab)}</span>
                          </span>
                        </div>
                      )}
                      {report.file_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📎 {report.file_name} ({formatFileSize(report.file_size)})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePublishMutation.mutate({ id: report.id, published: !report.published })}
                    >
                      {report.published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(report)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Ar tikrai norite ištrinti šią ataskaitą?")) {
                          deleteMutation.mutate(report.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}