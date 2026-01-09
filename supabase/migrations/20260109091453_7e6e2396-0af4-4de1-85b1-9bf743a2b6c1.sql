-- Create function for updated_at trigger if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  visible BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Residents can view visible documents
CREATE POLICY "Users can view visible documents"
ON public.documents
FOR SELECT
USING (visible = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert documents
CREATE POLICY "Admins can insert documents"
ON public.documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update documents
CREATE POLICY "Admins can update documents"
ON public.documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete documents
CREATE POLICY "Admins can delete documents"
ON public.documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Storage policies for documents bucket
CREATE POLICY "Anyone can view document files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Admins can upload document files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update document files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete document files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'::app_role));