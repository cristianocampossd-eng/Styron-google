ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS system_id UUID REFERENCES public.company_systems(id) ON DELETE SET NULL;
