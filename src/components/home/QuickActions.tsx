import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Vote, Newspaper, Receipt, ArrowRight, ScrollText, FileText, BarChart3, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    title: "Pranešti problemą",
    description: "Praneškite apie gedimus, pažeidimus ar kitas problemas name",
    icon: AlertTriangle,
    path: "/tickets",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
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
  },
  {
    title: "Dokumentai",
    description: "Peržiūrėkite bendrijos dokumentus ir aktus",
    icon: FileText,
    path: "/documents",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "Ataskaitos",
    description: "Peržiūrėkite finansines ir veiklos ataskaitas",
    icon: BarChart3,
    path: "/reports",
    color: "text-muted-foreground",
    bgColor: "bg-muted",
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
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path}>
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
  );
}
