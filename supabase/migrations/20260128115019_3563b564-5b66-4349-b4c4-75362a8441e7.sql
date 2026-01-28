-- Create settings table for non-sensitive configuration
CREATE TABLE public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  token_prices JSONB NOT NULL DEFAULT '[]'::jsonb,
  free_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view settings"
ON public.app_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.app_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.app_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.app_settings (id, token_prices, free_limits) VALUES (
  'default',
  '[
    {"model": "FLUX", "type": "photo", "tokens": 5},
    {"model": "Stable Diffusion", "type": "photo", "tokens": 3},
    {"model": "KIE.AI", "type": "video", "tokens": 50},
    {"model": "Suno", "type": "music", "tokens": 10},
    {"model": "GPT-4", "type": "text", "tokens": 2},
    {"model": "Gemini", "type": "text", "tokens": 1}
  ]'::jsonb,
  '{"photo": 5, "video": 1, "music": 3, "text": 20, "dailyBonus": 5}'::jsonb
);