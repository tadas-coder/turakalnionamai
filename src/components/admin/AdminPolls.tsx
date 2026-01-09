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
import { Plus, Trash2, Calendar, Users, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  option_index: number;
}

export function AdminPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVotes, setPollVotes] = useState<{ [pollId: string]: PollVote[] }>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    options: ["", ""],
    active: true,
    ends_at: "",
  });

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const { data: pollsData, error: pollsError } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });

      if (pollsError) throw pollsError;
      
      // Parse options from JSONB
      const parsedPolls: Poll[] = (pollsData || []).map(poll => ({
        ...poll,
        options: Array.isArray(poll.options) 
          ? poll.options.map(opt => String(opt)) 
          : [],
      }));
      
      setPolls(parsedPolls);

      // Fetch votes for all polls
      const { data: votesData, error: votesError } = await supabase
        .from("poll_votes")
        .select("poll_id, option_index");

      if (votesError) throw votesError;

      const votesByPoll: { [pollId: string]: PollVote[] } = {};
      (votesData || []).forEach(vote => {
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
    });
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

    try {
      const { error } = await supabase
        .from("polls")
        .insert({
          title: formData.title,
          description: formData.description || null,
          options: validOptions,
          active: formData.active,
          ends_at: formData.ends_at || null,
        });

      if (error) throw error;
      toast.success("Apklausa sukurta");
      setDialogOpen(false);
      fetchPolls();
    } catch (error) {
      console.error("Error creating poll:", error);
      toast.error("Nepavyko sukurti apklausos");
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nauja apklausa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="poll-active">Aktyvuoti iš karto</Label>
                <Switch
                  id="poll-active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Atšaukti
                </Button>
                <Button type="submit">Sukurti</Button>
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
                    <CardTitle className="text-lg">{poll.title}</CardTitle>
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
