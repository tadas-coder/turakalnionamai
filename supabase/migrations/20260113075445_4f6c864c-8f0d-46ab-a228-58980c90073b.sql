-- Create monthly financial reports table
CREATE TABLE public.monthly_financial_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_month DATE NOT NULL,
  title TEXT NOT NULL,
  summary_data JSONB,
  main_categories JSONB,
  detailed_categories JSONB,
  monthly_expenses JSONB,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_month)
);

-- Enable RLS
ALTER TABLE public.monthly_financial_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated and approved can view published reports
CREATE POLICY "Approved users can view published monthly reports"
ON public.monthly_financial_reports
FOR SELECT
USING (
  published = true AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.approved = true
  )
);

-- Admins can view all reports
CREATE POLICY "Admins can view all monthly reports"
ON public.monthly_financial_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can insert reports
CREATE POLICY "Admins can insert monthly reports"
ON public.monthly_financial_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can update reports
CREATE POLICY "Admins can update monthly reports"
ON public.monthly_financial_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Admins can delete reports
CREATE POLICY "Admins can delete monthly reports"
ON public.monthly_financial_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create storage bucket for financial reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-reports', 'financial-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for financial reports bucket
CREATE POLICY "Anyone can view financial report files"
ON storage.objects FOR SELECT
USING (bucket_id = 'financial-reports');

CREATE POLICY "Admins can upload financial report files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'financial-reports' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete financial report files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'financial-reports' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_monthly_financial_reports_updated_at
BEFORE UPDATE ON public.monthly_financial_reports
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();