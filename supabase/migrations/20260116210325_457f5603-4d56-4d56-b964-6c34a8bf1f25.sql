-- Add voting-related columns to residents table
ALTER TABLE public.residents 
ADD COLUMN votes_count NUMERIC DEFAULT 1,
ADD COLUMN property_share NUMERIC DEFAULT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN public.residents.votes_count IS 'Number of votes this resident has (voting weight)';
COMMENT ON COLUMN public.residents.property_share IS 'Property share/ownership percentage';