-- Create residents table for storing owner/resident data imported from Excel
CREATE TABLE public.residents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  address TEXT,
  apartment_number TEXT,
  phone TEXT,
  email TEXT,
  correspondence_address TEXT,
  company_code TEXT,
  pvm_code TEXT,
  receives_mail BOOLEAN DEFAULT false,
  receives_email BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  linked_profile_id UUID REFERENCES public.profiles(id),
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  invitation_token TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all residents"
  ON public.residents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert residents"
  ON public.residents FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update residents"
  ON public.residents FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete residents"
  ON public.residents FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own linked resident record
CREATE POLICY "Users can view own linked resident"
  ON public.residents FOR SELECT
  USING (linked_profile_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for faster lookups
CREATE INDEX idx_residents_email ON public.residents(email);
CREATE INDEX idx_residents_apartment ON public.residents(apartment_number);
CREATE INDEX idx_residents_linked_profile ON public.residents(linked_profile_id);