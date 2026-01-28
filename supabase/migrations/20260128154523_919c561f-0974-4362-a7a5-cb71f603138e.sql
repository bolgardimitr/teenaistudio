-- Create a public view for profiles that excludes sensitive data (email)
-- This view will be used for displaying author info in the gallery

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    avatar_url,
    level,
    created_at
  FROM public.profiles;

-- Grant access to the view for authenticated and anon users
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.profiles_public IS 'Public profile view that excludes email and other sensitive fields. Use this for displaying author info in gallery.';
