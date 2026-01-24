-- Add invoice-specific fields to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS is_invoice boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'unpaid' CHECK (invoice_status IN ('paid', 'unpaid', 'partially_paid')),
ADD COLUMN IF NOT EXISTS cost_category_id uuid REFERENCES public.cost_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS needs_distribution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS distribution_segment_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS vendor_pattern_hash text,
ADD COLUMN IF NOT EXISTS ai_recognized boolean DEFAULT false;

-- Create junction table for linking invoices to tickets
CREATE TABLE IF NOT EXISTS public.invoice_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(document_id, ticket_id)
);

-- Create table for storing invoice recognition patterns
CREATE TABLE IF NOT EXISTS public.invoice_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_hash text NOT NULL UNIQUE,
  vendor_name text NOT NULL,
  cost_category_id uuid REFERENCES public.cost_categories(id) ON DELETE SET NULL,
  invoice_status text DEFAULT 'unpaid',
  needs_distribution boolean DEFAULT false,
  distribution_segment_ids uuid[] DEFAULT '{}',
  recognition_count integer DEFAULT 1,
  last_used_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.invoice_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_patterns ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_tickets
CREATE POLICY "Admins can manage invoice_tickets"
ON public.invoice_tickets FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Residents can view invoice_tickets"
ON public.invoice_tickets FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS policies for invoice_patterns
CREATE POLICY "Admins can manage invoice_patterns"
ON public.invoice_patterns FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_is_invoice ON public.documents(is_invoice) WHERE is_invoice = true;
CREATE INDEX IF NOT EXISTS idx_invoice_tickets_document_id ON public.invoice_tickets(document_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tickets_ticket_id ON public.invoice_tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_invoice_patterns_pattern_hash ON public.invoice_patterns(pattern_hash);

-- Add updated_at trigger for invoice_patterns
CREATE TRIGGER update_invoice_patterns_updated_at
BEFORE UPDATE ON public.invoice_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();