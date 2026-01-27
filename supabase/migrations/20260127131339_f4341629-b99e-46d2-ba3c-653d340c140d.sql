-- Add is_featured column to generations for admin picks
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Create likes table
CREATE TABLE public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, generation_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for likes
CREATE POLICY "Users can view all likes"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_likes_generation_id ON public.likes(generation_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_generations_featured ON public.generations(is_featured) WHERE is_featured = true;
CREATE INDEX idx_generations_public ON public.generations(is_public, created_at DESC) WHERE is_public = true;

-- Add RLS policy for viewing public profiles (for author info in gallery)
CREATE POLICY "Anyone can view public profile info"
  ON public.profiles FOR SELECT
  USING (true);