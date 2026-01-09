import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Download, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";

type Report = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
};

export default function Reports() {
  const { user, isApproved, isAdmin } = useAuth();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
    enabled: !!user && (isApproved || isAdmin),
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!user || (!isApproved && !isAdmin)) {
    return (
      <Layout>
        <div className="py-12 bg-muted min-h-screen">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Turite būti prisijungęs ir patvirtintas, kad galėtumėte peržiūrėti ataskaitas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-display text-foreground mb-2">
              Ataskaitos
            </h1>
            <p className="text-muted-foreground">
              Administratoriaus pateiktos ataskaitos ir dokumentai
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Kol kas nėra ataskaitų</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{report.title}</h3>
                          {report.description && (
                            <p className="text-muted-foreground mt-1">{report.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(report.created_at), "yyyy-MM-dd", { locale: lt })}
                            </span>
                            {report.file_size && (
                              <Badge variant="secondary">{formatFileSize(report.file_size)}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {report.file_url && (
                        <Button asChild variant="outline" className="gap-2">
                          <a href={report.file_url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="h-4 w-4" />
                            Atsisiųsti
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
