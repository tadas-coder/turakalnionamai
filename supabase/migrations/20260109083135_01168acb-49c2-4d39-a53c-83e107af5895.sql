-- Allow anyone to create tickets (even without login)
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;

CREATE POLICY "Anyone can create tickets"
ON public.tickets FOR INSERT
WITH CHECK (true);

-- Also allow anyone to upload photos for tickets
DROP POLICY IF EXISTS "Users can add photos to their tickets" ON public.ticket_photos;

CREATE POLICY "Anyone can add ticket photos"
ON public.ticket_photos FOR INSERT
WITH CHECK (true);