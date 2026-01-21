-- =====================================================
-- APSKAITOS SISTEMA - Pilna duomenų bazės migracija
-- =====================================================

-- 1. TURTO GRUPĖS (Asset Groups)
CREATE TABLE public.asset_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name2 TEXT,
  parent_group_id UUID REFERENCES public.asset_groups(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. TURTAS (Assets)
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_group_id UUID REFERENCES public.asset_groups(id),
  name TEXT NOT NULL,
  description TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12, 2),
  current_value NUMERIC(12, 2),
  depreciation_rate NUMERIC(5, 2),
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. EKSPLOATACINĖS MEDŽIAGOS (Consumables)
CREATE TABLE public.consumables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT,
  asset_id UUID REFERENCES public.assets(id),
  quantity NUMERIC(10, 2) DEFAULT 0,
  unit TEXT,
  unit_price NUMERIC(12, 2),
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. TIEKĖJAI (Vendors)
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_code TEXT,
  vat_code TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Lietuva',
  phone TEXT,
  email TEXT,
  bank_account TEXT,
  bank_name TEXT,
  contact_person TEXT,
  category TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. IŠLAIDŲ KATEGORIJOS (Cost Categories)
CREATE TABLE public.cost_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  parent_id UUID REFERENCES public.cost_categories(id),
  description TEXT,
  budget_monthly NUMERIC(12, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. SĄSKAITOS (Invoices from vendors)
CREATE TABLE public.vendor_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES public.vendors(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  period_month DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  cost_category_id UUID REFERENCES public.cost_categories(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. SĄSKAITŲ EILUTĖS (Invoice Line Items)
CREATE TABLE public.vendor_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.vendor_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 3) DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC(12, 2) NOT NULL,
  vat_rate NUMERIC(5, 2) DEFAULT 21,
  amount NUMERIC(12, 2) NOT NULL,
  cost_category_id UUID REFERENCES public.cost_categories(id),
  asset_id UUID REFERENCES public.assets(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. MOKĖJIMAI (Transaction Payments)
CREATE TABLE public.transaction_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.vendor_invoices(id),
  payment_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  bank_statement_date DATE,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. PERIODINIAI DUOMENYS (Monthly/Yearly financial data)
CREATE TABLE public.periodic_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_month DATE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  planned_amount NUMERIC(12, 2) DEFAULT 0,
  actual_amount NUMERIC(12, 2) DEFAULT 0,
  difference NUMERIC(12, 2) GENERATED ALWAYS AS (actual_amount - planned_amount) STORED,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(period_month, category, subcategory)
);

-- 10. ATASKAITŲ DETALĖS (Statement Details)
CREATE TABLE public.statement_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_month DATE NOT NULL,
  statement_type TEXT NOT NULL,
  account_member TEXT,
  assigned_service TEXT,
  main_cost_date DATE,
  payment_types TEXT,
  reference TEXT,
  tolerance NUMERIC(12, 2),
  unit_price DOUBLE PRECISION,
  quantity NUMERIC(12, 4),
  currency TEXT DEFAULT 'EUR',
  assigned_to UUID,
  cost_category_id UUID REFERENCES public.cost_categories(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. UŽDUOTYS (Gradient Tasks / Work Tasks)
CREATE TABLE public.accounting_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  assigned_to UUID,
  related_invoice_id UUID REFERENCES public.vendor_invoices(id),
  related_asset_id UUID REFERENCES public.assets(id),
  cost TEXT,
  invoice TEXT,
  short_description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. FAILŲ GRUPĖS (File Groups)
CREATE TABLE public.file_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_group_id UUID REFERENCES public.file_groups(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 13. FAILAI (Files/Documents for accounting)
CREATE TABLE public.accounting_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_group_id UUID REFERENCES public.file_groups(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  description TEXT,
  related_invoice_id UUID REFERENCES public.vendor_invoices(id),
  related_asset_id UUID REFERENCES public.assets(id),
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.asset_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin full access, approved users read access

-- Asset Groups
CREATE POLICY "Admins can manage asset_groups" ON public.asset_groups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view asset_groups" ON public.asset_groups FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Assets
CREATE POLICY "Admins can manage assets" ON public.assets FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view assets" ON public.assets FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Consumables
CREATE POLICY "Admins can manage consumables" ON public.consumables FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view consumables" ON public.consumables FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Vendors
CREATE POLICY "Admins can manage vendors" ON public.vendors FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view vendors" ON public.vendors FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Cost Categories
CREATE POLICY "Admins can manage cost_categories" ON public.cost_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view cost_categories" ON public.cost_categories FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Vendor Invoices
CREATE POLICY "Admins can manage vendor_invoices" ON public.vendor_invoices FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view vendor_invoices" ON public.vendor_invoices FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Vendor Invoice Items
CREATE POLICY "Admins can manage vendor_invoice_items" ON public.vendor_invoice_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view vendor_invoice_items" ON public.vendor_invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Transaction Payments
CREATE POLICY "Admins can manage transaction_payments" ON public.transaction_payments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view transaction_payments" ON public.transaction_payments FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Periodic Data
CREATE POLICY "Admins can manage periodic_data" ON public.periodic_data FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view periodic_data" ON public.periodic_data FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Statement Details
CREATE POLICY "Admins can manage statement_details" ON public.statement_details FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view statement_details" ON public.statement_details FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Accounting Tasks
CREATE POLICY "Admins can manage accounting_tasks" ON public.accounting_tasks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view accounting_tasks" ON public.accounting_tasks FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- File Groups
CREATE POLICY "Admins can manage file_groups" ON public.file_groups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view file_groups" ON public.file_groups FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Accounting Files
CREATE POLICY "Admins can manage accounting_files" ON public.accounting_files FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view accounting_files" ON public.accounting_files FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND approved = true));

-- Create triggers for updated_at
CREATE TRIGGER update_asset_groups_updated_at BEFORE UPDATE ON public.asset_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consumables_updated_at BEFORE UPDATE ON public.consumables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_categories_updated_at BEFORE UPDATE ON public.cost_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_invoices_updated_at BEFORE UPDATE ON public.vendor_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_periodic_data_updated_at BEFORE UPDATE ON public.periodic_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_statement_details_updated_at BEFORE UPDATE ON public.statement_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounting_tasks_updated_at BEFORE UPDATE ON public.accounting_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_assets_group ON public.assets(asset_group_id);
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_consumables_asset ON public.consumables(asset_id);
CREATE INDEX idx_vendor_invoices_vendor ON public.vendor_invoices(vendor_id);
CREATE INDEX idx_vendor_invoices_status ON public.vendor_invoices(status);
CREATE INDEX idx_vendor_invoices_period ON public.vendor_invoices(period_month);
CREATE INDEX idx_vendor_invoice_items_invoice ON public.vendor_invoice_items(invoice_id);
CREATE INDEX idx_transaction_payments_invoice ON public.transaction_payments(invoice_id);
CREATE INDEX idx_periodic_data_period ON public.periodic_data(period_month);
CREATE INDEX idx_statement_details_period ON public.statement_details(period_month);
CREATE INDEX idx_accounting_tasks_status ON public.accounting_tasks(status);
CREATE INDEX idx_accounting_files_invoice ON public.accounting_files(related_invoice_id);