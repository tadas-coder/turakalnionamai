-- Create duty_schedules table for 4 duty persons
CREATE TABLE public.duty_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_name TEXT NOT NULL,
  person_phone TEXT,
  duty_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create planned_works table for maintenance/repairs/shutoffs
CREATE TABLE public.planned_works (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  work_type TEXT NOT NULL DEFAULT 'maintenance', -- maintenance, repair, water_shutoff, electricity_shutoff, other
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.duty_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_works ENABLE ROW LEVEL SECURITY;

-- RLS policies for duty_schedules - only authenticated users can view
CREATE POLICY "Authenticated users can view duty schedules"
ON public.duty_schedules
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert duty schedules"
ON public.duty_schedules
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update duty schedules"
ON public.duty_schedules
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete duty schedules"
ON public.duty_schedules
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for planned_works - only authenticated users can view
CREATE POLICY "Authenticated users can view planned works"
ON public.planned_works
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert planned works"
ON public.planned_works
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update planned works"
ON public.planned_works
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete planned works"
ON public.planned_works
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));