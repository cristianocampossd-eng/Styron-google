CREATE TABLE IF NOT EXISTS public.company_systems (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_passwords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    link TEXT,
    login TEXT NOT NULL,
    pass TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sku TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    system_id UUID REFERENCES public.company_systems(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    company_name TEXT,
    product_id UUID REFERENCES public.company_products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'prospecting',
    seller_id UUID NOT NULL,
    seller_name TEXT NOT NULL,
    notes TEXT,
    system_id UUID REFERENCES public.company_systems(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.company_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_sales ENABLE ROW LEVEL SECURITY;

-- Add basic policies (everyone authenticated can read/write for now, to ensure the UI works)
-- In production, these should be restricted to admins or specific roles.

CREATE POLICY "Enable read access for all authenticated users on company_systems"
    ON public.company_systems FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on company_systems"
    ON public.company_systems FOR INSERT
    TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on company_systems"
    ON public.company_systems FOR UPDATE
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on company_systems"
    ON public.company_systems FOR DELETE
    TO authenticated USING (true);

-- company_passwords policies
CREATE POLICY "Enable read access for all authenticated users on company_passwords"
    ON public.company_passwords FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on company_passwords"
    ON public.company_passwords FOR INSERT
    TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on company_passwords"
    ON public.company_passwords FOR UPDATE
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on company_passwords"
    ON public.company_passwords FOR DELETE
    TO authenticated USING (true);

-- company_products policies
CREATE POLICY "Enable read access for all authenticated users on company_products"
    ON public.company_products FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on company_products"
    ON public.company_products FOR INSERT
    TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on company_products"
    ON public.company_products FOR UPDATE
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on company_products"
    ON public.company_products FOR DELETE
    TO authenticated USING (true);

-- company_sales policies
CREATE POLICY "Enable read access for all authenticated users on company_sales"
    ON public.company_sales FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on company_sales"
    ON public.company_sales FOR INSERT
    TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on company_sales"
    ON public.company_sales FOR UPDATE
    TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on company_sales"
    ON public.company_sales FOR DELETE
    TO authenticated USING (true);


-- Create company-assets bucket if it does not exist (using Supabase storage functions)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Grant access to the bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can upload objects" 
ON storage.objects FOR INSERT 
TO authenticated WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can update objects" 
ON storage.objects FOR UPDATE 
TO authenticated USING (bucket_id = 'company-assets') WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated users can delete objects" 
ON storage.objects FOR DELETE 
TO authenticated USING (bucket_id = 'company-assets');
