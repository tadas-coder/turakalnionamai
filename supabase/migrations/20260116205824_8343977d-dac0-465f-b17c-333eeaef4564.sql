-- Add poll_type column to polls table
ALTER TABLE public.polls 
ADD COLUMN poll_type TEXT DEFAULT 'simple_survey';

-- Add a comment explaining the poll types
COMMENT ON COLUMN public.polls.poll_type IS 'Poll type: owners_vote (Visų Savininkų balsavimas raštu), members_vote (Bendrijos narių balsavimas raštu), opinion_form (Iš anksto raštu teikiamos nuomonės blankas), simple_survey (Paprasta apklausa), board_vote (Valdybos narių balsavimas raštu)';