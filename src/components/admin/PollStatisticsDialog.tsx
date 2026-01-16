import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { CheckCircle2, Clock, MinusCircle } from "lucide-react";

interface PollStatisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollId: string | null;
  pollTitle: string;
  pollOptions: string[];
}

interface VoteDetail {
  id: string;
  user_id: string;
  option_index: number;
  created_at: string;
  resident: {
    id: string;
    full_name: string;
    address: string | null;
    apartment_number: string | null;
    votes_count: number | null;
    property_share: number | null;
    notes: string | null;
  } | null;
}

interface RecipientDetail {
  id: string;
  resident_id: string;
  resident: {
    id: string;
    full_name: string;
    address: string | null;
    apartment_number: string | null;
    votes_count: number | null;
    property_share: number | null;
    notes: string | null;
  } | null;
}

interface CombinedVoteData {
  residentId: string;
  fullName: string;
  address: string | null;
  apartmentNumber: string | null;
  votesCount: number | null;
  propertyShare: number | null;
  notes: string | null;
  hasVoted: boolean;
  selectedOption: string | null;
  optionIndex: number | null;
  votedAt: string | null;
}

export function PollStatisticsDialog({
  open,
  onOpenChange,
  pollId,
  pollTitle,
  pollOptions,
}: PollStatisticsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CombinedVoteData[]>([]);

  useEffect(() => {
    if (open && pollId) {
      fetchStatistics();
    }
  }, [open, pollId]);

  const fetchStatistics = async () => {
    if (!pollId) return;
    
    setLoading(true);
    try {
      // Fetch all recipients with their resident data
      const { data: recipients, error: recipientsError } = await supabase
        .from("poll_recipients")
        .select(`
          id,
          resident_id,
          resident:residents (
            id,
            full_name,
            address,
            apartment_number,
            votes_count,
            property_share,
            notes
          )
        `)
        .eq("poll_id", pollId);

      if (recipientsError) throw recipientsError;

      // Fetch all votes for this poll
      const { data: votes, error: votesError } = await supabase
        .from("poll_votes")
        .select("id, user_id, option_index, created_at")
        .eq("poll_id", pollId);

      if (votesError) throw votesError;

      // Fetch profiles to map user_id to residents
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email");

      if (profilesError) throw profilesError;

      // Create a map of profile_id to votes
      const votesByUserId = new Map<string, { option_index: number; created_at: string }>();
      (votes || []).forEach(vote => {
        if (vote.user_id) {
          votesByUserId.set(vote.user_id, {
            option_index: vote.option_index,
            created_at: vote.created_at,
          });
        }
      });

      // Fetch residents linked to profiles to map votes
      const { data: allResidents, error: allResidentsError } = await supabase
        .from("residents")
        .select("id, linked_profile_id");

      if (allResidentsError) throw allResidentsError;

      // Create a map of resident_id to profile_id
      const residentToProfile = new Map<string, string>();
      (allResidents || []).forEach(r => {
        if (r.linked_profile_id) {
          residentToProfile.set(r.id, r.linked_profile_id);
        }
      });

      // Combine the data
      const combinedData: CombinedVoteData[] = (recipients || []).map((recipient: any) => {
        const resident = recipient.resident;
        const profileId = resident ? residentToProfile.get(resident.id) : null;
        const vote = profileId ? votesByUserId.get(profileId) : null;

        return {
          residentId: resident?.id || recipient.resident_id,
          fullName: resident?.full_name || "Nežinomas",
          address: resident?.address || null,
          apartmentNumber: resident?.apartment_number || null,
          votesCount: resident?.votes_count ?? 1,
          propertyShare: resident?.property_share ?? null,
          notes: resident?.notes || null,
          hasVoted: !!vote,
          selectedOption: vote ? pollOptions[vote.option_index] || `Variantas ${vote.option_index + 1}` : null,
          optionIndex: vote?.option_index ?? null,
          votedAt: vote?.created_at || null,
        };
      });

      // Sort: voted first, then by name
      combinedData.sort((a, b) => {
        if (a.hasVoted !== b.hasVoted) {
          return a.hasVoted ? -1 : 1;
        }
        return a.fullName.localeCompare(b.fullName, "lt");
      });

      setData(combinedData);
    } catch (error) {
      console.error("Error fetching poll statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const votedCount = data.filter(d => d.hasVoted).length;
  const totalVotesWeight = data.reduce((sum, d) => sum + (d.hasVoted ? (d.votesCount || 1) : 0), 0);
  const totalWeight = data.reduce((sum, d) => sum + (d.votesCount || 1), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Balsavimo statistika</DialogTitle>
          <DialogDescription>{pollTitle}</DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 mb-4 text-sm">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Balsavo: {votedCount} / {data.length}
          </Badge>
          <Badge variant="outline" className="gap-1">
            Balsų svoris: {totalVotesWeight} / {totalWeight}
          </Badge>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nėra gavėjų šiai apklausai
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Asmuo</TableHead>
                  <TableHead className="w-[80px] text-center">Balsai</TableHead>
                  <TableHead className="w-[140px]">Namas</TableHead>
                  <TableHead className="w-[100px] text-right">Turtas</TableHead>
                  <TableHead className="w-[180px]">Pasirinktas sprendimas</TableHead>
                  <TableHead>Pastabos</TableHead>
                  <TableHead className="w-[140px]">Balsavimo laikas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.residentId}>
                    <TableCell className="font-medium">{row.fullName}</TableCell>
                    <TableCell className="text-center">
                      {row.votesCount ?? 1}
                    </TableCell>
                    <TableCell>
                      {row.address || row.apartmentNumber ? (
                        <span className="text-sm">
                          {row.address}
                          {row.apartmentNumber && ` (${row.apartmentNumber})`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.propertyShare != null ? (
                        <span>{row.propertyShare.toFixed(2)}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.hasVoted ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {row.selectedOption}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Nebalsavo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.notes ? (
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {row.notes}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.votedAt ? (
                        <span className="text-sm">
                          {format(new Date(row.votedAt), "yyyy-MM-dd HH:mm", { locale: lt })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
