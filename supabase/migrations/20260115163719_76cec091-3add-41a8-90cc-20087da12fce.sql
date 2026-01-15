-- Drop existing policy that allows anyone to view polls
DROP POLICY IF EXISTS "Anyone can view polls" ON public.polls;

-- Create new policy: users can view polls only if they are recipients or admins
CREATE POLICY "Users can view polls they are recipients of"
ON public.polls
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.poll_recipients pr
    JOIN public.residents r ON r.id = pr.resident_id
    WHERE pr.poll_id = polls.id
    AND r.linked_profile_id = auth.uid()
  )
);