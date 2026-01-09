-- Allow admins to update any profile (for approvals)
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));