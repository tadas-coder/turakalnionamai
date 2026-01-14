-- Create function to automatically link resident profile with registered user
CREATE OR REPLACE FUNCTION public.link_resident_on_user_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update resident record to link with the new user if email matches
  UPDATE public.residents
  SET linked_profile_id = NEW.id,
      updated_at = now()
  WHERE LOWER(email) = LOWER(NEW.email)
    AND linked_profile_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a new user is created
CREATE TRIGGER on_auth_user_created_link_resident
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_resident_on_user_creation();

-- Also create a function to manually link existing users with residents
CREATE OR REPLACE FUNCTION public.link_existing_users_with_residents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.residents r
  SET linked_profile_id = p.id,
      updated_at = now()
  FROM public.profiles p
  WHERE LOWER(r.email) = LOWER(p.email)
    AND r.linked_profile_id IS NULL;
END;
$$;

-- Run the function to link any existing users
SELECT public.link_existing_users_with_residents();