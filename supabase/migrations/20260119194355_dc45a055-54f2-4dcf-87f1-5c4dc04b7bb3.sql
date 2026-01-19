-- Add signed status columns to documents table
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS signed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);

-- Add comment for documentation
COMMENT ON COLUMN public.documents.signed IS 'Whether the document has been electronically signed via gosign.lt';
COMMENT ON COLUMN public.documents.signed_at IS 'When the document was signed';
COMMENT ON COLUMN public.documents.signed_by IS 'Who signed the document';