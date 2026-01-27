-- Add status and metadata columns to transactions for payment tracking
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS external_id text;

-- Index for finding pending transactions
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions(external_id) WHERE external_id IS NOT NULL;