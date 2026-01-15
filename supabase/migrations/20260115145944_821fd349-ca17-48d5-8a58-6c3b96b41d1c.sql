-- Create segments table for contact groups
CREATE TABLE public.segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create segment members junction table
CREATE TABLE public.segment_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(segment_id, resident_id)
);

-- Create poll recipients table to track who should receive each poll
CREATE TABLE public.poll_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, resident_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_recipients ENABLE ROW LEVEL SECURITY;

-- Segments policies (only admins can manage)
CREATE POLICY "Admins can view segments" ON public.segments
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert segments" ON public.segments
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update segments" ON public.segments
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete segments" ON public.segments
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Segment members policies
CREATE POLICY "Admins can view segment members" ON public.segment_members
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert segment members" ON public.segment_members
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete segment members" ON public.segment_members
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Poll recipients policies
CREATE POLICY "Admins can view poll recipients" ON public.poll_recipients
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert poll recipients" ON public.poll_recipients
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete poll recipients" ON public.poll_recipients
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can see if they are recipients of a poll
CREATE POLICY "Users can view own poll recipients" ON public.poll_recipients
  FOR SELECT USING (
    resident_id IN (
      SELECT id FROM public.residents WHERE linked_profile_id = auth.uid()
    )
  );

-- Create trigger for updated_at on segments
CREATE TRIGGER update_segments_updated_at
  BEFORE UPDATE ON public.segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default segments
INSERT INTO public.segments (name, description, color) VALUES
  ('Savininkai', 'Butų savininkai', '#22c55e'),
  ('Nuomininkai', 'Butų nuomininkai', '#3b82f6');