import { useEffect, useState, useRef } from "react";
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
  Calendar,
  Download,
  FileDown,
  Printer,
  Edit,
  RotateCcw,
  UploadCloud
} from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

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
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

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

  const generateWordDocument = async (): Promise<Blob> => {
    const protocolTypeTitle = pollType ? POLL_TYPE_TITLES[pollType] || "BALSAVIMAS" : "BALSAVIMAS";
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "DNSB TAURAKALNIO NAMAI, VILNIUS", bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "V. Mykolaičio-Putino g. 10, Vilnius, įst. kodas 301692533", size: 20, color: "666666" }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: protocolTypeTitle, bold: true, size: 24 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "BALSŲ SKAIČIAVIMO KOMISIJOS PROTOKOLAS", size: 22 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // Date and location
          new Paragraph({
            children: [
              new TextRun({ text: format(new Date(protocol?.protocol_date || new Date()), "yyyy 'm.' MMMM 'd.'", { locale: lt }), size: 20 }),
              new TextRun({ text: "                                                          ", size: 20 }),
              new TextRun({ text: protocol?.location || "Vilnius", size: 20 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // Sections
          new Paragraph({
            children: [
              new TextRun({ text: "1. Balsavimo organizatorius: ", bold: true, size: 24 }),
              new TextRun({ text: protocol?.organizer_name || "—", size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "2. Balsų skaičiavimo komisijos nariai: ", bold: true, size: 24 }),
              new TextRun({ text: commissionMembers || "—", size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "3. Siūlomi sprendimai:", bold: true, size: 24 }),
            ],
          }),
          ...pollOptions.map((opt) => new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: opt, size: 24 })],
          })),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "4. Įteikta (išsiųsta) biuletenių: ", bold: true, size: 24 }),
              new TextRun({ text: String(ballotsSent), size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "5. Gauta biuletenių: ", bold: true, size: 24 }),
              new TextRun({ text: String(ballotsReceived), size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "6. Išvada dėl balsavimo: ", bold: true, size: 24 }),
              new TextRun({ text: ballotsReceived > (ballotsSent / 2) ? "kvorumas yra" : "kvorumo nėra", size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "7. Balsavimo rezultatai:", bold: true, size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // Results table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nr.", bold: true, size: 22 })] })], width: { size: 8, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Klausimas", bold: true, size: 22 })] })], width: { size: 52, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Pritariu", bold: true, size: 22 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nepritariu", bold: true, size: 22 })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Iš viso", bold: true, size: 22 })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                ],
              }),
              ...pollOptions.map((option, idx) => {
                const wr = writtenResults[idx] || { approve: 0, reject: 0 };
                const lr = liveResults[idx] || { approve: 0, reject: 0 };
                const totalApprove = wr.approve + lr.approve;
                const totalReject = wr.reject + lr.reject;
                return new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1), size: 22 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: option, size: 22 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(totalApprove), size: 22 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(totalReject), size: 22 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(totalApprove + totalReject), size: 22 })] })] }),
                  ],
                });
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "8. Sprendimai:", bold: true, size: 24 }),
            ],
          }),
          ...pollOptions.flatMap((option, idx) => [
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({ text: `${idx + 1}. ${option}`, bold: true, size: 24 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: decisions[idx] || "Sprendimas nepateiktas", size: 24 }),
              ],
            }),
          ]),
          new Paragraph({ text: "" }),
          
          ...(quorumInfo ? [
            new Paragraph({
              children: [
                new TextRun({ text: "Pastabos: ", bold: true, size: 24 }),
                new TextRun({ text: quorumInfo, size: 24 }),
              ],
            }),
            new Paragraph({ text: "" }),
          ] : []),
          
          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),
          
          // Signature
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "Komisijos pirmininkas: ", bold: true, size: 24 }),
              new TextRun({ text: commissionChairman || "—", size: 24 }),
            ],
          }),
        ],
      }],
    });

    return await Packer.toBlob(doc);
  };

  const uploadProtocolToDocuments = async (userId: string) => {
    if (!protocol) throw new Error("Nėra protokolo duomenų");

    console.log("Starting Word document generation...");
    const docBlob = await generateWordDocument();
    console.log("Word document generated, size:", docBlob.size);

    const protocolDate = format(new Date(protocol.protocol_date), "yyyy-MM-dd");
    
    // Sanitize filename for storage - replace Lithuanian characters and special chars
    const sanitizedTitle = pollTitle
      .replace(/ą/g, "a").replace(/Ą/g, "A")
      .replace(/č/g, "c").replace(/Č/g, "C")
      .replace(/ę/g, "e").replace(/Ę/g, "E")
      .replace(/ė/g, "e").replace(/Ė/g, "E")
      .replace(/į/g, "i").replace(/Į/g, "I")
      .replace(/š/g, "s").replace(/Š/g, "S")
      .replace(/ų/g, "u").replace(/Ų/g, "U")
      .replace(/ū/g, "u").replace(/Ū/g, "U")
      .replace(/ž/g, "z").replace(/Ž/g, "Z")
      .replace(/[^a-zA-Z0-9]/g, "_");
    
    const fileName = `Protokolas_${protocolDate}_${sanitizedTitle}.docx`;
    const contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const fileToUpload = new File([docBlob], fileName, { type: contentType });
    const storagePath = `protocols/${protocol.id}/${fileName}`;

    console.log("Uploading to storage:", storagePath);
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, fileToUpload, { contentType, upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath);

    const basePayload = {
      title: `Balsavimo protokolas - ${pollTitle}`,
      description: `Protokolo data: ${format(new Date(protocol.protocol_date), "yyyy-MM-dd")}. Laukiama el. parašo.`,
      file_name: fileName,
      file_url: urlData.publicUrl,
      file_size: docBlob.size,
      category: "protokolai",
      uploaded_by: userId,
      visible: false,
      signed: false,
    };

    // Avoid duplicates: update existing row if same file_url already exists
    const { data: existing, error: existingError } = await supabase
      .from("documents")
      .select("id")
      .eq("file_url", urlData.publicUrl)
      .maybeSingle();

    if (existingError) {
      console.warn("Could not check existing document:", existingError);
    }

    if (existing?.id) {
      const { error: updateError } = await supabase.from("documents").update(basePayload).eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("documents").insert(basePayload);
      if (insertError) throw insertError;
    }
  };

  const approveProtocol = async () => {
    if (!protocol) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Turite būti prisijungęs, kad galėtumėte patvirtinti protokolą");
        return;
      }

      // First, update protocol status
      const { error: updateError } = await supabase
        .from("poll_protocols")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          decisions: decisions,
          quorum_info: quorumInfo,
          has_quorum: ballotsReceived > (ballotsSent / 2),
        })
        .eq("id", protocol.id);

      if (updateError) {
        console.error("Error updating protocol status:", updateError);
        throw updateError;
      }

      // Try to generate/upload and create a Documents entry (non-critical)
      try {
        await uploadProtocolToDocuments(user.id);
      } catch (docError) {
        console.error("Could not generate/upload protocol into Documents:", docError);
        // Continue - protocol is already approved
      }

      toast.success("Protokolas patvirtintas!");
      setStep("approved");
      setProtocol({ ...protocol, status: "approved", approved_by: user.id, approved_at: new Date().toISOString() });
      onProtocolUpdated?.();
    } catch (error) {
      console.error("Error approving protocol:", error);
      toast.error("Nepavyko patvirtinti protokolo");
    } finally {
      setSaving(false);
    }
  };
  const syncApprovedProtocolToDocuments = async () => {
    if (!protocol) {
      toast.error("Nėra protokolo duomenų");
      return;
    }

    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("Auth error:", authError);
        toast.error("Autentifikacijos klaida: " + authError.message);
        return;
      }
      
      if (!user) {
        toast.error("Turite būti prisijungęs, kad galėtumėte įkelti protokolą");
        return;
      }

      console.log("Starting sync for protocol:", protocol.id);
      await uploadProtocolToDocuments(user.id);
      toast.success("Protokolas sėkmingai įkeltas į Dokumentus");
    } catch (error: any) {
      console.error("Error syncing protocol into Documents:", error);
      const errorMessage = error?.message || error?.error_description || "Nežinoma klaida";
      toast.error("Nepavyko įkelti: " + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const revokeApproval = async () => {
    if (!protocol) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("poll_protocols")
        .update({
          status: "pending_approval",
          approved_by: null,
          approved_at: null,
        })
        .eq("id", protocol.id);

      if (error) throw error;

      setProtocol({
        ...protocol,
        status: "pending_approval",
        approved_by: null,
        approved_at: null,
      });
      
      toast.success("Protokolo patvirtinimas atšauktas");
      setStep("preview");
      setShowRevokeConfirm(false);
      onProtocolUpdated?.();
    } catch (error) {
      console.error("Error revoking protocol approval:", error);
      toast.error("Nepavyko atšaukti patvirtinimo");
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

    </div>
  );

  const renderWrittenResultsFooter = () => (
    <DialogFooter className="flex-shrink-0 border-t pt-4">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Atšaukti
      </Button>
      <Button onClick={saveWrittenResults} disabled={saving}>
        {saving ? "Saugoma..." : "Išsaugoti ir tęsti"}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </DialogFooter>
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

    </div>
  );

  const renderLiveResultsFooter = () => (
    <DialogFooter className="flex-shrink-0 border-t pt-4">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Atšaukti
      </Button>
      <Button onClick={saveLiveResults} disabled={saving}>
        {saving ? "Saugoma..." : "Išsaugoti ir peržiūrėti"}
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </DialogFooter>
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
      </div>
    );
  };

  const renderPreviewFooter = () => (
    <DialogFooter className="flex-shrink-0 border-t pt-4">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Uždaryti
      </Button>
      <Button onClick={approveProtocol} disabled={saving}>
        {saving ? "Tvirtinama..." : "Patvirtinti protokolą"}
        <Check className="h-4 w-4 ml-1" />
      </Button>
    </DialogFooter>
  );

  const exportToPdf = () => {
    const protocolTypeTitle = pollType ? POLL_TYPE_TITLES[pollType] || "BALSAVIMAS" : "BALSAVIMAS";
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Protokolas - ${pollTitle}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; padding: 40px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 14pt; margin: 0; }
          .header p { font-size: 10pt; color: #666; margin: 5px 0; }
          .title { text-align: center; margin: 30px 0; }
          .title h2 { font-size: 12pt; margin: 0; font-weight: bold; }
          .title h3 { font-size: 11pt; margin: 5px 0; }
          .date-location { display: flex; justify-content: space-between; margin: 20px 0; font-size: 10pt; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; }
          ul { margin: 10px 0; padding-left: 20px; }
          .results-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .results-table th, .results-table td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 11pt; }
          .results-table th { background: #f0f0f0; }
          .signature { text-align: right; margin-top: 40px; }
          .decision-box { border: 1px solid #ccc; padding: 10px; margin: 10px 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DNSB TAURAKALNIO NAMAI, VILNIUS</h1>
          <p>V. Mykolaičio-Putino g. 10, Vilnius, įst. kodas 301692533</p>
        </div>
        
        <div class="title">
          <h2>${protocolTypeTitle}</h2>
          <h3>BALSŲ SKAIČIAVIMO KOMISIJOS PROTOKOLAS</h3>
        </div>
        
        <div class="date-location">
          <span>${format(new Date(protocol?.protocol_date || new Date()), "yyyy 'm.' MMMM 'd.'", { locale: lt })}</span>
          <span>${protocol?.location || "Vilnius"}</span>
        </div>
        
        <div class="section">
          <p><span class="section-title">1. Balsavimo organizatorius:</span> ${protocol?.organizer_name || "—"}</p>
        </div>
        
        <div class="section">
          <p><span class="section-title">2. Balsų skaičiavimo komisijos nariai:</span> ${commissionMembers || "—"}</p>
        </div>
        
        <div class="section">
          <p><span class="section-title">3. Siūlomi sprendimai:</span></p>
          <ul>
            ${pollOptions.map((opt, idx) => `<li>${opt}</li>`).join("")}
          </ul>
        </div>
        
        <div class="section">
          <p><span class="section-title">4. Įteikta (išsiųsta) biuletenių:</span> ${ballotsSent}</p>
        </div>
        
        <div class="section">
          <p><span class="section-title">5. Gauta biuletenių:</span> ${ballotsReceived}</p>
        </div>
        
        <div class="section">
          <p><span class="section-title">6. Išvada dėl balsavimo:</span> ${ballotsReceived > (ballotsSent / 2) ? "kvorumas yra" : "kvorumo nėra"}</p>
        </div>
        
        <div class="section">
          <p><span class="section-title">7. Balsavimo rezultatai:</span></p>
          <table class="results-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Klausimas</th>
                <th>Pritariu</th>
                <th>Nepritariu</th>
                <th>Iš viso</th>
              </tr>
            </thead>
            <tbody>
              ${pollOptions.map((option, idx) => {
                const wr = writtenResults[idx] || { approve: 0, reject: 0 };
                const lr = liveResults[idx] || { approve: 0, reject: 0 };
                const totalApprove = wr.approve + lr.approve;
                const totalReject = wr.reject + lr.reject;
                return `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${option}</td>
                    <td>${totalApprove}</td>
                    <td>${totalReject}</td>
                    <td>${totalApprove + totalReject}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <p><span class="section-title">8. Sprendimai:</span></p>
          ${pollOptions.map((option, idx) => `
            <div class="decision-box">
              <p><strong>${idx + 1}. ${option}</strong></p>
              <p>${decisions[idx] || "Sprendimas nepateiktas"}</p>
            </div>
          `).join("")}
        </div>
        
        ${quorumInfo ? `
          <div class="section">
            <p><span class="section-title">Pastabos:</span> ${quorumInfo}</p>
          </div>
        ` : ""}
        
        <div class="signature">
          <p><strong>Komisijos pirmininkas:</strong> ${commissionChairman || "—"}</p>
        </div>
      </body>
      </html>
    `;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    toast.success("PDF spausdinimo langas atidarytas");
  };

  const exportToWord = async () => {
    try {
      const blob = await generateWordDocument();
      const fileName = `Protokolas_${pollTitle.replace(/[^a-zA-Z0-9ąčęėįšųūžĄČĘĖĮŠŲŪŽ]/g, "_")}.docx`;
      saveAs(blob, fileName);
      toast.success("Word dokumentas atsisiųstas");
    } catch (error) {
      console.error("Error exporting to Word:", error);
      toast.error("Nepavyko eksportuoti į Word");
    }
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

      <div className="flex justify-center gap-3 flex-wrap">
        <Button onClick={syncApprovedProtocolToDocuments} disabled={saving}>
          <UploadCloud className="h-4 w-4 mr-2" />
          Įkelti į Dokumentus
        </Button>
        <Button variant="outline" onClick={exportToPdf}>
          <Printer className="h-4 w-4 mr-2" />
          Spausdinti / PDF
        </Button>
        <Button variant="outline" onClick={exportToWord}>
          <FileDown className="h-4 w-4 mr-2" />
          Atsisiųsti Word
        </Button>
      </div>

      <div className="flex justify-center">
        <Button 
          variant="ghost" 
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setShowRevokeConfirm(true)}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Atšaukti patvirtinimą ir redaguoti
        </Button>
      </div>
      
    </div>
  );

  const renderApprovedFooter = () => (
    <DialogFooter className="flex-shrink-0 border-t pt-4">
      <Button onClick={() => onOpenChange(false)}>
        Uždaryti
      </Button>
    </DialogFooter>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle>Balsavimo protokolas</DialogTitle>
              {getStatusBadge()}
            </div>
            <DialogDescription>{pollTitle}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
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
                {step === "ask_written" && !showAskWritten && (
                  <div className="py-8 space-y-4">
                    <p className="text-center text-muted-foreground">Pasirinkite ar norite suvesti balsavimo raštu rezultatus</p>
                    <div className="flex justify-center gap-4">
                      <Button variant="outline" onClick={() => handleWrittenAnswer(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Ne, praleisti
                      </Button>
                      <Button onClick={() => handleWrittenAnswer(true)}>
                        <Check className="h-4 w-4 mr-1" />
                        Taip, suvesti
                      </Button>
                    </div>
                  </div>
                )}
                {step === "ask_live" && !showAskLive && (
                  <div className="py-8 space-y-4">
                    <p className="text-center text-muted-foreground">Pasirinkite ar norite suvesti gyvo susirinkimo balsavimo rezultatus</p>
                    <div className="flex justify-center gap-4">
                      <Button variant="outline" onClick={() => handleLiveAnswer(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Ne, praleisti
                      </Button>
                      <Button onClick={() => handleLiveAnswer(true)}>
                        <Check className="h-4 w-4 mr-1" />
                        Taip, suvesti
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </ScrollArea>

          {/* Footer buttons outside ScrollArea for visibility */}
          {!loading && step === "written_results" && renderWrittenResultsFooter()}
          {!loading && step === "live_results" && renderLiveResultsFooter()}
          {!loading && step === "preview" && renderPreviewFooter()}
          {!loading && step === "approved" && renderApprovedFooter()}
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

      {/* Revoke Approval Confirmation Dialog */}
      <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Atšaukti patvirtinimą
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite atšaukti protokolo patvirtinimą? Protokolas bus grąžintas į redagavimo būseną ir turėsite jį patvirtinti iš naujo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Atšaukti
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={revokeApproval}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Atšaukiama..." : "Taip, atšaukti patvirtinimą"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
