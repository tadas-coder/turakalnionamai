import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, Home, UserPlus, Trash2, Save, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  apartment_number: string | null;
  phone: string | null;
};

type LinkedAccount = {
  id: string;
  primary_user_id: string;
  linked_email: string;
  linked_name: string | null;
  relationship: string | null;
  created_at: string;
};

export default function Profile() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [apartmentNumber, setApartmentNumber] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newLinkedEmail, setNewLinkedEmail] = useState("");
  const [newLinkedName, setNewLinkedName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const { data: linkedAccounts = [], isLoading: linkedLoading } = useQuery({
    queryKey: ["linked_accounts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("linked_accounts")
        .select("*")
        .eq("primary_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LinkedAccount[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setApartmentNumber(profile.apartment_number || "");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Neprisijungęs");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          apartment_number: apartmentNumber || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Profilis atnaujintas sėkmingai" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const addLinkedAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !newLinkedEmail) throw new Error("Užpildykite el. paštą");
      const { error } = await supabase.from("linked_accounts").insert({
        primary_user_id: user.id,
        linked_email: newLinkedEmail,
        linked_name: newLinkedName || null,
        relationship: newRelationship || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linked_accounts", user?.id] });
      toast({ title: "Vartotojas pridėtas" });
      setNewLinkedEmail("");
      setNewLinkedName("");
      setNewRelationship("");
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  const deleteLinkedAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("linked_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linked_accounts", user?.id] });
      toast({ title: "Vartotojas pašalintas" });
    },
    onError: (error: Error) => {
      toast({ title: "Klaida", description: error.message, variant: "destructive" });
    },
  });

  if (loading || profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Kraunama...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mano profilis</h1>
          <p className="text-muted-foreground mt-1">
            Tvarkyti kontaktinę informaciją ir susijusius vartotojus
          </p>
        </div>

        {/* Profile Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Kontaktinė informacija
            </CardTitle>
            <CardDescription>
              Atnaujinkite savo kontaktinius duomenis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                El. paštas
              </Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="mt-1.5 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                El. pašto adresas negali būti pakeistas
              </p>
            </div>

            <div>
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Vardas ir pavardė
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Įveskite vardą ir pavardę"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefono numeris
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+370 600 00000"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="apartment" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Buto numeris
              </Label>
              <Input
                id="apartment"
                value={apartmentNumber}
                onChange={(e) => setApartmentNumber(e.target.value)}
                placeholder="pvz. 15"
                className="mt-1.5"
              />
            </div>

            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {updateProfileMutation.isPending ? "Saugoma..." : "Išsaugoti pakeitimus"}
            </Button>
          </CardContent>
        </Card>

        {/* Linked Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Susiję vartotojai
                </CardTitle>
                <CardDescription>
                  Pridėkite šeimos narius ar kitus su paskyra susijusius asmenis
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Pridėti
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pridėti susijusį vartotoją</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="linkedEmail">El. paštas *</Label>
                      <Input
                        id="linkedEmail"
                        type="email"
                        value={newLinkedEmail}
                        onChange={(e) => setNewLinkedEmail(e.target.value)}
                        placeholder="asmuo@paštas.lt"
                      />
                    </div>
                    <div>
                      <Label htmlFor="linkedName">Vardas</Label>
                      <Input
                        id="linkedName"
                        value={newLinkedName}
                        onChange={(e) => setNewLinkedName(e.target.value)}
                        placeholder="Vardas Pavardė"
                      />
                    </div>
                    <div>
                      <Label htmlFor="relationship">Ryšys</Label>
                      <Input
                        id="relationship"
                        value={newRelationship}
                        onChange={(e) => setNewRelationship(e.target.value)}
                        placeholder="pvz. Šeimos narys, Nuomininkas"
                      />
                    </div>
                    <Button
                      onClick={() => addLinkedAccountMutation.mutate()}
                      disabled={addLinkedAccountMutation.isPending || !newLinkedEmail}
                      className="w-full"
                    >
                      {addLinkedAccountMutation.isPending ? "Pridedama..." : "Pridėti vartotoją"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {linkedLoading ? (
              <p className="text-muted-foreground text-center py-4">Kraunama...</p>
            ) : linkedAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nėra pridėtų susijusių vartotojų</p>
              </div>
            ) : (
              <div className="space-y-3">
                {linkedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {account.linked_name || account.linked_email}
                      </p>
                      {account.linked_name && (
                        <p className="text-sm text-muted-foreground">{account.linked_email}</p>
                      )}
                      {account.relationship && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {account.relationship}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Ar tikrai norite pašalinti šį vartotoją?")) {
                          deleteLinkedAccountMutation.mutate(account.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
