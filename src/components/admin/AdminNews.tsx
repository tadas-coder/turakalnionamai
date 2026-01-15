import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, Eye, EyeOff, Send, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RecipientSelector } from "./RecipientSelector";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  published: boolean;
  created_at: string;
  recipient_count?: number;
}

export function AdminNews() {
  const { user } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedNewsForSend, setSelectedNewsForSend] = useState<NewsItem | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    published: false,
  });

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const [newsRes, recipientsRes] = await Promise.all([
        supabase.from("news").select("*").order("created_at", { ascending: false }),
        supabase.from("news_recipients").select("news_id, resident_id"),
      ]);

      if (newsRes.error) throw newsRes.error;
      if (recipientsRes.error) throw recipientsRes.error;

      // Count recipients per news
      const recipientCounts: { [newsId: string]: number } = {};
      (recipientsRes.data || []).forEach(r => {
        recipientCounts[r.news_id] = (recipientCounts[r.news_id] || 0) + 1;
      });

      const newsWithCounts = (newsRes.data || []).map(item => ({
        ...item,
        recipient_count: recipientCounts[item.id] || 0,
      }));

      setNews(newsWithCounts);
    } catch (error) {
      console.error("Error fetching news:", error);
      toast.error("Nepavyko užkrauti naujienų");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingNews(null);
    setFormData({ title: "", content: "", published: false });
    setDialogOpen(true);
  };

  const openEditDialog = (item: NewsItem) => {
    setEditingNews(item);
    setFormData({
      title: item.title,
      content: item.content,
      published: item.published,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingNews) {
        const { error } = await supabase
          .from("news")
          .update({
            title: formData.title,
            content: formData.content,
            published: formData.published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingNews.id);

        if (error) throw error;
        toast.success("Naujiena atnaujinta");
      } else {
        const { error } = await supabase
          .from("news")
          .insert({
            title: formData.title,
            content: formData.content,
            published: formData.published,
            author_id: user?.id,
          });

        if (error) throw error;
        toast.success("Naujiena sukurta");
      }

      setDialogOpen(false);
      fetchNews();
    } catch (error) {
      console.error("Error saving news:", error);
      toast.error("Nepavyko išsaugoti naujienos");
    }
  };

  const deleteNews = async (id: string) => {
    try {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNews(news.filter(n => n.id !== id));
      toast.success("Naujiena ištrinta");
    } catch (error) {
      console.error("Error deleting news:", error);
      toast.error("Nepavyko ištrinti naujienos");
    }
  };

  const togglePublished = async (item: NewsItem) => {
    try {
      const { error } = await supabase
        .from("news")
        .update({ published: !item.published })
        .eq("id", item.id);

      if (error) throw error;
      setNews(news.map(n => 
        n.id === item.id ? { ...n, published: !n.published } : n
      ));
      toast.success(item.published ? "Naujiena paslėpta" : "Naujiena paskelbta");
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Nepavyko pakeisti būsenos");
    }
  };

  const openSendDialog = (item: NewsItem) => {
    setSelectedNewsForSend(item);
    setSelectedRecipients([]);
    setSendDialogOpen(true);
  };

  const handleSendNotification = async () => {
    if (!selectedNewsForSend || selectedRecipients.length === 0) {
      toast.error("Pasirinkite bent vieną gavėją");
      return;
    }

    setSendingNotification(true);
    try {
      // Insert recipients
      const recipientInserts = selectedRecipients.map(residentId => ({
        news_id: selectedNewsForSend.id,
        resident_id: residentId,
      }));

      const { error: recipientError } = await supabase
        .from("news_recipients")
        .upsert(recipientInserts, { onConflict: 'news_id,resident_id' });

      if (recipientError) throw recipientError;

      // Get residents with emails for notification
      const { data: residents, error: residentsError } = await supabase
        .from("residents")
        .select("id, full_name, email")
        .in("id", selectedRecipients)
        .not("email", "is", null);

      if (residentsError) throw residentsError;

      // Send email notifications via edge function
      const residentsWithEmail = residents?.filter(r => r.email) || [];
      
      if (residentsWithEmail.length > 0) {
        const { error: notifyError } = await supabase.functions.invoke("send-news-notification", {
          body: {
            newsId: selectedNewsForSend.id,
            newsTitle: selectedNewsForSend.title,
            newsContent: selectedNewsForSend.content,
            recipients: residentsWithEmail.map(r => ({
              name: r.full_name,
              email: r.email,
            })),
          },
        });

        if (notifyError) {
          console.error("Error sending notifications:", notifyError);
          // Don't throw - recipients are saved even if email fails
          toast.warning(`Gavėjai išsaugoti, bet el. laiškų siuntimas nepavyko: ${notifyError.message}`);
        } else {
          toast.success(`Pranešimas išsiųstas ${residentsWithEmail.length} gavėjams`);
        }
      } else {
        toast.success(`${selectedRecipients.length} gavėjų pridėta (el. paštų nėra)`);
      }

      // Update notified_at timestamp
      await supabase
        .from("news_recipients")
        .update({ notified_at: new Date().toISOString() })
        .eq("news_id", selectedNewsForSend.id)
        .in("resident_id", selectedRecipients);

      setSendDialogOpen(false);
      fetchNews();
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Nepavyko išsiųsti pranešimo");
    } finally {
      setSendingNotification(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-48 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-16 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Nauja naujiena
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingNews ? "Redaguoti naujieną" : "Nauja naujiena"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Pavadinimas</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Turinys</Label>
                <Textarea
                  id="content"
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="published">Paskelbti iš karto</Label>
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Atšaukti
                </Button>
                <Button type="submit">
                  {editingNews ? "Išsaugoti" : "Sukurti"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {news.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="py-12 text-center">
            <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Naujienų nėra</h3>
            <p className="text-muted-foreground mb-4">
              Sukurkite pirmą naujieną gyventojams
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Sukurti naujieną
            </Button>
          </CardContent>
        </Card>
      ) : (
        news.map((item) => (
          <Card key={item.id} className="card-elevated">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString("lt-LT")}
                  </CardDescription>
                </div>
                <Badge variant={item.published ? "default" : "secondary"}>
                  {item.published ? (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Paskelbta
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Juodraštis
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/80 line-clamp-3">{item.content}</p>
              
              {item.recipient_count !== undefined && item.recipient_count > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Išsiųsta {item.recipient_count} gavėjams</span>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => openSendDialog(item)}
                >
                  <Send className="h-4 w-4" />
                  Siųsti pranešimą
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => togglePublished(item)}
                >
                  {item.published ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Paslėpti
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Paskelbti
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(item)}
                >
                  <Pencil className="h-4 w-4" />
                  Redaguoti
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Ištrinti
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Ištrinti naujieną?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ši naujiena bus ištrinta negrįžtamai.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Atšaukti</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteNews(item.id)}>
                        Ištrinti
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Send Notification Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Siųsti pranešimą</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedNewsForSend && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedNewsForSend.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {selectedNewsForSend.content}
                </p>
              </div>
            )}
            
            <RecipientSelector
              selectedResidentIds={selectedRecipients}
              onSelectionChange={setSelectedRecipients}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSendDialogOpen(false)}
              disabled={sendingNotification}
            >
              Atšaukti
            </Button>
            <Button
              type="button"
              onClick={handleSendNotification}
              disabled={sendingNotification || selectedRecipients.length === 0}
            >
              {sendingNotification ? (
                "Siunčiama..."
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Siųsti ({selectedRecipients.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
