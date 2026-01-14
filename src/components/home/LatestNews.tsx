import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function LatestNews() {
  const { data: news, isLoading } = useQuery({
    queryKey: ["latest-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
              Naujienos
            </h2>
            <p className="text-muted-foreground text-sm">
              Sužinokite apie naujausius įvykius ir pranešimus
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-elevated">
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!news || news.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Newspaper className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground mb-3">
            Naujienos
          </h2>
          <p className="text-muted-foreground text-sm">
            Sužinokite apie naujausius įvykius ir pranešimus
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {news.map((item) => (
            <Card key={item.id} className="card-elevated group hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(item.created_at!), "yyyy MMMM d", { locale: lt })}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <Link to="/news" className="inline-flex items-center gap-2">
              Visos naujienos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
