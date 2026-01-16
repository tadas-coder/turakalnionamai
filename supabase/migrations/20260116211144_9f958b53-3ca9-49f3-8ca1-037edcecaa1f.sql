-- Create poll_protocols table for storing generated protocols
CREATE TABLE public.poll_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, pending_written_results, pending_live_results, pending_approval, approved
  
  -- Protocol metadata
  protocol_number TEXT,
  protocol_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meeting_date DATE,
  location TEXT DEFAULT 'Vilnius',
  
  -- Organizer info
  organizer_name TEXT,
  organizer_address TEXT,
  
  -- Commission members (JSONB array of names)
  commission_members JSONB DEFAULT '[]'::jsonb,
  
  -- Ballot counts
  ballots_sent INTEGER DEFAULT 0,
  ballots_received INTEGER DEFAULT 0,
  
  -- Quorum info
  has_quorum BOOLEAN DEFAULT false,
  quorum_info TEXT,
  
  -- Written voting results (JSONB: { questionIndex: { approve: count, reject: count } })
  written_results JSONB DEFAULT '{}'::jsonb,
  
  -- Live meeting voting results (JSONB: { questionIndex: { approve: count, reject: count } })
  live_results JSONB DEFAULT '{}'::jsonb,
  
  -- Final decisions per question (JSONB array)
  decisions JSONB DEFAULT '[]'::jsonb,
  
  -- Commission chairman who signs
  commission_chairman TEXT,
  
  -- Approval tracking
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.poll_protocols ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all protocols" 
ON public.poll_protocols 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert protocols" 
ON public.poll_protocols 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update protocols" 
ON public.poll_protocols 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete protocols" 
ON public.poll_protocols 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view approved protocols for polls they are recipients of
CREATE POLICY "Users can view approved protocols for their polls" 
ON public.poll_protocols 
FOR SELECT 
USING (
  status = 'approved' AND 
  EXISTS (
    SELECT 1 FROM poll_recipients pr
    JOIN residents r ON r.id = pr.resident_id
    WHERE pr.poll_id = poll_protocols.poll_id
    AND r.linked_profile_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_poll_protocols_updated_at
BEFORE UPDATE ON public.poll_protocols
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();