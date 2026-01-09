import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, FileText, Trash2, Edit, Upload, X, Check } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Report = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  published: boolean;
  created_at: string;
};

export function AdminReports() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    published: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; published: boolean; file?: File }) => {
      setIsUploading(true);
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;

      if (data.file) {
        const fileExt = data.file.name.split(".").pop();
        const filePath = `reports/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, data.file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);
        
        fileUrl = urlData.publicUrl;
        fileName = data.file.name;
        fileSize = data.file.size;
      }

      const { error } = await supabase.from("reports").insert({
        title: data.title,
        description: data.description || null,
        published: data.published,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        author_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Ataskaita sukurta" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title: string; description: string; published: boolean }) => {
      const { error } = await supabase
        .from("reports")
        .update({
          title: data.title,
          description: data.description || null,
          published: data.published,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Ataskaita atnaujinta" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Ataskaita ištrinta" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", published: true });
    setFile(null);
    setEditingReport(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, ...formData });
    } else {
      createMutation.mutate({ ...formData, file: file || undefined });
    }
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setFormData({
      title: report.title,
      description: report.description || "",
      published: report.published,
    });
    setIsDialogOpen(true);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Ataskaitos</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nauja ataskaita
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingReport ? "Redaguoti ataskaitą" : "Nauja ataskaita"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Pavadinimas</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Aprašymas</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              {!editingReport && (
                <div className="space-y-2">
                  <Label htmlFor="file">Failas</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
                <Label htmlFor="published">Paskelbta</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Atšaukti
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
                  {isUploading ? "Įkeliama..." : editingReport ? "Išsaugoti" : "Sukurti"}
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
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nėra ataskaitų</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{report.title}</h3>
                        <Badge variant={report.published ? "default" : "secondary"}>
                          {report.published ? "Paskelbta" : "Juodraštis"}
                        </Badge>
                      </div>
                      {report.description && (
                        <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(report.created_at), "yyyy-MM-dd")}</span>
                        {report.file_name && (
                          <span>{report.file_name} ({formatFileSize(report.file_size)})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(report)}
                      className="gap-1"
                    >
                      <Edit className="h-4 w-4" />
                      Redaguoti
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(report.id)}
                      disabled={deleteMutation.isPending}
                      className="gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
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
