-- Set file size limit to 500MB for all buckets to be safe
UPDATE storage.buckets
SET file_size_limit = 524288000 -- 500MB
WHERE id IN ('company-assets', 'avatars', 'attachments');

-- Also ensure company-assets allows uploads from all authenticated users if it didn't already
-- (redundant but safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Authenticated users can upload objects'
    ) THEN
        CREATE POLICY "Authenticated users can upload objects" 
        ON storage.objects FOR INSERT 
        TO authenticated WITH CHECK (bucket_id = 'company-assets');
    END IF;
END $$;
