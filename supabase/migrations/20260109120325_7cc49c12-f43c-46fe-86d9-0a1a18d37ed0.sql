-- Table to track which news items each user has read
CREATE TABLE public.news_read (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, news_id)
);

-- Enable RLS
ALTER TABLE public.news_read ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view own read status"
ON public.news_read
FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark news as read
CREATE POLICY "Users can insert own read status"
ON public.news_read
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own read status (mark as unread)
CREATE POLICY "Users can delete own read status"
ON public.news_read
FOR DELETE
USING (auth.uid() = user_id);