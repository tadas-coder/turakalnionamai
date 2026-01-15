-- Create ticket_attachments table for storing document attachments (PDF, Word, Excel)
CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: ticket authors can view their own ticket attachments
CREATE POLICY "Users can view attachments for their own tickets"
  ON public.ticket_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- Policy: admins can view all attachments
CREATE POLICY "Admins can view all attachments"
  ON public.ticket_attachments
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: authenticated users can insert attachments for their own tickets
CREATE POLICY "Users can insert attachments for their own tickets"
  ON public.ticket_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- Policy: admins can insert attachments
CREATE POLICY "Admins can insert attachments"
  ON public.ticket_attachments
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: admins can delete attachments
CREATE POLICY "Admins can delete attachments"
  ON public.ticket_attachments
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups by ticket_id
CREATE INDEX idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);

-- Create storage bucket for ticket attachments if not exists (using ticket-photos bucket but we can extend it)
-- Note: We'll use the existing ticket-photos bucket for documents too

-- Storage policies for documents in ticket-photos bucket (extend to allow documents)
CREATE POLICY "Allow authenticated users to upload ticket documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public access to ticket documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ticket-photos');