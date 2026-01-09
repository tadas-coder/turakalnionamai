import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadTickets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's tickets
  const { data: tickets = [] } = useQuery({
    queryKey: ["user-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("tickets")
        .select("id, updated_at")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch read statuses
  const { data: readStatuses = [] } = useQuery({
    queryKey: ["ticket-read-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("ticket_read")
        .select("ticket_id, read_at")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate unread count (tickets updated after last read or never read)
  const unreadCount = tickets.filter((ticket) => {
    const readStatus = readStatuses.find((r) => r.ticket_id === ticket.id);
    if (!readStatus) return true; // Never read
    return new Date(ticket.updated_at) > new Date(readStatus.read_at);
  }).length;

  // Check if a specific ticket is unread
  const isTicketUnread = (ticketId: string, updatedAt: string) => {
    const readStatus = readStatuses.find((r) => r.ticket_id === ticketId);
    if (!readStatus) return true;
    return new Date(updatedAt) > new Date(readStatus.read_at);
  };

  // Mark ticket as read
  const markAsReadMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("ticket_read")
        .upsert(
          { user_id: user.id, ticket_id: ticketId, read_at: new Date().toISOString() },
          { onConflict: "user_id,ticket_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-read-status", user?.id] });
    },
  });

  // Mark all tickets as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const unreadTickets = tickets.filter((ticket) => {
        const readStatus = readStatuses.find((r) => r.ticket_id === ticket.id);
        if (!readStatus) return true;
        return new Date(ticket.updated_at) > new Date(readStatus.read_at);
      });

      for (const ticket of unreadTickets) {
        await supabase
          .from("ticket_read")
          .upsert(
            { user_id: user.id, ticket_id: ticket.id, read_at: new Date().toISOString() },
            { onConflict: "user_id,ticket_id" }
          );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-read-status", user?.id] });
    },
  });

  return {
    unreadCount,
    isTicketUnread,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
  };
}
