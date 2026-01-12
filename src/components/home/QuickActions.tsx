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
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    authRequired: true,
  },
  {
    title: "Balsavimas",
    description: "Dalyvaukite bendrijos sprendimuose ir apklausose",
    icon: Vote,
    path: "/voting",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    title: "Naujienos",
    description: "Skaitykite svarbiausias bendrijos naujienas ir pranešimus",
    icon: Newspaper,
    path: "/news",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "Sąskaitos",
    description: "Peržiūrėkite ir apmokėkite komunalines sąskaitas",
    icon: Receipt,
    path: "/invoices",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Vidaus tvarkos taisyklės",
    description: "Susipažinkite su namo vidaus tvarkos taisyklėmis",
    icon: ScrollText,
    path: "/rules",
    color: "text-primary",
    bgColor: "bg-primary/10",
    showAiPrompt: true,
  },
  {
    title: "Dokumentai",
    description: "Peržiūrėkite bendrijos dokumentus ir aktus",
    icon: FileText,
    path: "/documents",
    color: "text-accent",
    bgColor: "bg-accent/10",
    showAiPrompt: true,
  },
  {
    title: "Ataskaitos",
    description: "Peržiūrėkite finansines ir veiklos ataskaitas",
    icon: BarChart3,
    path: "/reports",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    showAiPrompt: true,
  },
  {
    title: "Darbų kalendorius",
    description: "Planuojami ir vykdomi darbai name",
    icon: CalendarDays,
    path: "/schedules",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
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

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link 
                  key={action.path} 
                  to={action.path}
                  onClick={(e) => handleActionClick(action, e)}
                >
                  <Card 
                    className="card-elevated h-full cursor-pointer group border-border hover:border-primary/30"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-xl ${action.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 ${action.color}`} />
                      </div>
                      <CardTitle className="text-lg flex items-center justify-between">
                        {action.title}
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </CardTitle>
                      <CardDescription>{action.description}</CardDescription>
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
