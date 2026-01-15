import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Vote, Users, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { lt } from "date-fns/locale";

interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  active: boolean;
  ends_at: string | null;
  created_at: string;
}

interface PollVote {
  poll_id: string;
  option_index: number;
}

export default function Voting() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch polls from database (RLS will filter to only those user is recipient of)
  const { data: polls = [], isLoading: pollsLoading } = useQuery({
    queryKey: ["polls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Poll[];
    },
    enabled: !!user,
  });

  // Fetch user's votes
  const { data: userVotes = [] } = useQuery({
    queryKey: ["poll_votes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_votes")
        .select("poll_id, option_index")
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data as PollVote[];
    },
    enabled: !!user,
  });

  // Fetch vote counts for all polls
  const { data: voteCounts = {} } = useQuery({
    queryKey: ["poll_vote_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_votes")
        .select("poll_id, option_index");
      
      if (error) throw error;
      
      // Group votes by poll_id and option_index
      const counts: Record<string, Record<number, number>> = {};
      data.forEach((vote) => {
        if (!counts[vote.poll_id]) {
          counts[vote.poll_id] = {};
        }
        counts[vote.poll_id][vote.option_index] = (counts[vote.poll_id][vote.option_index] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  // Fetch recipient counts for polls
  const { data: recipientCounts = {} } = useQuery({
    queryKey: ["poll_recipient_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_recipients")
        .select("poll_id");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((r) => {
        counts[r.poll_id] = (counts[r.poll_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: pollId,
        option_index: optionIndex,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll_votes"] });
      queryClient.invalidateQueries({ queryKey: ["poll_vote_counts"] });
      toast.success("Jūsų balsas užregistruotas!");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Jūs jau balsavote šioje apklausoje");
      } else {
        toast.error("Nepavyko užregistruoti balso");
      }
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || pollsLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const handleVote = (pollId: string, optionIndex: number) => {
    voteMutation.mutate({ pollId, optionIndex });
  };

  const getStatusBadge = (poll: Poll) => {
    const now = new Date();
    const isEnded = poll.ends_at && new Date(poll.ends_at) < now;
    const isActive = poll.active && !isEnded;
    
    if (isActive) {
      return <Badge className="bg-success text-success-foreground">Aktyvus</Badge>;
    }
    return <Badge variant="secondary">Pasibaigęs</Badge>;
  };

  const isPollEnded = (poll: Poll) => {
    const now = new Date();
    return !poll.active || (poll.ends_at && new Date(poll.ends_at) < now);
  };

  const getUserVote = (pollId: string) => {
    return userVotes.find((v) => v.poll_id === pollId);
  };

  const getVoteCount = (pollId: string, optionIndex: number) => {
    return voteCounts[pollId]?.[optionIndex] || 0;
  };

  const getTotalVotes = (pollId: string) => {
    const pollVotes = voteCounts[pollId] || {};
    return Object.values(pollVotes).reduce((sum, count) => sum + count, 0);
  };

  const getRecipientCount = (pollId: string) => {
    return recipientCounts[pollId] || 0;
  };

  const formatEndDate = (endsAt: string | null) => {
    if (!endsAt) return null;
    return format(new Date(endsAt), "yyyy-MM-dd", { locale: lt });
  };

  return (
    <Layout>
      <div className="py-12 bg-muted min-h-screen">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full mb-4">
                <Vote className="h-4 w-4" />
                <span className="text-sm font-medium">Balsavimas</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-4">
                Bendrijos apklausos
              </h1>
              <p className="text-muted-foreground">
                Dalyvaukite priimant svarbius bendrijos sprendimus
              </p>
            </div>

            {polls.length === 0 ? (
              <Card className="card-elevated">
                <CardContent className="py-12 text-center">
                  <Vote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Šiuo metu nėra aktyvių apklausų</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {polls.map((poll, index) => {
                  const options = poll.options as string[];
                  const totalVotes = getTotalVotes(poll.id);
                  const userVote = getUserVote(poll.id);
                  const hasVoted = !!userVote;
                  const isEnded = isPollEnded(poll);
                  const totalRecipients = getRecipientCount(poll.id);

                  return (
                    <Card 
                      key={poll.id} 
                      className="card-elevated animate-slide-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-xl">{poll.title}</CardTitle>
                            <CardDescription className="mt-2">{poll.description}</CardDescription>
                          </div>
                          {getStatusBadge(poll)}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {options.map((optionText, optionIndex) => {
                          const votes = getVoteCount(poll.id, optionIndex);
                          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                          const isSelected = userVote?.option_index === optionIndex;

                          return (
                            <div key={optionIndex} className="space-y-2">
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                className="w-full justify-start h-auto py-3 px-4"
                                disabled={hasVoted || isEnded || voteMutation.isPending}
                                onClick={() => handleVote(poll.id, optionIndex)}
                              >
                                <span className="flex-1 text-left">{optionText}</span>
                                {(hasVoted || isEnded) && (
                                  <span className="text-sm font-medium">
                                    {percentage.toFixed(0)}%
                                  </span>
                                )}
                                {isSelected && <CheckCircle2 className="h-4 w-4 ml-2" />}
                              </Button>
                              {(hasVoted || isEnded) && (
                                <Progress value={percentage} className="h-2" />
                              )}
                            </div>
                          );
                        })}
                      </CardContent>

                      <CardFooter className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{totalVotes} iš {totalRecipients} balsavo</span>
                        </div>
                        {poll.ends_at && (
                          <div className="flex items-center gap-2">
                            {isEnded ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                            <span>
                              {isEnded ? "Baigėsi" : "Baigiasi"}: {formatEndDate(poll.ends_at)}
                            </span>
                          </div>
                        )}
                      </CardFooter>
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
