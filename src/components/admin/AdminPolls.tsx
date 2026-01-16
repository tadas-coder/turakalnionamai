import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Users, X, Vote } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RecipientSelector } from "./RecipientSelector";

const POLL_TYPES = [
  { value: "owners_vote", label: "Visų Savininkų balsavimas raštu" },
  { value: "members_vote", label: "Bendrijos narių balsavimas raštu" },
  { value: "opinion_form", label: "Iš anksto raštu teikiamos nuomonės blankas" },
  { value: "simple_survey", label: "Paprasta apklausa" },
  { value: "board_vote", label: "Valdybos narių balsavimas raštu" },
] as const;

type PollType = typeof POLL_TYPES[number]["value"];

interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  active: boolean;
  ends_at: string | null;
  created_at: string;
  recipient_count?: number;
  poll_type: string | null;
}

interface PollVote {
  option_index: number;
}

export function AdminPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotes, setPollVotes] = useState<{ [pollId: string]: PollVote[] }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    options: ["", ""],
    active: true,
    ends_at: "",
    poll_type: "simple_survey" as PollType,
  });

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const [pollsRes, votesRes, recipientsRes] = await Promise.all([
        supabase.from("polls").select("*").order("created_at", { ascending: false }),
        supabase.from("poll_votes").select("poll_id, option_index"),
        supabase.from("poll_recipients").select("poll_id, resident_id"),
      ]);

      if (pollsRes.error) throw pollsRes.error;
      if (votesRes.error) throw votesRes.error;
      if (recipientsRes.error) throw recipientsRes.error;

      // Count recipients per poll
      const recipientCounts: { [pollId: string]: number } = {};
      (recipientsRes.data || []).forEach(r => {
        recipientCounts[r.poll_id] = (recipientCounts[r.poll_id] || 0) + 1;
      });
      
      // Parse options from JSONB
      const parsedPolls: Poll[] = (pollsRes.data || []).map(poll => ({
        ...poll,
        options: Array.isArray(poll.options) 
          ? poll.options.map(opt => String(opt)) 
          : [],
        recipient_count: recipientCounts[poll.id] || 0,
      }));
      
      setPolls(parsedPolls);

      const votesByPoll: { [pollId: string]: PollVote[] } = {};
      (votesRes.data || []).forEach(vote => {
        if (!votesByPoll[vote.poll_id]) {
          votesByPoll[vote.poll_id] = [];
        }
        votesByPoll[vote.poll_id].push({ option_index: vote.option_index });
      });
      setPollVotes(votesByPoll);
    } catch (error) {
      console.error("Error fetching polls:", error);
      toast.error("Nepavyko užkrauti apklausų");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      title: "",
      description: "",
      options: ["", ""],
      active: true,
      ends_at: "",
      poll_type: "simple_survey",
    });
    setSelectedRecipients([]);
    setDialogOpen(true);
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData({ ...formData, options: [...formData.options, ""] });
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData({
        ...formData,
        options: formData.options.filter((_, i) => i !== index),
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = formData.options.filter(opt => opt.trim() !== "");
    if (validOptions.length < 2) {
      toast.error("Reikia bent 2 atsakymo variantų");
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error("Pasirinkite bent vieną gavėją");
      return;
    }

    setSubmitting(true);
    try {
      // Create the poll
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          title: formData.title,
          description: formData.description || null,
          options: validOptions,
          active: formData.active,
          ends_at: formData.ends_at || null,
          poll_type: formData.poll_type,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Add recipients
      const recipientInserts = selectedRecipients.map(residentId => ({
        poll_id: poll.id,
        resident_id: residentId,
      }));

      const { error: recipientError } = await supabase
        .from("poll_recipients")
        .insert(recipientInserts);

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
        const { error: notifyError } = await supabase.functions.invoke("send-poll-notification", {
          body: {
            pollId: poll.id,
            pollTitle: formData.title,
            pollDescription: formData.description || null,
            pollOptions: validOptions,
            endsAt: formData.ends_at || null,
            recipients: residentsWithEmail.map(r => ({
              name: r.full_name,
              email: r.email,
            })),
          },
        });

        if (notifyError) {
          console.error("Error sending notifications:", notifyError);
          toast.warning(`Apklausa sukurta, bet el. laiškų siuntimas nepavyko: ${notifyError.message}`);
        } else {
          toast.success(`Apklausa sukurta ir išsiųsta ${residentsWithEmail.length} gavėjams el. paštu`);
        }
      } else {
        toast.success(`Apklausa sukurta ${selectedRecipients.length} gavėjams (el. paštų nėra)`);
      }

      setDialogOpen(false);
      fetchPolls();
    } catch (error) {
      console.error("Error creating poll:", error);
      toast.error("Nepavyko sukurti apklausos");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (poll: Poll) => {
    try {
      const { error } = await supabase
        .from("polls")
        .update({ active: !poll.active })
        .eq("id", poll.id);

      if (error) throw error;
      setPolls(polls.map(p => 
        p.id === poll.id ? { ...p, active: !p.active } : p
      ));
      toast.success(poll.active ? "Apklausa sustabdyta" : "Apklausa aktyvuota");
    } catch (error) {
      console.error("Error toggling poll:", error);
      toast.error("Nepavyko pakeisti būsenos");
    }
  };

  const deletePoll = async (id: string) => {
    try {
      const { error } = await supabase
        .from("polls")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setPolls(polls.filter(p => p.id !== id));
      toast.success("Apklausa ištrinta");
    } catch (error) {
      console.error("Error deleting poll:", error);
      toast.error("Nepavyko ištrinti apklausos");
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
              <div className="h-24 w-full bg-muted rounded" />
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
              Nauja apklausa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nauja apklausa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="poll-type">Balsavimo tipas</Label>
                <Select
                  value={formData.poll_type}
                  onValueChange={(value: PollType) => setFormData({ ...formData, poll_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite tipą" />
                  </SelectTrigger>
                  <SelectContent>
                    {POLL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-title">Pavadinimas</Label>
                <Input
                  id="poll-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-description">Aprašymas (neprivaloma)</Label>
                <Textarea
                  id="poll-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Atsakymo variantai</Label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Variantas ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        required
                      />
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.options.length < 6 && (
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4" />
                    Pridėti variantą
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-ends">Pabaigos data (neprivaloma)</Label>
                <Input
                  id="poll-ends"
                  type="date"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
              </div>
              
              {/* Recipient Selector */}
              <RecipientSelector
                selectedResidentIds={selectedRecipients}
                onSelectionChange={setSelectedRecipients}
              />

              <div className="flex items-center justify-between">
                <Label htmlFor="poll-active">Aktyvuoti iš karto</Label>
                <Switch
                  id="poll-active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Atšaukti
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Kuriama..." : "Sukurti"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {polls.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="py-12 text-center">
            <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Apklausų nėra</h3>
            <p className="text-muted-foreground mb-4">
              Sukurkite pirmą apklausą gyventojams
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Sukurti apklausą
            </Button>
          </CardContent>
        </Card>
      ) : (
        polls.map((poll) => {
          const votes = pollVotes[poll.id] || [];
          const totalVotes = votes.length;

          return (
            <Card key={poll.id} className="card-elevated">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{poll.title}</CardTitle>
                      {poll.poll_type && (
                        <Badge variant="outline" className="text-xs font-normal">
                          <Vote className="h-3 w-3 mr-1" />
                          {POLL_TYPES.find(t => t.value === poll.poll_type)?.label || poll.poll_type}
                        </Badge>
                      )}
                    </div>
                    {poll.description && (
                      <CardDescription className="mt-1">{poll.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={poll.active ? "default" : "secondary"}>
                    {poll.active ? "Aktyvus" : "Sustabdyta"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {poll.options.map((option, index) => {
                    const optionVotes = votes.filter(v => v.option_index === index).length;
                    const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
                    
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{option}</span>
                          <span className="text-muted-foreground">
                            {optionVotes} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{totalVotes} balsų</span>
                  </div>
                  {poll.recipient_count !== undefined && poll.recipient_count > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{poll.recipient_count} gavėjų</span>
                    </div>
                  )}
                  {poll.ends_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Iki: {new Date(poll.ends_at).toLocaleDateString("lt-LT")}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(poll)}
                  >
                    {poll.active ? "Sustabdyti" : "Aktyvuoti"}
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
                        <AlertDialogTitle>Ištrinti apklausą?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Ši apklausa ir visi balsai bus ištrinti negrįžtamai.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Atšaukti</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePoll(poll.id)}>
                          Ištrinti
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
