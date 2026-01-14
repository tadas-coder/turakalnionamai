import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Vote, Newspaper, Receipt, ArrowRight, ScrollText, FileText, BarChart3, CalendarDays, Bot, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const actions = [
  {
    title: "Pranešti problemą",
    description: "Praneškite apie gedimus, pažeidimus ar kitas problemas name",
    icon: AlertTriangle,
    path: "/tickets",
    authRequired: true,
  },
  {
    title: "Balsavimas",
    description: "Dalyvaukite bendrijos sprendimuose ir apklausose",
    icon: Vote,
    path: "/voting",
  },
  {
    title: "Naujienos",
    description: "Skaitykite svarbiausias bendrijos naujienas ir pranešimus",
    icon: Newspaper,
    path: "/news",
  },
  {
    title: "Sąskaitos",
    description: "Peržiūrėkite ir apmokėkite komunalines sąskaitas",
    icon: Receipt,
    path: "/invoices",
  },
  {
    title: "Vidaus tvarkos taisyklės",
    description: "Susipažinkite su namo vidaus tvarkos taisyklėmis",
    icon: ScrollText,
    path: "/rules",
    showAiPrompt: true,
  },
  {
    title: "Dokumentai",
    description: "Peržiūrėkite bendrijos dokumentus ir aktus",
    icon: FileText,
    path: "/documents",
    showAiPrompt: true,
  },
  {
    title: "Ataskaitos",
    description: "Peržiūrėkite finansines ir veiklos ataskaitas",
    icon: BarChart3,
    path: "/reports",
    showAiPrompt: true,
  },
  {
    title: "Darbų kalendorius",
    description: "Planuojami ir vykdomi darbai name",
    icon: CalendarDays,
    path: "/schedules",
  },
];

export function QuickActions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const handleActionClick = (action: typeof actions[0], e: React.MouseEvent) => {
    // Check if auth is required and user is not logged in
    if (action.authRequired && !user) {
      e.preventDefault();
      toast.error("Prisijunkite, kad galėtumėte pranešti apie problemą");
      navigate("/auth");
      return;
    }

    // Check if should show AI prompt
    if (action.showAiPrompt) {
      e.preventDefault();
      setPendingPath(action.path);
      setAiDialogOpen(true);
      return;
    }
  };

  const handleAiHelp = () => {
    setAiDialogOpen(false);
    // Open the chat assistant by dispatching a custom event
    window.dispatchEvent(new CustomEvent("openChatAssistant"));
  };

  const handleContinue = () => {
    setAiDialogOpen(false);
    if (pendingPath) {
      navigate(pendingPath);
    }
  };

  return (
    <>
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Virtualus asistentas
            </DialogTitle>
            <DialogDescription className="text-base pt-4">
              Ar Jums galiu padėti surasti atsakymą į jūsų klausimą?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button onClick={handleAiHelp} className="flex-1 gap-2">
              <MessageCircle className="h-4 w-4" />
              Taip, padėkite
            </Button>
            <Button variant="outline" onClick={handleContinue} className="flex-1">
              Ne, tęsti
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3">
              Paslaugos
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Greitai pasiekite dažniausiai naudojamas funkcijas
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link 
                  key={action.path} 
                  to={action.path}
                  onClick={(e) => handleActionClick(action, e)}
                >
                  <Card 
                    className="card-elevated h-full cursor-pointer group border hover:border-foreground/20 bg-card"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 group-hover:bg-foreground group-hover:text-background transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base flex items-center justify-between font-medium">
                        {action.title}
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-muted-foreground" />
                      </CardTitle>
                      <CardDescription className="text-sm">{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
