import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Users, FolderPlus, Check, X, Plus, Trash2 } from "lucide-react";

interface Resident {
  id: string;
  full_name: string;
  email: string | null;
  apartment_number: string | null;
  is_active: boolean | null;
}

interface Segment {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  member_count?: number;
}

interface SegmentMember {
  segment_id: string;
  resident_id: string;
}

interface RecipientSelectorProps {
  selectedResidentIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function RecipientSelector({ selectedResidentIds, onSelectionChange }: RecipientSelectorProps) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentMembers, setSegmentMembers] = useState<SegmentMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [manageSegmentDialogOpen, setManageSegmentDialogOpen] = useState(false);
  const [selectedSegmentForManage, setSelectedSegmentForManage] = useState<Segment | null>(null);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newSegmentDescription, setNewSegmentDescription] = useState("");
  const [newSegmentColor, setNewSegmentColor] = useState("#6366f1");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [residentsRes, segmentsRes, membersRes] = await Promise.all([
        supabase.from("residents").select("id, full_name, email, apartment_number, is_active").eq("is_active", true).order("full_name"),
        supabase.from("segments").select("*").order("name"),
        supabase.from("segment_members").select("segment_id, resident_id"),
      ]);

      if (residentsRes.error) throw residentsRes.error;
      if (segmentsRes.error) throw segmentsRes.error;
      if (membersRes.error) throw membersRes.error;

      setResidents(residentsRes.data || []);
      
      // Calculate member counts for segments
      const membersBySegment: { [key: string]: number } = {};
      (membersRes.data || []).forEach(m => {
        membersBySegment[m.segment_id] = (membersBySegment[m.segment_id] || 0) + 1;
      });
      
      const segmentsWithCounts = (segmentsRes.data || []).map(s => ({
        ...s,
        member_count: membersBySegment[s.id] || 0,
      }));
      
      setSegments(segmentsWithCounts);
      setSegmentMembers(membersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Nepavyko užkrauti duomenų");
    } finally {
      setLoading(false);
    }
  };

  const filteredResidents = residents.filter(r =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.apartment_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleResident = (residentId: string) => {
    if (selectedResidentIds.includes(residentId)) {
      onSelectionChange(selectedResidentIds.filter(id => id !== residentId));
    } else {
      onSelectionChange([...selectedResidentIds, residentId]);
    }
  };

  const selectAll = () => {
    const allIds = filteredResidents.map(r => r.id);
    const newSelection = [...new Set([...selectedResidentIds, ...allIds])];
    onSelectionChange(newSelection);
  };

  const deselectAll = () => {
    const filteredIds = new Set(filteredResidents.map(r => r.id));
    onSelectionChange(selectedResidentIds.filter(id => !filteredIds.has(id)));
  };

  const selectSegment = (segmentId: string) => {
    const segmentResidentIds = segmentMembers
      .filter(m => m.segment_id === segmentId)
      .map(m => m.resident_id);
    const newSelection = [...new Set([...selectedResidentIds, ...segmentResidentIds])];
    onSelectionChange(newSelection);
  };

  const createSegment = async () => {
    if (!newSegmentName.trim()) {
      toast.error("Įveskite segmento pavadinimą");
      return;
    }

    try {
      const { error } = await supabase.from("segments").insert({
        name: newSegmentName.trim(),
        description: newSegmentDescription.trim() || null,
        color: newSegmentColor,
      });

      if (error) throw error;
      toast.success("Segmentas sukurtas");
      setSegmentDialogOpen(false);
      setNewSegmentName("");
      setNewSegmentDescription("");
      setNewSegmentColor("#6366f1");
      fetchData();
    } catch (error) {
      console.error("Error creating segment:", error);
      toast.error("Nepavyko sukurti segmento");
    }
  };

  const deleteSegment = async (segmentId: string) => {
    try {
      const { error } = await supabase.from("segments").delete().eq("id", segmentId);
      if (error) throw error;
      toast.success("Segmentas ištrintas");
      fetchData();
    } catch (error) {
      console.error("Error deleting segment:", error);
      toast.error("Nepavyko ištrinti segmento");
    }
  };

  const openManageSegment = (segment: Segment) => {
    setSelectedSegmentForManage(segment);
    setManageSegmentDialogOpen(true);
  };

  const toggleResidentInSegment = async (residentId: string) => {
    if (!selectedSegmentForManage) return;

    const isInSegment = segmentMembers.some(
      m => m.segment_id === selectedSegmentForManage.id && m.resident_id === residentId
    );

    try {
      if (isInSegment) {
        const { error } = await supabase
          .from("segment_members")
          .delete()
          .eq("segment_id", selectedSegmentForManage.id)
          .eq("resident_id", residentId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("segment_members").insert({
          segment_id: selectedSegmentForManage.id,
          resident_id: residentId,
        });
        if (error) throw error;
      }
      fetchData();
    } catch (error) {
      console.error("Error toggling segment member:", error);
      toast.error("Nepavyko atnaujinti segmento");
    }
  };

  const colorOptions = [
    "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
  ];

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Gavėjai ({selectedResidentIds.length} pasirinkta)</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSegmentDialogOpen(true)}>
            <FolderPlus className="h-4 w-4" />
            Naujas segmentas
          </Button>
        </div>
      </div>

      <Tabs defaultValue="residents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="residents">Gyventojai</TabsTrigger>
          <TabsTrigger value="segments">Segmentai</TabsTrigger>
        </TabsList>

        <TabsContent value="residents" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ieškoti gyventojų..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={selectAll}>
              <Check className="h-4 w-4" />
              Visi
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={deselectAll}>
              <X className="h-4 w-4" />
              Atžymėti
            </Button>
          </div>

          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="space-y-1">
              {filteredResidents.map((resident) => (
                <div
                  key={resident.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => toggleResident(resident.id)}
                >
                  <Checkbox
                    checked={selectedResidentIds.includes(resident.id)}
                    onCheckedChange={() => toggleResident(resident.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{resident.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {resident.apartment_number && `But. ${resident.apartment_number}`}
                      {resident.apartment_number && resident.email && " • "}
                      {resident.email}
                    </p>
                  </div>
                </div>
              ))}
              {filteredResidents.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Gyventojų nerasta
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="segments" className="space-y-3">
          <ScrollArea className="h-[200px] border rounded-md p-2">
            <div className="space-y-2">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.color || "#6366f1" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{segment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {segment.member_count} narių
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectSegment(segment.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Pridėti
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openManageSegment(segment)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteSegment(segment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {segments.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Segmentų nėra. Sukurkite naują!
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {selectedResidentIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedResidentIds.slice(0, 5).map((id) => {
            const resident = residents.find(r => r.id === id);
            return resident ? (
              <Badge key={id} variant="secondary" className="text-xs">
                {resident.full_name}
                <button
                  type="button"
                  className="ml-1 hover:text-destructive"
                  onClick={() => toggleResident(id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null;
          })}
          {selectedResidentIds.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{selectedResidentIds.length - 5} daugiau
            </Badge>
          )}
        </div>
      )}

      {/* Create Segment Dialog */}
      <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naujas segmentas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pavadinimas</Label>
              <Input
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                placeholder="pvz. Savininkai"
              />
            </div>
            <div className="space-y-2">
              <Label>Aprašymas (neprivaloma)</Label>
              <Input
                value={newSegmentDescription}
                onChange={(e) => setNewSegmentDescription(e.target.value)}
                placeholder="Trumpas aprašymas"
              />
            </div>
            <div className="space-y-2">
              <Label>Spalva</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      newSegmentColor === color ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewSegmentColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSegmentDialogOpen(false)}>
              Atšaukti
            </Button>
            <Button type="button" onClick={createSegment}>
              Sukurti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Segment Members Dialog */}
      <Dialog open={manageSegmentDialogOpen} onOpenChange={setManageSegmentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Tvarkyti segmentą: {selectedSegmentForManage?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-1">
              {residents.map((resident) => {
                const isInSegment = segmentMembers.some(
                  m => m.segment_id === selectedSegmentForManage?.id && m.resident_id === resident.id
                );
                return (
                  <div
                    key={resident.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleResidentInSegment(resident.id)}
                  >
                    <Checkbox
                      checked={isInSegment}
                      onCheckedChange={() => toggleResidentInSegment(resident.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{resident.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {resident.apartment_number && `But. ${resident.apartment_number}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" onClick={() => setManageSegmentDialogOpen(false)}>
              Uždaryti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
