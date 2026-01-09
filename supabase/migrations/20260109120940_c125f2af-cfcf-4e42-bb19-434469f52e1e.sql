-- Create ticket_read table to track when users last viewed their tickets
CREATE TABLE public.ticket_read (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticket_id)
);

-- Enable RLS
ALTER TABLE public.ticket_read ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view their own ticket read status"
ON public.ticket_read
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert their own ticket read status"
ON public.ticket_read
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own read status
CREATE POLICY "Users can update their own ticket read status"
ON public.ticket_read
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own read status
CREATE POLICY "Users can delete their own ticket read status"
ON public.ticket_read
FOR DELETE
USING (auth.uid() = user_id);