import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, ImagePlus, FileUp, X, Loader2, History, Calendar, Users, Trash2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RecipientSelector } from "@/components/admin/RecipientSelector";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SentMessage {
  id: string;
  title: string;
  content: string;
  created_at: string;
  recipient_count: number;
}

const CATEGORIES = [
  { value: "plumbing", label: "Vandentiekis / Kanalizacija" },
  { value: "electrical", label: "Elektra" },
  { value: "heating", label: "Šildymas" },
  { value: "elevator", label: "Liftas" },
  { value: "common_areas", label: "Bendros patalpos" },
  { value: "exterior", label: "Išorė / Kiemas" },
  { value: "other", label: "Kita" },
];

export default function Tickets() {
  const { user, isAdmin, isApproved, loading } = useAuth();
  const navigate = useNavigate();
  
  // Admin state for full messaging
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  
  // Regular user state for problem reporting
  const [problemForm, setProblemForm] = useState({
    title: "",
    description: "",
    category: "other",
    location: "",
  });
  const [submittingProblem, setSubmittingProblem] = useState(false);
  const [problemPhotos, setProblemPhotos] = useState<File[]>([]);
  
  // History state
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  
  // User's reported problems
  const [myProblems, setMyProblems] = useState<any[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      toast.error("Prisijunkite, kad galėtumėte siųsti pranešimus");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchSentMessages();
    }
    if (user && isApproved) {
      fetchMyProblems();
    }
  }, [user, isAdmin, isApproved]);

  const fetchSentMessages = async () => {
    try {
      const [newsRes, recipientsRes] = await Promise.all([
        supabase.from("news").select("*").eq("author_id", user?.id).order("created_at", { ascending: false }),
        supabase.from("news_recipients").select("news_id, resident_id"),
      ]);

      if (newsRes.error) throw newsRes.error;
      if (recipientsRes.error) throw recipientsRes.error;

      // Count recipients per news
      const recipientCounts: { [newsId: string]: number } = {};
      (recipientsRes.data || []).forEach(r => {
        recipientCounts[r.news_id] = (recipientCounts[r.news_id] || 0) + 1;
      });

      const messagesWithCounts = (newsRes.data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        created_at: item.created_at,
        recipient_count: recipientCounts[item.id] || 0,
      }));

      setSentMessages(messagesWithCounts);
    } catch (error) {
      console.error("Error fetching sent messages:", error);
      toast.error("Nepavyko užkrauti pranešimų istorijos");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchMyProblems = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyProblems(data || []);
    } catch (error) {
      console.error("Error fetching problems:", error);
    } finally {
      setLoadingProblems(false);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
      setSentMessages(prev => prev.filter(m => m.id !== id));
      toast.success("Pranešimas ištrintas");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Nepavyko ištrinti pranešimo");
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).filter(file => 
        file.type.startsWith("image/")
      );
      setPhotos(prev => [...prev, ...newPhotos]);
    }
    e.target.value = "";
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setDocuments(prev => [...prev, ...Array.from(files)]);
    }
    e.target.value = "";
  };

  const handleProblemPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).filter(file => 
        file.type.startsWith("image/")
      );
      setProblemPhotos(prev => [...prev, ...newPhotos]);
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const removeProblemPhoto = (index: number) => {
    setProblemPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[], bucket: string, folder: string): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of files) {
      const fileName = `${folder}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);
      
      if (error) {
        console.error("Upload error:", error);
        throw error;
      }
      
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      urls.push(urlData.publicUrl);
    }
    
    return urls;
  };

  // Admin: Send message to selected recipients
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim()) {
      toast.error("Įveskite temą");
      return;
    }
    
    if (!formData.message.trim()) {
      toast.error("Įveskite pranešimą");
      return;
    }
    
    if (selectedRecipients.length === 0) {
      toast.error("Pasirinkite bent vieną gavėją");
      return;
    }

    setSendingNotification(true);
    try {
      // Upload photos and documents
      let photoUrls: string[] = [];
      let documentUrls: string[] = [];
      
      if (photos.length > 0) {
        setUploadingPhotos(true);
        photoUrls = await uploadFiles(photos, "documents", "message-photos");
        setUploadingPhotos(false);
      }
      
      if (documents.length > 0) {
        setUploadingDocs(true);
        documentUrls = await uploadFiles(documents, "documents", "message-documents");
        setUploadingDocs(false);
      }

      // Create news entry
      const { data: newsData, error: newsError } = await supabase
        .from("news")
        .insert({
          title: formData.subject,
          content: formData.message,
          published: true,
          author_id: user?.id,
        })
        .select()
        .single();

      if (newsError) throw newsError;

      // Insert recipients
      const recipientInserts = selectedRecipients.map(residentId => ({
        news_id: newsData.id,
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
        // Build message content with attachments info
        let fullContent = formData.message;
        
        if (photoUrls.length > 0) {
          fullContent += "\n\n📷 Nuotraukos:\n" + photoUrls.join("\n");
        }
        
        if (documentUrls.length > 0) {
          fullContent += "\n\n📎 Dokumentai:\n" + documentUrls.join("\n");
        }

        const { error: notifyError } = await supabase.functions.invoke("send-news-notification", {
          body: {
            newsId: newsData.id,
            newsTitle: formData.subject,
            newsContent: fullContent,
            recipients: residentsWithEmail.map(r => ({
              name: r.full_name,
              email: r.email,
            })),
          },
        });

        if (notifyError) {
          console.error("Error sending notifications:", notifyError);
          toast.warning(`Pranešimas išsaugotas, bet el. laiškų siuntimas nepavyko: ${notifyError.message}`);
        } else {
          toast.success(`Pranešimas išsiųstas ${residentsWithEmail.length} gavėjams`);
        }
      } else {
        toast.success(`Pranešimas išsaugotas ${selectedRecipients.length} gavėjams (el. paštų nėra)`);
      }

      // Update notified_at timestamp
      await supabase
        .from("news_recipients")
        .update({ notified_at: new Date().toISOString() })
        .eq("news_id", newsData.id)
        .in("resident_id", selectedRecipients);

      // Reset form
      setFormData({ subject: "", message: "" });
      setSelectedRecipients([]);
      setPhotos([]);
      setDocuments([]);
      
      // Refresh history
      fetchSentMessages();
      
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Nepavyko išsiųsti pranešimo");
    } finally {
      setSendingNotification(false);
    }
  };

  // Regular user: Submit problem report to admin
  const handleSubmitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!problemForm.title.trim()) {
      toast.error("Įveskite problemos pavadinimą");
      return;
    }
    
    if (!problemForm.description.trim()) {
      toast.error("Aprašykite problemą");
      return;
    }

    setSubmittingProblem(true);
    try {
      // Upload photos if any
      let photoUrls: string[] = [];
      if (problemPhotos.length > 0) {
        photoUrls = await uploadFiles(problemPhotos, "documents", "ticket-photos");
      }

      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title: problemForm.title,
          description: problemForm.description,
          category: problemForm.category,
          location: problemForm.location || null,
          user_id: user?.id,
          status: "new",
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload photos to ticket_photos table
      if (photoUrls.length > 0) {
        const photoInserts = photoUrls.map(url => ({
          ticket_id: ticketData.id,
          photo_url: url,
        }));
        
        await supabase.from("ticket_photos").insert(photoInserts);
      }

      // Send notification to admin
      try {
        await supabase.functions.invoke("send-ticket-notification", {
          body: {
            ticketId: ticketData.id,
            ticketTitle: problemForm.title,
            ticketDescription: problemForm.description,
            ticketCategory: problemForm.category,
            ticketLocation: problemForm.location,
          },
        });
      } catch (notifyError) {
        console.error("Notification error:", notifyError);
        // Don't fail the whole operation if notification fails
      }

      toast.success("Problema sėkmingai užregistruota");
      
      // Reset form
      setProblemForm({
        title: "",
        description: "",
        category: "other",
        location: "",
      });
      setProblemPhotos([]);
      
      // Refresh problems list
      fetchMyProblems();
      
    } catch (error) {
      console.error("Error submitting problem:", error);
      toast.error("Nepavyko užregistruoti problemos");
    } finally {
      setSubmittingProblem(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="secondary">Nauja</Badge>;
      case "in_progress":
        return <Badge variant="default">Vykdoma</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">Išspręsta</Badge>;
      case "closed":
        return <Badge variant="outline">Uždaryta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="py-12 bg-muted min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Don't render if not logged in (will redirect)
  if (!user) {
    return null;
  }

  // Check if user has permission (admin or approved resident)
  if (!isAdmin && !isApproved) {
    return (
      <Layout>
        <div className="py-12 bg-muted min-h-screen">
          <div className="container mx-auto px-4">
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Prašome sulaukti patvirtinimo, kad galėtumėte siųsti pranešimus.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  // ADMIN VIEW - Full messaging functionality
  if (isAdmin) {
    return (
      <Layout>
        <div className="py-12 bg-muted min-h-screen">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="text-center mb-8 animate-fade-in">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
                  <Send className="h-4 w-4" />
                  <span className="text-sm font-medium">Pranešimai</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                  Siųsti pranešimą
                </h1>
                <p className="text-muted-foreground">
                  Sukurkite ir išsiųskite pranešimą pasirinktiems gyventojams arba savininkams
                </p>
              </div>

              {/* Send Message Form */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Pranešimo forma
                  </CardTitle>
                  <CardDescription>
                    Užpildykite formą ir pasirinkite gavėjus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendNotification} className="space-y-6">
                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Tema</Label>
                      <Input
                        id="subject"
                        placeholder="Pranešimo tema..."
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                    
                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message">Pranešimas</Label>
                      <Textarea
                        id="message"
                        rows={8}
                        placeholder="Įveskite pranešimo tekstą..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    
                    {/* Photos */}
                    <div className="space-y-2">
                      <Label>Nuotraukos (neprivaloma)</Label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              <ImagePlus className="h-4 w-4 mr-2" />
                              Pridėti nuotrauką
                            </span>
                          </Button>
                        </label>
                        
                        {photos.map((photo, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-sm"
                          >
                            <span className="truncate max-w-[150px]">{photo.name}</span>
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Documents */}
                    <div className="space-y-2">
                      <Label>Dokumentai (neprivaloma)</Label>
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            multiple
                            onChange={handleDocumentUpload}
                            className="hidden"
                          />
                          <Button type="button" variant="outline" size="sm" asChild>
                            <span>
                              <FileUp className="h-4 w-4 mr-2" />
                              Pridėti dokumentą
                            </span>
                          </Button>
                        </label>
                        
                        {documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-sm"
                          >
                            <span className="truncate max-w-[150px]">{doc.name}</span>
                            <button
                              type="button"
                              onClick={() => removeDocument(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Recipients */}
                    <div className="space-y-2">
                      <Label>Gavėjai</Label>
                      <RecipientSelector
                        selectedResidentIds={selectedRecipients}
                        onSelectionChange={setSelectedRecipients}
                      />
                    </div>
                    
                    {/* Submit */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        type="submit"
                        disabled={sendingNotification || selectedRecipients.length === 0}
                        size="lg"
                      >
                        {sendingNotification ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Siunčiama...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Siųsti pranešimą ({selectedRecipients.length})
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Message History */}
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <Card className="card-elevated">
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <History className="h-5 w-5" />
                          <CardTitle>Mano pranešimų istorija</CardTitle>
                          <Badge variant="secondary" className="ml-2">
                            {sentMessages.length}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          {historyOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CardDescription>
                      Visi anksčiau jūsų išsiųsti pranešimai gyventojams
                    </CardDescription>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      {loadingHistory ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse p-4 border rounded-lg">
                              <div className="h-4 w-48 bg-muted rounded mb-2" />
                              <div className="h-3 w-full bg-muted rounded mb-2" />
                              <div className="h-3 w-24 bg-muted rounded" />
                            </div>
                          ))}
                        </div>
                      ) : sentMessages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Dar nėra išsiųstų pranešimų</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sentMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{msg.title}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {msg.content}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(msg.created_at).toLocaleDateString("lt-LT", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {msg.recipient_count} gavėjų
                                    </span>
                                  </div>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Ištrinti pranešimą?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Ar tikrai norite ištrinti šį pranešimą? Šio veiksmo negalėsite atšaukti.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Atšaukti</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteMessage(msg.id)}>
                                        Ištrinti
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // REGULAR USER VIEW - Problem reporting
  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Pranešimai</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Pranešti apie problemą
              </h1>
              <p className="text-muted-foreground">
                Užregistruokite gedimą ar problemą ir administratorius ją peržiūrės
              </p>
            </div>

            {/* Problem Report Form */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Problemos registravimas
                </CardTitle>
                <CardDescription>
                  Aprašykite problemą ir ji bus perduota administratoriui
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitProblem} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="problem-title">Problemos pavadinimas *</Label>
                    <Input
                      id="problem-title"
                      placeholder="Pvz.: Neveikia liftas"
                      value={problemForm.title}
                      onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                      required
                    />
                  </div>
                  
                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Kategorija</Label>
                    <Select
                      value={problemForm.category}
                      onValueChange={(value) => setProblemForm({ ...problemForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="problem-location">Vieta (neprivaloma)</Label>
                    <Input
                      id="problem-location"
                      placeholder="Pvz.: 3 aukštas, laiptinė A"
                      value={problemForm.location}
                      onChange={(e) => setProblemForm({ ...problemForm, location: e.target.value })}
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="problem-description">Aprašymas *</Label>
                    <Textarea
                      id="problem-description"
                      rows={5}
                      placeholder="Detaliai aprašykite problemą..."
                      value={problemForm.description}
                      onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
                      required
                    />
                  </div>
                  
                  {/* Photos */}
                  <div className="space-y-2">
                    <Label>Nuotraukos (neprivaloma)</Label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleProblemPhotoUpload}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <ImagePlus className="h-4 w-4 mr-2" />
                            Pridėti nuotrauką
                          </span>
                        </Button>
                      </label>
                      
                      {problemPhotos.map((photo, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md text-sm"
                        >
                          <span className="truncate max-w-[150px]">{photo.name}</span>
                          <button
                            type="button"
                            onClick={() => removeProblemPhoto(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Submit */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      type="submit"
                      disabled={submittingProblem}
                      size="lg"
                    >
                      {submittingProblem ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Siunčiama...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Pranešti apie problemą
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* My Problems History */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <Card className="card-elevated">
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        <CardTitle>Mano užregistruotos problemos</CardTitle>
                        <Badge variant="secondary" className="ml-2">
                          {myProblems.length}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        {historyOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CardDescription>
                    Visos jūsų užregistruotos problemos ir jų būsenos
                  </CardDescription>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    {loadingProblems ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse p-4 border rounded-lg">
                            <div className="h-4 w-48 bg-muted rounded mb-2" />
                            <div className="h-3 w-full bg-muted rounded mb-2" />
                            <div className="h-3 w-24 bg-muted rounded" />
                          </div>
                        ))}
                      </div>
                    ) : myProblems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Dar neužregistravote jokių problemų</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myProblems.map((problem) => (
                          <div
                            key={problem.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{problem.title}</h4>
                                  {getStatusBadge(problem.status)}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {problem.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(problem.created_at).toLocaleDateString("lt-LT", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </span>
                                  {problem.location && (
                                    <span>📍 {problem.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>
    </Layout>
  );
}
