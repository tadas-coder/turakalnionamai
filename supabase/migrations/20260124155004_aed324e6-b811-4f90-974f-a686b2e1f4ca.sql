-- =============================================
-- 1. PERIODS (Ataskaitiniai periodai)
-- =============================================
CREATE TABLE public.periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- Pvz: "2024 Sausis"
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage periods" ON public.periods FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view periods" ON public.periods FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.approved = true));

CREATE TRIGGER update_periods_updated_at BEFORE UPDATE ON public.periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. BANK_STATEMENTS (Banko išrašai)
-- =============================================
CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_number TEXT,
  transaction_date DATE NOT NULL,
  document_no TEXT,
  payer_recipient TEXT,
  details TEXT,
  reference TEXT,
  entry_unique_no TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  entry_type TEXT, -- credit/debit
  -- Sudengimo laukai
  assigned_vendor_id UUID REFERENCES public.vendors(id),
  assigned_resident_id UUID REFERENCES public.residents(id),
  assigned_vendor_invoice_id UUID REFERENCES public.vendor_invoices(id),
  assigned_resident_invoice_id UUID, -- bus FK po resident_invoices sukūrimo
  assignment_status TEXT DEFAULT 'unassigned', -- unassigned, auto_matched, manually_matched
  assigned_at TIMESTAMP WITH TIME ZONE,
  assigned_by UUID,
  -- Meta
  import_batch_id UUID,
  period_id UUID REFERENCES public.periods(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bank_statements" ON public.bank_statements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view bank_statements" ON public.bank_statements FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.approved = true));

CREATE TRIGGER update_bank_statements_updated_at BEFORE UPDATE ON public.bank_statements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. RESIDENT_INVOICES (Sąskaitos gyventojams)
-- =============================================
CREATE TABLE public.resident_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) NOT NULL,
  period_id UUID REFERENCES public.periods(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  -- Sumos
  previous_balance NUMERIC DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  penalty_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  -- Statusas
  status TEXT DEFAULT 'pending', -- pending, partially_paid, paid, overdue
  fully_paid_at TIMESTAMP WITH TIME ZONE,
  -- Meta
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resident_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage resident_invoices" ON public.resident_invoices FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own resident_invoices" ON public.resident_invoices FOR SELECT USING (resident_id IN (SELECT r.id FROM residents r WHERE r.linked_profile_id = auth.uid()));

CREATE TRIGGER update_resident_invoices_updated_at BEFORE UPDATE ON public.resident_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. RESIDENT_INVOICE_LINES (Sąskaitų eilutės)
-- =============================================
CREATE TABLE public.resident_invoice_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.resident_invoices(id) ON DELETE CASCADE NOT NULL,
  cost_category_id UUID REFERENCES public.cost_categories(id),
  description TEXT NOT NULL,
  quantity NUMERIC DEFAULT 1,
  unit TEXT, -- vnt, m2, m3, kWh, etc.
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  tariff_id UUID, -- bus FK po tariffs sukūrimo
  meter_reading_id UUID, -- bus FK po meter_readings sukūrimo
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resident_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage resident_invoice_lines" ON public.resident_invoice_lines FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own resident_invoice_lines" ON public.resident_invoice_lines FOR SELECT USING (
  invoice_id IN (
    SELECT ri.id FROM resident_invoices ri 
    WHERE ri.resident_id IN (SELECT r.id FROM residents r WHERE r.linked_profile_id = auth.uid())
  )
);

-- Pridėti FK į bank_statements
ALTER TABLE public.bank_statements ADD CONSTRAINT bank_statements_resident_invoice_fk FOREIGN KEY (assigned_resident_invoice_id) REFERENCES public.resident_invoices(id);

-- =============================================
-- 5. METERS (Skaitikliai)
-- =============================================
CREATE TABLE public.meters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID REFERENCES public.assets(id),
  resident_id UUID REFERENCES public.residents(id),
  meter_number TEXT, -- Gamyklinis numeris
  meter_type TEXT NOT NULL, -- cold_water, hot_water, heat, electricity_t1, electricity_t2
  location TEXT, -- Virtuvė, Vonios kambarys, etc.
  is_electronic BOOLEAN DEFAULT false,
  install_date DATE,
  last_verification_date DATE,
  next_verification_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meters" ON public.meters FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own meters" ON public.meters FOR SELECT USING (
  resident_id IN (SELECT r.id FROM residents r WHERE r.linked_profile_id = auth.uid())
  OR asset_id IN (SELECT a.id FROM assets a JOIN residents r ON r.id = a.id WHERE r.linked_profile_id = auth.uid())
);

CREATE TRIGGER update_meters_updated_at BEFORE UPDATE ON public.meters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 6. METER_READINGS (Skaitiklių rodmenys)
-- =============================================
CREATE TABLE public.meter_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meter_id UUID REFERENCES public.meters(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES public.periods(id),
  reading_date DATE NOT NULL,
  reading_value NUMERIC NOT NULL,
  previous_value NUMERIC,
  consumption NUMERIC, -- Skaičiuojamas: reading_value - previous_value
  -- Meta
  source TEXT DEFAULT 'manual', -- manual, imported, api
  photo_url TEXT,
  notes TEXT,
  submitted_by UUID,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage meter_readings" ON public.meter_readings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own meter_readings" ON public.meter_readings FOR SELECT USING (
  meter_id IN (SELECT m.id FROM meters m WHERE m.resident_id IN (SELECT r.id FROM residents r WHERE r.linked_profile_id = auth.uid()))
);
CREATE POLICY "Users can submit own meter_readings" ON public.meter_readings FOR INSERT WITH CHECK (
  meter_id IN (SELECT m.id FROM meters m WHERE m.resident_id IN (SELECT r.id FROM residents r WHERE r.linked_profile_id = auth.uid()))
);

CREATE TRIGGER update_meter_readings_updated_at BEFORE UPDATE ON public.meter_readings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pridėti FK į resident_invoice_lines
ALTER TABLE public.resident_invoice_lines ADD CONSTRAINT resident_invoice_lines_meter_reading_fk FOREIGN KEY (meter_reading_id) REFERENCES public.meter_readings(id);

-- =============================================
-- 7. TARIFFS (Tarifai)
-- =============================================
CREATE TABLE public.tariffs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_category_id UUID REFERENCES public.cost_categories(id),
  name TEXT NOT NULL,
  tariff_type TEXT NOT NULL, -- fixed, per_unit, per_m2, per_m3, per_kwh
  rate NUMERIC NOT NULL,
  unit TEXT, -- EUR, EUR/m2, EUR/m3, EUR/kWh
  valid_from DATE NOT NULL,
  valid_to DATE, -- NULL = galioja iki šiol
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tariffs" ON public.tariffs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Approved users can view tariffs" ON public.tariffs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.approved = true));

CREATE TRIGGER update_tariffs_updated_at BEFORE UPDATE ON public.tariffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pridėti FK į resident_invoice_lines
ALTER TABLE public.resident_invoice_lines ADD CONSTRAINT resident_invoice_lines_tariff_fk FOREIGN KEY (tariff_id) REFERENCES public.tariffs(id);

-- =============================================
-- 8. AUDIT_LOG (Audito žurnalas)
-- =============================================
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL, -- create, update, delete, login, logout, etc.
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit_log" ON public.audit_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- =============================================
-- 9. Papildomi indeksai greitesniam veikimui
-- =============================================
CREATE INDEX idx_periods_year_month ON public.periods(year, month);
CREATE INDEX idx_bank_statements_transaction_date ON public.bank_statements(transaction_date);
CREATE INDEX idx_bank_statements_assignment_status ON public.bank_statements(assignment_status);
CREATE INDEX idx_resident_invoices_resident_id ON public.resident_invoices(resident_id);
CREATE INDEX idx_resident_invoices_period_id ON public.resident_invoices(period_id);
CREATE INDEX idx_resident_invoices_status ON public.resident_invoices(status);
CREATE INDEX idx_meters_resident_id ON public.meters(resident_id);
CREATE INDEX idx_meter_readings_period_id ON public.meter_readings(period_id);
CREATE INDEX idx_tariffs_valid_dates ON public.tariffs(valid_from, valid_to);