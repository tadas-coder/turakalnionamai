import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, Calendar, User, Pin, Check, Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadNews } from "@/hooks/useUnreadNews";
import { cn } from "@/lib/utils";

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Svarbu":
      return "bg-destructive text-destructive-foreground";
    case "Susirinkimas":
      return "bg-secondary text-secondary-foreground";
    default:
      return "bg-primary text-primary-foreground";
  }
};

export default function News() {
  const { user, isApproved } = useAuth();
  const { isRead, markAsRead, markAsUnread, isMarkingRead, isMarkingUnread } = useUnreadNews();

  const { data: newsItems = [], isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isApproved,
  });

  const handleToggleRead = (newsId: string, currentlyRead: boolean) => {
    if (currentlyRead) {
      markAsUnread(newsId);
    } else {
      markAsRead(newsId);
    }
  };

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-info/10 text-info px-4 py-2 rounded-full mb-4">
                <Newspaper className="h-4 w-4" />
                <span className="text-sm font-medium">Naujienos</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Bendrijos naujienos
              </h1>
              <p className="text-muted-foreground">
                Svarbiausi pranešimai ir naujienos gyventojams
              </p>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Kraunama...</div>
            ) : newsItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Naujienų nėra</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {newsItems.map((news, index) => {
                  const read = isRead(news.id);
                  return (
                    <Card
                      key={news.id}
                      className={cn(
                        "card-elevated animate-slide-up transition-all duration-300",
                        read 
                          ? "opacity-60 bg-muted/50 border-muted" 
                          : "border-primary/30 bg-card shadow-md"
                      )}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          {!read && (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Newspaper className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={getCategoryColor("Informacija")}>
                                Naujiena
                              </Badge>
                              {!read && (
                                <Badge variant="destructive" className="animate-pulse">
                                  Nauja
                                </Badge>
                              )}
                              {read && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  <Check className="h-3 w-3 mr-1" />
                                  Perskaityta
                                </Badge>
                              )}
                            </div>
                            <CardTitle className={cn("text-xl", read && "text-muted-foreground")}>
                              {news.title}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {news.content.length > 150 
                                ? `${news.content.substring(0, 150)}...` 
                                : news.content}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className={cn(
                          "leading-relaxed",
                          read ? "text-muted-foreground" : "text-foreground/80"
                        )}>
                          {news.content}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-border">
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(news.created_at).toLocaleDateString("lt-LT", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant={read ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleToggleRead(news.id, read)}
                            disabled={isMarkingRead || isMarkingUnread}
                            className="gap-2"
                          >
                            {read ? (
                              <>
                                <EyeOff className="h-4 w-4" />
                                Pažymėti kaip neperskaitytą
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4" />
                                Pažymėti kaip perskaitytą
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
