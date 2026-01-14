-- First create the updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create payment_slips table for storing parsed payment slip data
CREATE TABLE public.payment_slips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Invoice metadata
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  period_month DATE NOT NULL,
  
  -- Buyer/property info for matching
  buyer_name TEXT,
  apartment_address TEXT NOT NULL,
  apartment_number TEXT,
  payment_code TEXT,
  
  -- Financial data
  previous_amount NUMERIC(10,2) DEFAULT 0,
  payments_received NUMERIC(10,2) DEFAULT 0,
  balance NUMERIC(10,2) DEFAULT 0,
  accrued_amount NUMERIC(10,2) NOT NULL,
  total_due NUMERIC(10,2) NOT NULL,
  
  -- Line items as JSONB array
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Utility readings as JSONB
  utility_readings JSONB DEFAULT '{}'::jsonb,
  
  -- PDF attachment
  pdf_url TEXT,
  pdf_file_name TEXT,
  
  -- Assignment status
  assignment_status TEXT NOT NULL DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'auto_matched', 'manually_assigned', 'confirmed', 'rejected')),
  matched_by TEXT CHECK (matched_by IN ('apartment_number', 'payment_code', 'name', 'manual')),
  
  -- Upload batch tracking
  upload_batch_id UUID,
  uploaded_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_slips ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can view all payment slips"
  ON public.payment_slips FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert payment slips"
  ON public.payment_slips FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update payment slips"
  ON public.payment_slips FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete payment slips"
  ON public.payment_slips FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Residents can view their own payment slips (via profile_id)
CREATE POLICY "Users can view own payment slips"
  ON public.payment_slips FOR SELECT
  USING (
    profile_id = auth.uid() 
    OR resident_id IN (SELECT id FROM residents WHERE linked_profile_id = auth.uid())
  );

-- Create index for faster lookups
CREATE INDEX idx_payment_slips_resident ON public.payment_slips(resident_id);
CREATE INDEX idx_payment_slips_profile ON public.payment_slips(profile_id);
CREATE INDEX idx_payment_slips_apartment ON public.payment_slips(apartment_number);
CREATE INDEX idx_payment_slips_period ON public.payment_slips(period_month);
CREATE INDEX idx_payment_slips_status ON public.payment_slips(assignment_status);

-- Create updated_at trigger
CREATE TRIGGER update_payment_slips_updated_at
  BEFORE UPDATE ON public.payment_slips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for payment slip PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('payment-slips', 'payment-slips', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment slips bucket
CREATE POLICY "Admins can upload payment slips"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-slips' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all payment slip files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-slips' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own payment slip files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-slips' 
    AND (
      EXISTS (
        SELECT 1 FROM payment_slips ps 
        WHERE ps.pdf_url LIKE '%' || name || '%'
        AND (ps.profile_id = auth.uid() OR ps.resident_id IN (SELECT id FROM residents WHERE linked_profile_id = auth.uid()))
      )
    )
  );

CREATE POLICY "Admins can delete payment slip files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'payment-slips' AND has_role(auth.uid(), 'admin'::app_role));