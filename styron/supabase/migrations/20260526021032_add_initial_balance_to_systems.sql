ALTER TABLE public.company_systems ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(10, 2) DEFAULT 0;

CREATE POLICY "Anyone can upload OS attachments" 
    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets' AND (name LIKE 'os-attachments/%'));

CREATE POLICY "Anyone can update OS attachments" 
    ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-assets' AND (name LIKE 'os-attachments/%'));

CREATE POLICY "Anyone can delete OS attachments" 
    ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-assets' AND (name LIKE 'os-attachments/%'));