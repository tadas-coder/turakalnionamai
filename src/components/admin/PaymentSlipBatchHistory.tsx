import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2, FileText, Calendar, Hash, Loader2, History } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";

interface UploadBatch {
  id: string;
  created_at: string;
  file_name: string | null;
  file_type: string | null;
  slip_count: number;
  period_month: string | null;
  status: string;
}

export default function PaymentSlipBatchHistory() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<UploadBatch | null>(null);
  const queryClient = useQueryClient();

  // Fetch upload batches
  const { data: batches, isLoading } = useQuery({
    queryKey: ["upload-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("upload_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as UploadBatch[];
    }
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await supabase.functions.invoke("parse-payment-slips", {
        body: {
          action: 'delete_batch',
          batchId
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payment-slips"] });
      toast.success("Įkėlimas ir visi susiję lapeliai ištrinti");
      setDeleteDialogOpen(false);
      setBatchToDelete(null);
    },
    onError: (error: any) => {
      toast.error("Klaida trinant: " + error.message);
    }
  });

  const handleDeleteClick = (batch: UploadBatch) => {
    setBatchToDelete(batch);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (batchToDelete) {
      deleteBatchMutation.mutate(batchToDelete.id);
    }
  };

  const getFileTypeIcon = (fileType: string | null) => {
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Įkėlimų istorija
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Įkėlimų istorija
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nėra įkėlimų istorijos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Įkėlimų istorija
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Failas</TableHead>
                <TableHead>Periodas</TableHead>
                <TableHead className="text-center">Lapelių</TableHead>
                <TableHead className="text-right">Veiksmai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch, index) => (
                <TableRow key={batch.id}>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(batch.created_at), "yyyy-MM-dd HH:mm", { locale: lt })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileTypeIcon(batch.file_type)}
                      <span className="text-sm truncate max-w-[200px]" title={batch.file_name || undefined}>
                        {batch.file_name || "Nežinomas failas"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {batch.period_month ? (
                      <Badge variant="outline">
                        {format(new Date(batch.period_month), "yyyy MMMM", { locale: lt })}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Hash className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{batch.slip_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {index === 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteClick(batch)}
                        disabled={deleteBatchMutation.isPending}
                      >
                        {deleteBatchMutation.isPending && batchToDelete?.id === batch.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Tik paskutinis
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti įkėlimą?</AlertDialogTitle>
            <AlertDialogDescription>
              Šis veiksmas ištrins <strong>{batchToDelete?.slip_count}</strong> mokėjimo lapelių,
              kurie buvo įkelti {batchToDelete?.created_at && format(new Date(batchToDelete.created_at), "yyyy-MM-dd HH:mm", { locale: lt })}.
              <br /><br />
              <strong>Failas:</strong> {batchToDelete?.file_name || "Nežinomas"}
              <br /><br />
              Šio veiksmo atšaukti negalėsite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBatchMutation.isPending}>
              Atšaukti
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteBatchMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBatchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Trinama...
                </>
              ) : (
                "Ištrinti"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
