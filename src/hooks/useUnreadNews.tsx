import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadNews() {
  const { user, isApproved } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all published news
  const { data: allNews = [] } = useQuery({
    queryKey: ["news-for-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id")
        .eq("published", true);
      if (error) throw error;
      return data;
    },
    enabled: !!user && isApproved,
  });

  // Fetch read news IDs for current user
  const { data: readNewsIds = [] } = useQuery({
    queryKey: ["news-read", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("news_read")
        .select("news_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.news_id);
    },
    enabled: !!user && isApproved,
  });

  // Mark news as read
  const markAsReadMutation = useMutation({
    mutationFn: async (newsId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("news_read").insert({
        user_id: user.id,
        news_id: newsId,
      });
      // Ignore duplicate error
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-read", user?.id] });
    },
  });

  // Mark news as unread
  const markAsUnreadMutation = useMutation({
    mutationFn: async (newsId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("news_read")
        .delete()
        .eq("user_id", user.id)
        .eq("news_id", newsId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-read", user?.id] });
    },
  });

  const unreadCount = allNews.filter((n) => !readNewsIds.includes(n.id)).length;
  const isRead = (newsId: string) => readNewsIds.includes(newsId);

  return {
    unreadCount,
    readNewsIds,
    isRead,
    markAsRead: markAsReadMutation.mutate,
    markAsUnread: markAsUnreadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingUnread: markAsUnreadMutation.isPending,
  };
}
