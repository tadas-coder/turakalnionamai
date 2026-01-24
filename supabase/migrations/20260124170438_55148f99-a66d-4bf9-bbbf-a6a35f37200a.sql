-- Create storage bucket for vendor invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-invoices', 'vendor-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vendor invoices storage
CREATE POLICY "Admins can upload vendor invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vendor-invoices' 
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can view vendor invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vendor-invoices' 
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete vendor invoices"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vendor-invoices' 
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add vendor pattern recognition table for recurring invoices
CREATE TABLE IF NOT EXISTS public.vendor_invoice_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  pattern_hash TEXT NOT NULL UNIQUE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  cost_category_id UUID REFERENCES cost_categories(id) ON DELETE SET NULL,
  recognition_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_invoice_patterns ENABLE ROW LEVEL SECURITY;

-- Admin access only
CREATE POLICY "Admins can manage vendor invoice patterns"
ON public.vendor_invoice_patterns FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create index for pattern lookup
CREATE INDEX idx_vendor_invoice_patterns_hash ON vendor_invoice_patterns(pattern_hash);