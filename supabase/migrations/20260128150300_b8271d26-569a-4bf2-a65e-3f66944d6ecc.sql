-- Remove the dangerous public policy that exposes all user emails
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;