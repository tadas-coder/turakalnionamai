import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  FolderTree,
  Wallet,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Upload,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import * as XLSX from "xlsx";

type CostCategory = Tables<"cost_categories">;

interface CategoryWithChildren extends CostCategory {
  children?: CategoryWithChildren[];
  level?: number;
  spent?: number;
}

export function AdminCostCategories() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CostCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ code: string; name: string; budget: number | null; parentCode?: string }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    parent_id: "",
    budget_monthly: "",
    is_active: true,
  });

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["cost-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as CostCategory[];
    },
  });

  // Fetch spending data from vendor_invoice_items
  const { data: spendingData = [] } = useQuery({
    queryKey: ["category-spending"],
    queryFn: async () => {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data, error } = await supabase
        .from("vendor_invoice_items")
        .select(`
          total_price,
          vendor_invoices!inner(invoice_date)
        `)
        .gte("vendor_invoices.invoice_date", startOfMonth.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data;
    },
  });

  // Build hierarchical structure
  const buildCategoryTree = (categories: CostCategory[]): CategoryWithChildren[] => {
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create map of all categories
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [], level: 0 });
    });

    // Second pass: build tree
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        const parent = categoryMap.get(cat.parent_id)!;
        category.level = (parent.level || 0) + 1;
        parent.children!.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  };

  // Flatten tree for display
  const flattenTree = (tree: CategoryWithChildren[], result: CategoryWithChildren[] = []): CategoryWithChildren[] => {
    tree.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0 && expandedCategories.has(node.id)) {
        flattenTree(node.children, result);
      }
    });
    return result;
  };

  const categoryTree = buildCategoryTree(categories);
  const flatCategories = flattenTree(categoryTree);

  // Filter categories
  const filteredCategories = flatCategories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get root categories for parent selection
  const getRootCategories = (): CostCategory[] => {
    return categories.filter((cat) => !cat.parent_id);
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const categoryData = {
        name: data.name,
        description: data.description || null,
        code: data.code || null,
        parent_id: data.parent_id || null,
        budget_monthly: data.budget_monthly ? parseFloat(data.budget_monthly) : null,
        is_active: data.is_active,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("cost_categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cost_categories")
          .insert(categoryData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
      toast.success(editingCategory ? "Kategorija atnaujinta" : "Kategorija sukurta");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error("Klaida: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cost_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
      toast.success("Kategorija ištrinta");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast.error("Klaida: " + error.message);
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      code: "",
      parent_id: "",
      budget_monthly: "",
      is_active: true,
    });
  };

  const handleEdit = (category: CostCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      code: category.code || "",
      parent_id: category.parent_id || "",
      budget_monthly: category.budget_monthly?.toString() || "",
      is_active: category.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (category: CostCategory) => {
    // Check if category has children
    const hasChildren = categories.some((cat) => cat.parent_id === category.id);
    if (hasChildren) {
      toast.error("Negalima ištrinti kategorijos, kuri turi subkategorijas");
      return;
    }
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const hasChildren = (categoryId: string) => {
    return categories.some((cat) => cat.parent_id === categoryId);
  };

  // Calculate statistics
  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.is_active).length;
  const totalBudget = categories.reduce((sum, c) => sum + (c.budget_monthly || 0), 0);
  const categoriesWithBudget = categories.filter((c) => c.budget_monthly && c.budget_monthly > 0).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Įveskite kategorijos pavadinimą");
      return;
    }
    saveMutation.mutate(formData);
  };

  // Excel/File import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as (string | number | null)[][];

      // Parse the data - look for columns with code, name, budget
      const parsed: Array<{ code: string; name: string; budget: number | null; parentCode?: string }> = [];
      
      // Skip header row if exists
      const startRow = jsonData[0]?.some(cell => 
        typeof cell === 'string' && (
          cell.toLowerCase().includes('kodas') || 
          cell.toLowerCase().includes('pavadinimas') ||
          cell.toLowerCase().includes('code') ||
          cell.toLowerCase().includes('name')
        )
      ) ? 1 : 0;

      for (let i = startRow; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        // Try to find code (T1, T2, etc.) and name
        let code = '';
        let name = '';
        let budget: number | null = null;

        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          if (cell === null || cell === undefined || cell === '') continue;

          const cellStr = String(cell).trim();
          
          // Check if it's a code like T1, T2, T1-1, etc.
          if (/^T\d+(-\d+)?$/i.test(cellStr)) {
            code = cellStr.toUpperCase();
          }
          // Check if it's a budget number
          else if (typeof cell === 'number' || /^\d+([.,]\d+)?(\s*€)?$/.test(cellStr.replace(/\s/g, ''))) {
            const numStr = cellStr.replace(/[€\s]/g, '').replace(',', '.');
            const num = parseFloat(numStr);
            if (!isNaN(num) && num > 0) {
              budget = num;
            }
          }
          // Otherwise it's likely the name
          else if (cellStr.length > 2 && !name) {
            name = cellStr;
          }
        }

        if (name) {
          // Determine parent code from code pattern (e.g., T1-1 -> T1)
          let parentCode: string | undefined;
          if (code && code.includes('-')) {
            parentCode = code.split('-')[0];
          }
          parsed.push({ code, name, budget, parentCode });
        }
      }

      if (parsed.length === 0) {
        toast.error("Nepavyko rasti kategorijų duomenų faile");
        return;
      }

      setImportPreview(parsed);
      setImportDialogOpen(true);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Klaida skaitant failą");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (importPreview.length === 0) return;

    setIsImporting(true);
    try {
      // If replacing, delete existing categories that aren't referenced
      if (replaceExisting) {
        // Get categories that can be safely deleted (not referenced by invoices)
        const { data: referencedCategories } = await supabase
          .from("vendor_invoices")
          .select("cost_category_id")
          .not("cost_category_id", "is", null);
        
        const referencedIds = new Set((referencedCategories || []).map(r => r.cost_category_id));
        
        // Delete non-referenced categories
        const { data: allCategories } = await supabase
          .from("cost_categories")
          .select("id");
        
        const toDelete = (allCategories || [])
          .filter(c => !referencedIds.has(c.id))
          .map(c => c.id);
        
        if (toDelete.length > 0) {
          await supabase.from("cost_categories").delete().in("id", toDelete);
        }
      }

      // First, insert parent categories (those without parentCode)
      const parentCategories = importPreview.filter(item => !item.parentCode);
      const childCategories = importPreview.filter(item => item.parentCode);

      // Insert parents first
      if (parentCategories.length > 0) {
        const { error: parentError } = await supabase
          .from("cost_categories")
          .upsert(
            parentCategories.map(item => ({
              name: item.name,
              code: item.code || null,
              budget_monthly: item.budget,
              is_active: true,
            })),
            { onConflict: 'code', ignoreDuplicates: false }
          );
        if (parentError && !parentError.message.includes('duplicate')) {
          throw parentError;
        }
      }

      // Get parent IDs for children
      const { data: parentData } = await supabase
        .from("cost_categories")
        .select("id, code")
        .in("code", [...new Set(childCategories.map(c => c.parentCode).filter(Boolean))]);

      const parentIdMap = new Map((parentData || []).map(p => [p.code, p.id]));

      // Insert children with parent_id
      if (childCategories.length > 0) {
        const childrenToInsert = childCategories.map(item => ({
          name: item.name,
          code: item.code || null,
          budget_monthly: item.budget,
          parent_id: item.parentCode ? parentIdMap.get(item.parentCode) : null,
          is_active: true,
        }));

        const { error: childError } = await supabase
          .from("cost_categories")
          .upsert(childrenToInsert, { onConflict: 'code', ignoreDuplicates: false });
        
        if (childError && !childError.message.includes('duplicate')) {
          throw childError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["cost-categories"] });
      toast.success(`Importuota ${importPreview.length} kategorijų`);
      setImportDialogOpen(false);
      setImportPreview([]);
      setReplaceExisting(false);
    } catch (error: any) {
      toast.error("Klaida importuojant: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ["Kodas", "Pavadinimas", "Mėnesinis biudžetas (€)"],
      ["T1", "Bendrųjų patalpų, teritorijos ir aplinkos priež.", "27360"],
      ["T2", "Apskaita ir kiti namo priežiūros darbai", "24447"],
      ["T3", "Valymo/plovimo paslaugos", "24261"],
      ["T4", "Kaupiamos lėšos remontams", "5434"],
      ["T5", "Tikslinės kaupiamosios lėšos remontams", "20000"],
      ["T6", "Bendrų įrenginių, patalpų elektra ir apšvietimas", "15000"],
      ["T7", "Vanduo (pagal faktą)", "2783"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kategorijos");
    XLSX.writeFile(wb, "kategoriju_sablonas.xlsx");
  };

  const handleExportCategories = () => {
    if (categories.length === 0) {
      toast.error("Nėra kategorijų eksportui");
      return;
    }

    // Build hierarchical export - parent categories first, then their children
    const getParentCode = (parentId: string | null): string => {
      if (!parentId) return "";
      const parent = categories.find(c => c.id === parentId);
      return parent?.code || "";
    };

    const exportData: string[][] = [
      ["Kodas", "Pavadinimas", "Tėvinė kategorija", "Mėnesinis biudžetas (€)", "Aprašymas", "Aktyvi"]
    ];

    // Get parent categories sorted by code
    const parentCategories = categories
      .filter(c => !c.parent_id)
      .sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true }));

    // For each parent, add it and then its children
    parentCategories.forEach(parent => {
      // Add parent category
      exportData.push([
        parent.code || "",
        parent.name,
        "",
        parent.budget_monthly?.toString() || "",
        parent.description || "",
        parent.is_active ? "Taip" : "Ne"
      ]);

      // Get and add children sorted by code
      const children = categories
        .filter(c => c.parent_id === parent.id)
        .sort((a, b) => (a.code || "").localeCompare(b.code || "", undefined, { numeric: true }));

      children.forEach(child => {
        exportData.push([
          child.code || "",
          child.name,
          parent.code || "",
          child.budget_monthly?.toString() || "",
          child.description || "",
          child.is_active ? "Taip" : "Ne"
        ]);
      });
    });

    // Add orphan categories (have parent_id but parent doesn't exist)
    const orphans = categories.filter(c => 
      c.parent_id && !categories.find(p => p.id === c.parent_id)
    );
    orphans.forEach(cat => {
      exportData.push([
        cat.code || "",
        cat.name,
        getParentCode(cat.parent_id),
        cat.budget_monthly?.toString() || "",
        cat.description || "",
        cat.is_active ? "Taip" : "Ne"
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 10 },  // Kodas
      { wch: 55 },  // Pavadinimas
      { wch: 18 },  // Tėvinė kategorija
      { wch: 22 },  // Biudžetas
      { wch: 40 },  // Aprašymas
      { wch: 8 },   // Aktyvi
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kategorijos");
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `kategorijos_${date}.xlsx`);
    
    const parentCount = parentCategories.length;
    const childCount = categories.filter(c => c.parent_id).length;
    toast.success(`Eksportuota ${parentCount} kategorijų ir ${childCount} subkategorijų`);
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visos kategorijos</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {activeCategories} aktyvios
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mėnesinis biudžetas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalBudget.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {categoriesWithBudget} kategorijos su biudžetu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagrindinės kategorijos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.filter((c) => !c.parent_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Aukščiausio lygio kategorijos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subkategorijos</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.filter((c) => c.parent_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Antro ir žemesnio lygio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header with search and add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ieškoti kategorijų..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Import from Excel */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <Button variant="outline" onClick={handleExportCategories}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Eksportuoti
          </Button>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Šablonas
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Importuoti
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleCloseDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nauja kategorija
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Redaguoti kategoriją" : "Nauja sąnaudų kategorija"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Pavadinimas *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="pvz. Komunalinės paslaugos"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="code">Kodas</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="pvz. KOM-001"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="parent_id">Tėvinė kategorija</Label>
                  <Select
                    value={formData.parent_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pasirinkite tėvinę kategoriją (neprivaloma)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nėra (pagrindinė kategorija)</SelectItem>
                      {categories
                        .filter((c) => c.id !== editingCategory?.id)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.parent_id ? "↳ " : ""}{cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="budget_monthly">Mėnesinis biudžetas (€)</Label>
                  <Input
                    id="budget_monthly"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.budget_monthly}
                    onChange={(e) => setFormData({ ...formData, budget_monthly: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Aprašymas</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Kategorijos aprašymas..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Aktyvi kategorija</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Atšaukti
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saugoma..." : editingCategory ? "Atnaujinti" : "Sukurti"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Categories table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Kraunama...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchTerm ? "Kategorijų nerasta" : "Nėra sukurtų kategorijų"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Pavadinimas</TableHead>
                  <TableHead>Kodas</TableHead>
                  <TableHead className="text-right">Mėnesinis biudžetas</TableHead>
                  <TableHead className="text-center">Būsena</TableHead>
                  <TableHead className="text-right">Veiksmai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => {
                  const budgetUsed = 0; // TODO: Calculate from actual spending
                  const budgetPercent = category.budget_monthly 
                    ? Math.min((budgetUsed / category.budget_monthly) * 100, 100) 
                    : 0;
                  const hasChildCategories = hasChildren(category.id);
                  const isExpanded = expandedCategories.has(category.id);

                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div 
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${(category.level || 0) * 24}px` }}
                        >
                          {hasChildCategories ? (
                            <button
                              onClick={() => toggleExpand(category.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-6" />
                          )}
                          <div>
                            <div className="font-medium">{category.name}</div>
                            {category.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {category.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.code && (
                          <Badge variant="outline">{category.code}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {category.budget_monthly ? (
                          <div className="space-y-1">
                            <div className="font-medium">€{category.budget_monthly.toFixed(2)}</div>
                            <Progress value={budgetPercent} className="h-1.5 w-20 ml-auto" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Aktyvi" : "Neaktyvi"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti kategoriją?</AlertDialogTitle>
            <AlertDialogDescription>
              Ar tikrai norite ištrinti kategoriją "{categoryToDelete?.name}"? 
              Šis veiksmas negrįžtamas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => categoryToDelete && deleteMutation.mutate(categoryToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Trinama..." : "Ištrinti"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import preview dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importuoti kategorijas
            </DialogTitle>
            <DialogDescription>
              Peržiūrėkite ir patvirtinkite importuojamas kategorijas
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-2 px-1 bg-muted/50 rounded-md">
            <Switch
              id="replaceExisting"
              checked={replaceExisting}
              onCheckedChange={setReplaceExisting}
            />
            <Label htmlFor="replaceExisting" className="text-sm">
              Išvalyti esamas kategorijas ir importuoti iš naujo
            </Label>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kodas</TableHead>
                  <TableHead>Pavadinimas</TableHead>
                  <TableHead className="text-right">Biudžetas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.map((item, index) => (
                  <TableRow key={index} className={item.parentCode ? "bg-muted/30" : ""}>
                    <TableCell>
                      {item.code ? (
                        <Badge variant={item.parentCode ? "secondary" : "outline"}>
                          {item.parentCode ? "↳ " : ""}{item.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      {item.budget ? `€${item.budget.toFixed(2)}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                Rasta {importPreview.length} kategorijų 
                ({importPreview.filter(i => !i.parentCode).length} pagr. + {importPreview.filter(i => i.parentCode).length} sub.)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setImportDialogOpen(false); setReplaceExisting(false); }}>
                  Atšaukti
                </Button>
                <Button onClick={handleImportConfirm} disabled={isImporting}>
                  {isImporting ? "Importuojama..." : replaceExisting ? "Išvalyti ir importuoti" : "Importuoti"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
