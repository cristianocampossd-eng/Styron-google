ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
