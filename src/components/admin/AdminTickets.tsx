import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, CheckCircle2, AlertTriangle, XCircle, MapPin, Calendar, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

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
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Nepavyko atnaujinti būsenos");
    }
  };

  const viewPhotos = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    try {
      const { data, error } = await supabase
        .from("ticket_photos")
        .select("*")
        .eq("ticket_id", ticket.id);

      if (error) throw error;
      setTicketPhotos(data || []);
      setPhotoDialogOpen(true);
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast.error("Nepavyko užkrauti nuotraukų");
    }
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
        {tickets.map((ticket) => (
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

                <Button variant="outline" onClick={() => viewPhotos(ticket)}>
                  <Image className="h-4 w-4" />
                  Nuotraukos
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pranešimo nuotraukos</DialogTitle>
          </DialogHeader>
          {ticketPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {ticketPhotos.map((photo) => (
                <img
                  key={photo.id}
                  src={photo.photo_url}
                  alt="Pranešimo nuotrauka"
                  className="w-full h-48 object-cover rounded-lg"
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Šis pranešimas neturi nuotraukų
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
