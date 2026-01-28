-- Create table for API test logs
CREATE TABLE public.api_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL,
  api_provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  response_time_ms INTEGER,
  error_message TEXT,
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tested_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.api_tests ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage API tests
CREATE POLICY "Admins can view all api tests"
ON public.api_tests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert api tests"
ON public.api_tests
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete api tests"
ON public.api_tests
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_api_tests_model_name ON public.api_tests(model_name);
CREATE INDEX idx_api_tests_tested_at ON public.api_tests(tested_at DESC);