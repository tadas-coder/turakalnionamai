-- Add phone number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create linked accounts table for additional users
CREATE TABLE public.linked_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_email TEXT NOT NULL,
  linked_name TEXT,
  relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own linked accounts
CREATE POLICY "Users can view own linked accounts"
ON public.linked_accounts
FOR SELECT
USING (auth.uid() = primary_user_id);

-- Users can insert their own linked accounts
CREATE POLICY "Users can insert own linked accounts"
ON public.linked_accounts
FOR INSERT
WITH CHECK (auth.uid() = primary_user_id);

-- Users can update their own linked accounts
CREATE POLICY "Users can update own linked accounts"
ON public.linked_accounts
FOR UPDATE
USING (auth.uid() = primary_user_id);

-- Users can delete their own linked accounts
CREATE POLICY "Users can delete own linked accounts"
ON public.linked_accounts
FOR DELETE
USING (auth.uid() = primary_user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));