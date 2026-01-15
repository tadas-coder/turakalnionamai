import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Send, AlertTriangle, X, History, Clock, CheckCircle, Loader2, Calendar, MapPin, Camera, FileText, Paperclip } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadTickets } from "@/hooks/useUnreadTickets";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const issueTypes = [
  { value: "doors", label: "Durų problemos" },
  { value: "water", label: "Vandentiekio/kanalizacijos problemos" },
  { value: "walls", label: "Sienų/lubų pažeidimai" },
  { value: "electricity", label: "Elektros problemos" },
  { value: "heating", label: "Šildymo problemos" },
  { value: "elevator", label: "Lifto problemos" },
  { value: "security", label: "Saugumo problemos" },
  { value: "cleanliness", label: "Švaros problemos" },
  { value: "other", label: "Kita" },
];

const statusLabels: Record<string, string> = {
  new: "Naujas",
  in_progress: "Vykdomas",
  resolved: "Išspręsta",
  closed: "Uždarytas",
};

const statusColors: Record<string, string> = {
  new: "bg-info text-info-foreground",
  in_progress: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
  closed: "bg-muted text-muted-foreground",
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "new":
      return Clock;
    case "in_progress":
      return Loader2;
    case "resolved":
    case "closed":
      return CheckCircle;
    default:
      return Clock;
  }
};

export default function Tickets() {
  const { user, isApproved, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isTicketUnread, markAsRead, markAllAsRead, unreadCount } = useUnreadTickets();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("new");
  const autoMarkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    apartment: "",
    issueType: "",
    description: "",
  });

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      toast.error("Prisijunkite, kad galėtumėte pranešti apie problemą");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Auto-mark all as read after 2 seconds when viewing history tab
  useEffect(() => {
    if (activeTab === "history" && unreadCount > 0 && user && isApproved) {
      autoMarkTimeoutRef.current = setTimeout(() => {
        markAllAsRead();
      }, 2000);
    }

    return () => {
      if (autoMarkTimeoutRef.current) {
        clearTimeout(autoMarkTimeoutRef.current);
      }
    };
  }, [activeTab, unreadCount, user, isApproved, markAllAsRead]);

  // Fetch user's tickets history
  const { data: myTickets = [], isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          ticket_photos(id, photo_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isApproved,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast.error("Galima įkelti ne daugiau kaip 5 nuotraukas");
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    const validFiles = files.filter(f => allowedTypes.includes(f.type));
    if (validFiles.length !== files.length) {
      toast.error("Leidžiami tik PDF, Word ir Excel failai");
    }
    
    if (validFiles.length + attachments.length > 3) {
      toast.error("Galima prisegti ne daugiau kaip 3 dokumentus");
      return;
    }
    
    setAttachments([...attachments, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getAttachmentIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx') return 'DOC';
    if (ext === 'xls' || ext === 'xlsx') return 'XLS';
    return 'FILE';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create the ticket in the database
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert({
          title: `${issueTypes.find(t => t.value === formData.issueType)?.label || formData.issueType}`,
          description: formData.description,
          category: formData.issueType,
          location: formData.apartment,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload photos if any
      if (images.length > 0 && ticket) {
        for (const image of images) {
          const fileName = `${ticket.id}/${Date.now()}-${image.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("ticket-photos")
            .upload(fileName, image);

          if (uploadError) {
            console.error("Error uploading image:", uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("ticket-photos")
            .getPublicUrl(fileName);

          // Save photo reference in database
          await supabase.from("ticket_photos").insert({
            ticket_id: ticket.id,
            photo_url: urlData.publicUrl,
          });
        }
      }

      // Upload attachments (PDF, Word, Excel) if any
      if (attachments.length > 0 && ticket) {
        for (const attachment of attachments) {
          const fileName = `${ticket.id}/docs/${Date.now()}-${attachment.name}`;
          const { error: uploadError } = await supabase.storage
            .from("ticket-photos")
            .upload(fileName, attachment);

          if (uploadError) {
            console.error("Error uploading attachment:", uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from("ticket-photos")
            .getPublicUrl(fileName);

          // Save attachment reference in database
          await supabase.from("ticket_attachments").insert({
            ticket_id: ticket.id,
            file_name: attachment.name,
            file_url: urlData.publicUrl,
            file_size: attachment.size,
            file_type: attachment.type,
          });
        }
      }

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke("send-ticket-notification", {
        body: {
          ticketId: ticket.id,
          title: ticket.title,
          description: formData.description,
          category: formData.issueType,
          location: formData.apartment,
          reporterName: formData.name,
          reporterEmail: formData.email,
        },
      });

      if (emailError) {
        console.error("Error sending email notification:", emailError);
      }

      toast.success("Pranešimas sėkmingai išsiųstas!", {
        description: "Administratorius netrukus susisieks su jumis.",
      });

      // Reset form and refetch tickets
      setFormData({ name: "", email: "", apartment: "", issueType: "", description: "" });
      setImages([]);
      previews.forEach(preview => URL.revokeObjectURL(preview));
      setPreviews([]);
      setAttachments([]);
      refetchTickets();
    } catch (error: any) {
      console.error("Error submitting ticket:", error);
      toast.error("Nepavyko išsiųsti pranešimo", {
        description: error.message || "Bandykite dar kartą",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    return issueTypes.find(t => t.value === category)?.label || category;
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

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full mb-4">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Pranešimai</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Gedimų pranešimai
              </h1>
              <p className="text-muted-foreground">
                Praneškite apie problemas ir sekite jų sprendimo eigą
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new" className="gap-2">
                  <Send className="h-4 w-4" />
                  Naujas pranešimas
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Mano pranešimai
                  {unreadCount > 0 ? (
                    <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
                  ) : myTickets.length > 0 ? (
                    <Badge variant="secondary" className="ml-1">{myTickets.length}</Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
              
              {unreadCount > 0 && (
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Pažymėti visus kaip perskaitytus
                  </Button>
                </div>
              )}

              <TabsContent value="new">
                <Card className="card-elevated animate-slide-up">
                  <CardHeader>
                    <CardTitle>Pranešimo forma</CardTitle>
                    <CardDescription>
                      Pažymėti laukai (*) yra privalomi
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Vardas, Pavardė *</Label>
                          <Input
                            id="name"
                            placeholder="Jonas Jonaitis"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">El. paštas *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="jonas@pavyzdys.lt"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="apartment">Buto numeris *</Label>
                          <Input
                            id="apartment"
                            placeholder="pvz. 15"
                            value={formData.apartment}
                            onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="issueType">Problemos tipas *</Label>
                          <Select
                            value={formData.issueType}
                            onValueChange={(value) => setFormData({ ...formData, issueType: value })}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pasirinkite tipą" />
                            </SelectTrigger>
                            <SelectContent>
                              {issueTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Problemos aprašymas *</Label>
                        <Textarea
                          id="description"
                          placeholder="Detaliai aprašykite problemą..."
                          rows={5}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label>Nuotraukos (neprivaloma)</Label>
                        
                        {/* Camera and Upload buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          {/* Camera button - only show on mobile */}
                          {isMobile && (
                            <>
                              <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageChange}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={() => cameraInputRef.current?.click()}
                                disabled={images.length >= 5}
                              >
                                <Camera className="h-5 w-5" />
                                Fotografuoti
                              </Button>
                            </>
                          )}
                          
                          {/* Upload button */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={images.length >= 5}
                          >
                            <Upload className="h-5 w-5" />
                            Įkelti nuotraukas
                          </Button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground text-center">
                          Iki 5 nuotraukų (PNG, JPG)
                        </p>

                        {previews.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                            {previews.map((preview, index) => (
                              <div key={index} className="relative group aspect-square">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Document attachments section */}
                      <div className="space-y-3">
                        <Label>Dokumentai (neprivaloma)</Label>
                        
                        <input
                          ref={attachmentInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          multiple
                          onChange={handleAttachmentChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => attachmentInputRef.current?.click()}
                          disabled={attachments.length >= 3}
                        >
                          <Paperclip className="h-5 w-5" />
                          Prisegti dokumentą
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center">
                          Iki 3 dokumentų (PDF, Word, Excel)
                        </p>

                        {attachments.length > 0 && (
                          <div className="space-y-2 mt-4">
                            {attachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {getAttachmentIcon(file.name)} • {(file.size / 1024).toFixed(0)} KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(index)}
                                  className="w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={isSubmitting || !formData.name || !formData.email || !formData.apartment || !formData.issueType || !formData.description}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            Siunčiama...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Išsiųsti pranešimą
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                {!user || !isApproved ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Prisijunkite, kad matytumėte savo pranešimų istoriją
                      </p>
                    </CardContent>
                  </Card>
                ) : isLoadingTickets ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-4 animate-spin" />
                      <p className="text-muted-foreground">Kraunama...</p>
                    </CardContent>
                  </Card>
                ) : myTickets.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Jūs dar nepateikėte jokių pranešimų
                      </p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => {
                          const tabsList = document.querySelector('[data-state="active"][value="history"]');
                          if (tabsList) {
                            const newTab = document.querySelector('[value="new"]') as HTMLButtonElement;
                            newTab?.click();
                          }
                        }}
                      >
                        Pateikti pirmą pranešimą →
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {myTickets.map((ticket, index) => {
                      const StatusIcon = getStatusIcon(ticket.status || "new");
                      const status = ticket.status || "new";
                      const isUnread = isTicketUnread(ticket.id, ticket.updated_at);
                      return (
                        <Card 
                          key={ticket.id} 
                          className={cn(
                            "card-elevated animate-slide-up",
                            !isUnread && "opacity-70",
                            isUnread && "ring-2 ring-primary"
                          )}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  {isUnread && (
                                    <Badge variant="destructive" className="text-xs">
                                      Naujas
                                    </Badge>
                                  )}
                                  <Badge className={statusColors[status]}>
                                    <StatusIcon className={cn(
                                      "h-3 w-3 mr-1",
                                      status === "in_progress" && "animate-spin"
                                    )} />
                                    {statusLabels[status]}
                                  </Badge>
                                  <Badge variant="outline">
                                    {getCategoryLabel(ticket.category)}
                                  </Badge>
                                </div>
                                <CardTitle className="text-lg">{ticket.title}</CardTitle>
                              </div>
                              {isUnread && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => markAsRead(ticket.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Perskaityta
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-muted-foreground text-sm mb-4">
                              {ticket.description}
                            </p>
                            
                            {/* Photos */}
                            {ticket.ticket_photos && ticket.ticket_photos.length > 0 && (
                              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {ticket.ticket_photos.map((photo: any) => (
                                  <a 
                                    key={photo.id} 
                                    href={photo.photo_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0"
                                  >
                                    <img 
                                      src={photo.photo_url} 
                                      alt="Pranešimo nuotrauka"
                                      className="h-16 w-16 object-cover rounded-md border hover:opacity-80 transition-opacity"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-4 pt-3 border-t border-border text-xs text-muted-foreground">
                              {ticket.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>Butas {ticket.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Pateikta: {new Date(ticket.created_at).toLocaleDateString("lt-LT", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {ticket.updated_at !== ticket.created_at && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Atnaujinta: {new Date(ticket.updated_at).toLocaleDateString("lt-LT", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
