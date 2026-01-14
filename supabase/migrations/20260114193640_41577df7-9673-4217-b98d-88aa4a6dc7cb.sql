-- First, clear any orphan upload_batch_id values in payment_slips
UPDATE public.payment_slips
SET upload_batch_id = NULL
WHERE upload_batch_id IS NOT NULL;

-- Create upload_batches table to track payment slip uploads
CREATE TABLE public.upload_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  file_name TEXT,
  file_type TEXT,
  slip_count INTEGER NOT NULL DEFAULT 0,
  period_month DATE,
  status TEXT NOT NULL DEFAULT 'completed'
);

-- Enable RLS
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;

-- Only admins can manage upload batches
CREATE POLICY "Admins can view upload batches"
ON public.upload_batches
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert upload batches"
ON public.upload_batches
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete upload batches"
ON public.upload_batches
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add foreign key from payment_slips to upload_batches
ALTER TABLE public.payment_slips
ADD CONSTRAINT payment_slips_upload_batch_fk
FOREIGN KEY (upload_batch_id) REFERENCES public.upload_batches(id) ON DELETE CASCADE;