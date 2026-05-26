-- Migration to update OS code format to sequential OS-001, OS-002, etc. and format existing ones

CREATE OR REPLACE FUNCTION public.generate_os_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_num FROM public.service_orders;
  NEW.os_code := 'OS-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Disable trigger during update
ALTER TABLE public.service_orders DISABLE TRIGGER before_insert_os_code;

-- Re-generate all existing OS codes to follow the new format
WITH sequential_orders AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) as row_num
  FROM public.service_orders
)
UPDATE public.service_orders so
SET os_code = 'OS-' || LPAD(sequential_orders.row_num::TEXT, 3, '0')
FROM sequential_orders
WHERE so.id = sequential_orders.id;

-- Enable trigger back
ALTER TABLE public.service_orders ENABLE TRIGGER before_insert_os_code;
