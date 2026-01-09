import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function PendingApproval() {
  const { user, isApproved, signOut, checkApprovalStatus, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && isApproved) {
      navigate("/");
    }
  }, [user, isApproved, loading, navigate]);

  const handleCheckStatus = async () => {
    setChecking(true);
    const approved = await checkApprovalStatus();
    if (approved) {
      navigate("/");
    }
    setChecking(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Kraunama...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-md">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Laukiama patvirtinimo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Jūsų registracija sėkmingai pateikta. Administratorius turi patvirtinti jūsų paskyrą prieš galėsite naudotis portalu.
            </p>
            <p className="text-sm text-muted-foreground">
              Kai jūsų paskyra bus patvirtinta, galėsite prisijungti ir naudotis visomis portalo funkcijomis.
            </p>
            
            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={handleCheckStatus} 
                disabled={checking}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                Patikrinti būseną
              </Button>
              <Button 
                onClick={handleSignOut}
                variant="ghost"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Atsijungti
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
