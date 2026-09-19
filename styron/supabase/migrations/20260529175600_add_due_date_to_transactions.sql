-- Add due_date column to financial_transactions
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS due_date DATE;

-- 1. First, backfill due_date from financial_entries for all matched payments containing '[ref:...]'
UPDATE public.financial_transactions t
SET due_date = e.due_date
FROM public.financial_entries e
WHERE t.due_date IS NULL
  AND t.description LIKE '%[ref:%'
  AND e.id = (SUBSTRING(t.description FROM '\[ref:([a-f0-9\-]{36})\]'))::uuid;

-- 2. Second, fallback for any remaining/other financial transactions without due_date and without reference
-- to have due_date equal to their transaction_date to avoid showing '-' empty in UI.
UPDATE public.financial_transactions
SET due_date = transaction_date::date
WHERE due_date IS NULL;
