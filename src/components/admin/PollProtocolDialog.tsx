import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { 
  FileText, 
  Check, 
  X, 
  ChevronRight, 
  ClipboardList,
  Users,
  Building2,
  Calendar
} from "lucide-react";

const POLL_TYPE_TITLES: Record<string, string> = {
  owners_vote: "VISŲ SAVININKŲ BALSAVIMAS RAŠTU",
  members_vote: "BENDRIJOS NARIŲ BALSAVIMAS RAŠTU",
  opinion_form: "IŠ ANKSTO RAŠTU TEIKIAMOS NUOMONĖS BLANKAS",
  simple_survey: "PAPRASTA APKLAUSA",
  board_vote: "VALDYBOS NARIŲ BALSAVIMAS RAŠTU",
};

interface PollProtocolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pollId: string | null;
  pollTitle: string;
  pollType: string | null;
  pollOptions: string[];
  onProtocolUpdated?: () => void;
}

interface Protocol {
  id: string;
  poll_id: string;
  status: string;
  protocol_number: string | null;
  protocol_date: string;
  meeting_date: string | null;
  location: string | null;
  organizer_name: string | null;
  organizer_address: string | null;
  commission_members: string[];
  ballots_sent: number;
  ballots_received: number;
  has_quorum: boolean;
  quorum_info: string | null;
  written_results: Record<string, { approve: number; reject: number }>;
  live_results: Record<string, { approve: number; reject: number }>;
  decisions: string[];
  commission_chairman: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

type Step = "ask_written" | "written_results" | "ask_live" | "live_results" | "preview" | "approved";

export function PollProtocolDialog({
  open,
  onOpenChange,
  pollId,
  pollTitle,
  pollType,
  pollOptions,
  onProtocolUpdated,
}: PollProtocolDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [step, setStep] = useState<Step>("ask_written");
  const [showAskWritten, setShowAskWritten] = useState(false);
  const [showAskLive, setShowAskLive] = useState(false);

  // Form data
  const [writtenResults, setWrittenResults] = useState<Record<number, { approve: number; reject: number }>>({});
  const [liveResults, setLiveResults] = useState<Record<number, { approve: number; reject: number }>>({});
  const [commissionMembers, setCommissionMembers] = useState<string>("");
  const [commissionChairman, setCommissionChairman] = useState<string>("");
  const [ballotsSent, setBallotsSent] = useState<number>(0);
  const [ballotsReceived, setBallotsReceived] = useState<number>(0);
  const [quorumInfo, setQuorumInfo] = useState<string>("");
  const [decisions, setDecisions] = useState<string[]>([]);

  useEffect(() => {
    if (open && pollId) {
      fetchOrCreateProtocol();
    }
  }, [open, pollId]);

  const fetchOrCreateProtocol = async () => {
    if (!pollId) return;
    
    setLoading(true);
    try {
      // Check if protocol exists
      const { data: existing, error: fetchError } = await supabase
        .from("poll_protocols")
        .select("*")
        .eq("poll_id", pollId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        const proto = {
          ...existing,
          commission_members: Array.isArray(existing.commission_members) 
            ? existing.commission_members.map(String) 
            : [],
          written_results: (existing.written_results as Record<string, { approve: number; reject: number }>) || {},
          live_results: (existing.live_results as Record<string, { approve: number; reject: number }>) || {},
          decisions: Array.isArray(existing.decisions) 
            ? existing.decisions.map(String) 
            : [],
        };
        setProtocol(proto);
        loadFormData(proto);
        determineStep(proto);
      } else {
        // Create new protocol draft
        const { data: newProtocol, error: createError } = await supabase
          .from("poll_protocols")
          .insert({
            poll_id: pollId,
            status: "draft",
            organizer_name: "Bendrijos Pirmininkas",
            organizer_address: "V. Mykolaičio-Putino g. 10, Vilnius",
          })
          .select()
          .single();

        if (createError) throw createError;

        const proto = {
          ...newProtocol,
          commission_members: [],
          written_results: {},
          live_results: {},
          decisions: [],
        };
        setProtocol(proto);
        initializeFormData();
        setStep("ask_written");
        setShowAskWritten(true);
      }
    } catch (error) {
      console.error("Error fetching protocol:", error);
      toast.error("Nepavyko užkrauti protokolo");
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = (proto: Protocol) => {
    setCommissionMembers(proto.commission_members.join(", "));
    setCommissionChairman(proto.commission_chairman || "");
    setBallotsSent(proto.ballots_sent);
    setBallotsReceived(proto.ballots_received);
    setQuorumInfo(proto.quorum_info || "");
    setDecisions(proto.decisions.length > 0 ? proto.decisions : pollOptions.map(() => ""));

    // Convert written results
    const wr: Record<number, { approve: number; reject: number }> = {};
    Object.entries(proto.written_results).forEach(([key, val]) => {
      wr[parseInt(key)] = val;
    });
    setWrittenResults(wr);

    // Convert live results
    const lr: Record<number, { approve: number; reject: number }> = {};
    Object.entries(proto.live_results).forEach(([key, val]) => {
      lr[parseInt(key)] = val;
    });
    setLiveResults(lr);
  };

  const initializeFormData = () => {
    setCommissionMembers("");
    setCommissionChairman("");
    setBallotsSent(0);
    setBallotsReceived(0);
    setQuorumInfo("");
    setWrittenResults({});
    setLiveResults({});
    setDecisions(pollOptions.map(() => ""));
  };

  const determineStep = (proto: Protocol) => {
    switch (proto.status) {
      case "draft":
        setStep("ask_written");
        setShowAskWritten(true);
        break;
      case "pending_written_results":
        setStep("written_results");
        break;
      case "pending_live_results":
        setStep("live_results");
        break;
      case "pending_approval":
        setStep("preview");
        break;
      case "approved":
        setStep("approved");
        break;
      default:
        setStep("ask_written");
        setShowAskWritten(true);
    }
  };

  const handleWrittenAnswer = async (wantWritten: boolean) => {
    setShowAskWritten(false);
    if (wantWritten) {
      await updateProtocolStatus("pending_written_results");
      setStep("written_results");
    } else {
      setStep("ask_live");
      setShowAskLive(true);
    }
  };

  const handleLiveAnswer = async (wantLive: boolean) => {
    setShowAskLive(false);
    if (wantLive) {
      await updateProtocolStatus("pending_live_results");
      setStep("live_results");
    } else {
      await updateProtocolStatus("pending_approval");
      setStep("preview");
    }
  };

  const updateProtocolStatus = async (status: string) => {
    if (!protocol) return;
    
    try {
      const { error } = await supabase
        .from("poll_protocols")
        .update({ status })
        .eq("id", protocol.id);

      if (error) throw error;
      setProtocol({ ...protocol, status });
    } catch (error) {
      console.error("Error updating protocol status:", error);
    }
  };

  const saveWrittenResults = async () => {
    if (!protocol) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("poll_protocols")
        .update({
          written_results: writtenResults,
          commission_members: commissionMembers.split(",").map(s => s.trim()).filter(Boolean),
          commission_chairman: commissionChairman,
          ballots_sent: ballotsSent,
          ballots_received: ballotsReceived,
          status: "pending_live_results",
        })
        .eq("id", protocol.id);

      if (error) throw error;

      toast.success("Balsavimo raštu rezultatai išsaugoti");
      setStep("ask_live");
      setShowAskLive(true);
    } catch (error) {
      console.error("Error saving written results:", error);
      toast.error("Nepavyko išsaugoti rezultatų");
    } finally {
      setSaving(false);
    }
  };

  const saveLiveResults = async () => {
    if (!protocol) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("poll_protocols")
        .update({
          live_results: liveResults,
          status: "pending_approval",
        })
        .eq("id", protocol.id);

      if (error) throw error;

      toast.success("Gyvo balsavimo rezultatai išsaugoti");
      setStep("preview");
    } catch (error) {
      console.error("Error saving live results:", error);
      toast.error("Nepavyko išsaugoti rezultatų");
    } finally {
      setSaving(false);
    }
  };

  const approveProtocol = async () => {
    if (!protocol) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("poll_protocols")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          decisions: decisions,
          quorum_info: quorumInfo,
          has_quorum: ballotsReceived > (ballotsSent / 2),
        })
        .eq("id", protocol.id);

      if (error) throw error;

      toast.success("Protokolas patvirtintas!");
      setStep("approved");
      onProtocolUpdated?.();
    } catch (error) {
      console.error("Error approving protocol:", error);
      toast.error("Nepavyko patvirtinti protokolo");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = () => {
    if (!protocol) return null;
    
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      draft: { label: "Juodraštis", variant: "secondary" },
      pending_written_results: { label: "Laukia raštu rezultatų", variant: "outline" },
      pending_live_results: { label: "Laukia gyvo balsavimo", variant: "outline" },
      pending_approval: { label: "Laukia patvirtinimo", variant: "outline" },
      approved: { label: "Patvirtintas", variant: "default" },
    };
    
    const status = statusMap[protocol.status] || { label: protocol.status, variant: "secondary" as const };
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  const renderWrittenResultsForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Komisijos nariai (atskirti kableliais)</Label>
          <Input
            value={commissionMembers}
            onChange={(e) => setCommissionMembers(e.target.value)}
            placeholder="Jonas Jonaitis, Petras Petraitis"
          />
        </div>
        <div className="space-y-2">
          <Label>Komisijos pirmininkas</Label>
          <Input
            value={commissionChairman}
            onChange={(e) => setCommissionChairman(e.target.value)}
            placeholder="Bendrijos Pirmininkas"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Išsiųsta biuletenių</Label>
          <Input
            type="number"
            value={ballotsSent}
            onChange={(e) => setBallotsSent(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label>Gauta biuletenių</Label>
          <Input
            type="number"
            value={ballotsReceived}
            onChange={(e) => setBallotsReceived(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Balsavimo rezultatai pagal klausimus</h4>
        {pollOptions.map((option, idx) => (
          <div key={idx} className="p-4 border rounded-lg space-y-3">
            <p className="font-medium text-sm">{idx + 1}. {option}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pritariu</Label>
                <Input
                  type="number"
                  value={writtenResults[idx]?.approve || 0}
                  onChange={(e) => setWrittenResults({
                    ...writtenResults,
                    [idx]: { 
                      approve: parseInt(e.target.value) || 0, 
                      reject: writtenResults[idx]?.reject || 0 
                    }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nepritariu</Label>
                <Input
                  type="number"
                  value={writtenResults[idx]?.reject || 0}
                  onChange={(e) => setWrittenResults({
                    ...writtenResults,
                    [idx]: { 
                      approve: writtenResults[idx]?.approve || 0, 
                      reject: parseInt(e.target.value) || 0 
                    }
                  })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Atšaukti
        </Button>
        <Button onClick={saveWrittenResults} disabled={saving}>
          {saving ? "Saugoma..." : "Išsaugoti ir tęsti"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </DialogFooter>
    </div>
  );

  const renderLiveResultsForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium">Gyvo susirinkimo balsavimo rezultatai</h4>
        {pollOptions.map((option, idx) => (
          <div key={idx} className="p-4 border rounded-lg space-y-3">
            <p className="font-medium text-sm">{idx + 1}. {option}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Pritariu</Label>
                <Input
                  type="number"
                  value={liveResults[idx]?.approve || 0}
                  onChange={(e) => setLiveResults({
                    ...liveResults,
                    [idx]: { 
                      approve: parseInt(e.target.value) || 0, 
                      reject: liveResults[idx]?.reject || 0 
                    }
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nepritariu</Label>
                <Input
                  type="number"
                  value={liveResults[idx]?.reject || 0}
                  onChange={(e) => setLiveResults({
                    ...liveResults,
                    [idx]: { 
                      approve: liveResults[idx]?.approve || 0, 
                      reject: parseInt(e.target.value) || 0 
                    }
                  })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Atšaukti
        </Button>
        <Button onClick={saveLiveResults} disabled={saving}>
          {saving ? "Saugoma..." : "Išsaugoti ir peržiūrėti"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </DialogFooter>
    </div>
  );

  const renderPreview = () => {
    const protocolTypeTitle = pollType ? POLL_TYPE_TITLES[pollType] || "BALSAVIMAS" : "BALSAVIMAS";
    
    return (
      <div className="space-y-6">
        <div className="bg-muted/50 p-6 rounded-lg space-y-4 text-sm">
          <div className="text-center space-y-2">
            <h3 className="font-bold">DNSB TAURAKALNIO NAMAI, VILNIUS</h3>
            <p className="text-xs text-muted-foreground">
              V. Mykolaičio-Putino g. 10, Vilnius, įst. kodas 301692533
            </p>
          </div>

          <Separator />

          <div className="text-center">
            <h4 className="font-bold">{protocolTypeTitle}</h4>
            <p className="text-muted-foreground">BALSŲ SKAIČIAVIMO KOMISIJOS PROTOKOLAS</p>
          </div>

          <div className="flex justify-between text-xs">
            <span>{format(new Date(), "yyyy 'm.' MMMM 'd.'", { locale: lt })}</span>
            <span>{protocol?.location || "Vilnius"}</span>
          </div>

          <Separator />

          <div className="space-y-2">
            <p><strong>1. Balsavimo organizatorius:</strong> {protocol?.organizer_name}</p>
            <p><strong>2. Balsų skaičiavimo komisijos nariai:</strong> {commissionMembers || "—"}</p>
            <p><strong>3. Siūlomi sprendimai:</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              {pollOptions.map((opt, idx) => (
                <li key={idx}>{opt}</li>
              ))}
            </ul>
            <p><strong>4. Įteikta (išsiųsta) biuletenių:</strong> {ballotsSent}</p>
            <p><strong>5. Gauta biuletenių:</strong> {ballotsReceived}</p>
            <p><strong>6. Išvada dėl balsavimo:</strong> {ballotsReceived > (ballotsSent / 2) ? "kvorumas yra" : "kvorumo nėra"}</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <p><strong>7. Balsavimo rezultatai:</strong></p>
            {pollOptions.map((option, idx) => {
              const wr = writtenResults[idx] || { approve: 0, reject: 0 };
              const lr = liveResults[idx] || { approve: 0, reject: 0 };
              const totalApprove = wr.approve + lr.approve;
              const totalReject = wr.reject + lr.reject;
              
              return (
                <div key={idx} className="p-3 border rounded">
                  <p className="font-medium mb-2">{idx + 1}. {option}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between px-2 py-1 bg-green-50 dark:bg-green-950 rounded">
                      <span>Pritariu:</span>
                      <span className="font-medium">{totalApprove}</span>
                    </div>
                    <div className="flex justify-between px-2 py-1 bg-red-50 dark:bg-red-950 rounded">
                      <span>Nepritariu:</span>
                      <span className="font-medium">{totalReject}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label>Sprendimai (kiekvienam klausimui)</Label>
            {pollOptions.map((option, idx) => (
              <div key={idx} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{idx + 1}. {option}</Label>
                <Textarea
                  value={decisions[idx] || ""}
                  onChange={(e) => {
                    const newDecisions = [...decisions];
                    newDecisions[idx] = e.target.value;
                    setDecisions(newDecisions);
                  }}
                  placeholder="Įveskite sprendimą..."
                  rows={2}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Kvorumo informacija / pastabos</Label>
            <Textarea
              value={quorumInfo}
              onChange={(e) => setQuorumInfo(e.target.value)}
              placeholder="Pvz.: Sprendimo priimti negalima, nes nėra kvorumo."
              rows={2}
            />
          </div>

          <Separator />

          <p className="text-right"><strong>Komisijos pirmininkas:</strong> {commissionChairman || "—"}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Uždaryti
          </Button>
          <Button onClick={approveProtocol} disabled={saving}>
            {saving ? "Tvirtinama..." : "Patvirtinti protokolą"}
            <Check className="h-4 w-4 ml-1" />
          </Button>
        </DialogFooter>
      </div>
    );
  };

  const renderApproved = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Protokolas patvirtintas</h3>
        <p className="text-muted-foreground">
          Protokolas buvo patvirtintas {protocol?.approved_at && format(new Date(protocol.approved_at), "yyyy-MM-dd HH:mm", { locale: lt })}
        </p>
      </div>
      
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>
          Uždaryti
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle>Balsavimo protokolas</DialogTitle>
              {getStatusBadge()}
            </div>
            <DialogDescription>{pollTitle}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {loading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                {step === "written_results" && renderWrittenResultsForm()}
                {step === "live_results" && renderLiveResultsForm()}
                {step === "preview" && renderPreview()}
                {step === "approved" && renderApproved()}
                {(step === "ask_written" || step === "ask_live") && !showAskWritten && !showAskLive && (
                  <div className="py-8 text-center text-muted-foreground">
                    Palaukite...
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Ask Written Results Dialog */}
      <AlertDialog open={showAskWritten} onOpenChange={setShowAskWritten}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Balsavimo raštu rezultatai
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ar norite suvesti balsavimo raštu rezultatus?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleWrittenAnswer(false)}>
              <X className="h-4 w-4 mr-1" />
              Ne
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleWrittenAnswer(true)}>
              <Check className="h-4 w-4 mr-1" />
              Taip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ask Live Results Dialog */}
      <AlertDialog open={showAskLive} onOpenChange={setShowAskLive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gyvo susirinkimo rezultatai
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ar norite suvesti gyvo susirinkimo balsavimo rezultatus?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleLiveAnswer(false)}>
              <X className="h-4 w-4 mr-1" />
              Ne
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleLiveAnswer(true)}>
              <Check className="h-4 w-4 mr-1" />
              Taip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
