import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, CheckCircle2, AlertTriangle, XCircle, MapPin, Calendar, Image, FileText, Download, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  status: string;
  created_at: string;
  user_id: string | null;
}

interface TicketPhoto {
  id: string;
  photo_url: string;
}

interface TicketAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
}

const statusOptions = [
  { value: "new", label: "Naujas", icon: AlertTriangle, color: "bg-destructive" },
  { value: "in_progress", label: "Vykdomas", icon: Clock, color: "bg-warning" },
  { value: "resolved", label: "Išspręstas", icon: CheckCircle2, color: "bg-success" },
  { value: "closed", label: "Uždarytas", icon: XCircle, color: "bg-muted" },
];

const categoryLabels: { [key: string]: string } = {
  doors: "Durų problemos",
  water: "Vandentiekio problemos",
  walls: "Sienų pažeidimai",
  electricity: "Elektros problemos",
  heating: "Šildymo problemos",
  elevator: "Lifto problemos",
  security: "Saugumo problemos",
  cleanliness: "Švaros problemos",
  other: "Kita",
};

export function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketPhotos, setTicketPhotos] = useState<TicketPhoto[]>([]);
  const [ticketAttachments, setTicketAttachments] = useState<TicketAttachment[]>([]);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Nepavyko užkrauti pranešimų");
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const oldStatus = ticket.status;
    
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticketId);

      if (error) throw error;

      setTickets(tickets.map(t => 
        t.id === ticketId ? { ...t, status: newStatus } : t
      ));
      toast.success("Būsena atnaujinta");

      // Fetch author email if ticket has user_id
      let authorEmail: string | undefined;
      let authorName: string | undefined;
      
      if (ticket.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", ticket.user_id)
          .single();
        
        if (profileData) {
          authorEmail = profileData.email;
          authorName = profileData.full_name || undefined;
        }
      }

      // Send email notification about status change
      try {
        await supabase.functions.invoke("send-status-notification", {
          body: {
            ticketTitle: ticket.title,
            ticketDescription: ticket.description,
            ticketCategory: ticket.category,
            ticketLocation: ticket.location,
            oldStatus,
            newStatus,
            updatedAt: new Date().toISOString(),
            authorEmail,
            authorName,
          },
        });
      } catch (emailError) {
        console.error("Failed to send status notification email:", emailError);
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Nepavyko atnaujinti būsenos");
    }
  };

  const viewMedia = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    try {
      // Fetch photos
      const { data: photos, error: photosError } = await supabase
        .from("ticket_photos")
        .select("*")
        .eq("ticket_id", ticket.id);

      if (photosError) throw photosError;
      setTicketPhotos(photos || []);

      // Fetch attachments
      const { data: attachments, error: attachmentsError } = await supabase
        .from("ticket_attachments")
        .select("*")
        .eq("ticket_id", ticket.id);

      if (attachmentsError) throw attachmentsError;
      setTicketAttachments(attachments || []);

      setMediaDialogOpen(true);
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Nepavyko užkrauti priedų");
    }
  };

  const getAttachmentIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx') return 'DOC';
    if (ext === 'xls' || ext === 'xlsx') return 'XLS';
    return 'FILE';
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = statusOptions.find(s => s.value === status);
    if (!statusInfo) return null;
    const Icon = statusInfo.icon;
    return (
      <Badge className={`${statusInfo.color} text-white gap-1`}>
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    );
  };

  const filteredTickets = statusFilter === "all" 
    ? tickets 
    : tickets.filter(t => t.status === statusFilter);

  const getStatusCount = (status: string) => {
    return tickets.filter(t => t.status === status).length;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-16 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="card-elevated">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Pranešimų nėra</h3>
          <p className="text-muted-foreground">
            Kol kas nėra užregistruotų pranešimų apie gedimus
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            Visi ({tickets.length})
          </Button>
          <Button
            variant={statusFilter === "new" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("new")}
            className={statusFilter === "new" ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Nauji ({getStatusCount("new")})
          </Button>
          <Button
            variant={statusFilter === "in_progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("in_progress")}
            className={statusFilter === "in_progress" ? "bg-warning hover:bg-warning/90" : ""}
          >
            <Clock className="h-4 w-4 mr-1" />
            Vykdomi ({getStatusCount("in_progress")})
          </Button>
          <Button
            variant={statusFilter === "resolved" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("resolved")}
            className={statusFilter === "resolved" ? "bg-success hover:bg-success/90" : ""}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Išspręsti ({getStatusCount("resolved")})
          </Button>
          <Button
            variant={statusFilter === "closed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("closed")}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Uždaryti ({getStatusCount("closed")})
          </Button>
        </div>

        {filteredTickets.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Pranešimų nerasta</h3>
              <p className="text-muted-foreground">
                Nėra pranešimų su pasirinkta būsena
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="card-elevated">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{ticket.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {categoryLabels[ticket.category] || ticket.category}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(ticket.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground/80">{ticket.description}</p>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {ticket.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Butas: {ticket.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(ticket.created_at).toLocaleDateString("lt-LT")}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Select
                  value={ticket.status}
                  onValueChange={(value) => updateTicketStatus(ticket.id, value)}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Keisti būseną" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => viewMedia(ticket)}>
                  <Paperclip className="h-4 w-4 mr-1" />
                  Priedai
                </Button>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>

      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pranešimo priedai</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="photos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="photos" className="gap-2">
                <Image className="h-4 w-4" />
                Nuotraukos ({ticketPhotos.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                Dokumentai ({ticketAttachments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="photos" className="mt-4">
              {ticketPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {ticketPhotos.map((photo) => (
                    <a
                      key={photo.id}
                      href={photo.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={photo.photo_url}
                        alt="Pranešimo nuotrauka"
                        className="w-full h-48 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Šis pranešimas neturi nuotraukų
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="documents" className="mt-4">
              {ticketAttachments.length > 0 ? (
                <div className="space-y-3">
                  {ticketAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{attachment.file_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getAttachmentIcon(attachment.file_name)}
                            {attachment.file_size && ` • ${(attachment.file_size / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={attachment.file_name}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Atsisiųsti
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Šis pranešimas neturi dokumentų
                </p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
