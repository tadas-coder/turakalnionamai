-- Create news recipients table to track who should receive each news notification
CREATE TABLE public.news_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(news_id, resident_id)
);

-- Enable RLS
ALTER TABLE public.news_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for news_recipients
CREATE POLICY "Admins can view news recipients" ON public.news_recipients
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert news recipients" ON public.news_recipients
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update news recipients" ON public.news_recipients
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete news recipients" ON public.news_recipients
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can see if they are recipients
CREATE POLICY "Users can view own news recipients" ON public.news_recipients
  FOR SELECT USING (
    resident_id IN (
      SELECT id FROM public.residents WHERE linked_profile_id = auth.uid()
    )
  );