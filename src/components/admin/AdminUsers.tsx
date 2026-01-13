import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Search, Users, Clock, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  apartment_number: string | null;
  phone: string | null;
  approved: boolean;
  created_at: string;
};

export function AdminUsers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approved, userEmail, userName }: { userId: string; approved: boolean; userEmail: string; userName: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          approved,
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: approved ? user?.id : null,
        })
        .eq("id", userId);
      if (error) throw error;

      if (approved) {
        const { data, error: notifyError } = await supabase.functions.invoke(
          "send-approval-notification",
          {
            body: {
              userName: userName || "Vartotojau",
              userEmail: userEmail,
            },
          }
        );

        if (notifyError) {
          console.error("Failed to send approval notification:", notifyError);
          toast({
            title: "Laiško išsiųsti nepavyko",
            description:
              "Patikrinkite el. pašto siuntimo nustatymus (domeno patvirtinimą) ir bandykite dar kartą.",
            variant: "destructive",
          });
        } else {
          console.log("Approval notification sent to:", userEmail, data);
        }
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ 
        title: approved ? "Vartotojas patvirtintas" : "Patvirtinimas atšauktas",
        description: approved ? "Pranešimas išsiųstas vartotojui" : undefined,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  const filterUsers = (userList: UserProfile[]) => {
    if (!searchQuery) return userList;
    const query = searchQuery.toLowerCase();
    return userList.filter(
      u => 
        u.email.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query) ||
        u.apartment_number?.toLowerCase().includes(query)
    );
  };

  const UserCard = ({ profile }: { profile: UserProfile }) => (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{profile.full_name || "Nenurodyta"}</h3>
              {profile.approved ? (
                <Badge variant="default" className="bg-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Patvirtintas
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Laukia patvirtinimo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {profile.apartment_number && <span>Butas: {profile.apartment_number}</span>}
              {profile.phone && <span>Tel: {profile.phone}</span>}
              <span>Registracija: {new Date(profile.created_at).toLocaleDateString("lt-LT")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {profile.approved ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => approveMutation.mutate({ userId: profile.id, approved: false, userEmail: profile.email, userName: profile.full_name })}
                disabled={approveMutation.isPending}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Atšaukti
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => approveMutation.mutate({ userId: profile.id, approved: true, userEmail: profile.email, userName: profile.full_name })}
                disabled={approveMutation.isPending}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Patvirtinti
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Ieškoti pagal vardą, el. paštą..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Laukia patvirtinimo
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingUsers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Patvirtinti ({approvedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Kraunama...</p>
          ) : filterUsers(pendingUsers).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nėra laukiančių patvirtinimo vartotojų</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filterUsers(pendingUsers).map((profile) => (
                <UserCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Kraunama...</p>
          ) : filterUsers(approvedUsers).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nėra patvirtintų vartotojų</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filterUsers(approvedUsers).map((profile) => (
                <UserCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
