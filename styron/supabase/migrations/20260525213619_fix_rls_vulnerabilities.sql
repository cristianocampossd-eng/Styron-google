-- Fix company_systems policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users on company_systems" ON public.company_systems;
DROP POLICY IF EXISTS "Enable insert for authenticated users on company_systems" ON public.company_systems;
DROP POLICY IF EXISTS "Enable update for authenticated users on company_systems" ON public.company_systems;
DROP POLICY IF EXISTS "Enable delete for authenticated users on company_systems" ON public.company_systems;

CREATE POLICY "Enable read access for all authenticated users on company_systems"
    ON public.company_systems FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for admins on company_systems"
    ON public.company_systems FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enable update for admins on company_systems"
    ON public.company_systems FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enable delete for admins on company_systems"
    ON public.company_systems FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- Fix company_passwords policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users on company_passwords" ON public.company_passwords;
DROP POLICY IF EXISTS "Enable insert for authenticated users on company_passwords" ON public.company_passwords;
DROP POLICY IF EXISTS "Enable update for authenticated users on company_passwords" ON public.company_passwords;
DROP POLICY IF EXISTS "Enable delete for authenticated users on company_passwords" ON public.company_passwords;

CREATE POLICY "Enable read access for admins on company_passwords"
    ON public.company_passwords FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enable insert for admins on company_passwords"
    ON public.company_passwords FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enable update for admins on company_passwords"
    ON public.company_passwords FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enable delete for admins on company_passwords"
    ON public.company_passwords FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- Fix company_products policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users on company_products" ON public.company_products;
DROP POLICY IF EXISTS "Enable insert for authenticated users on company_products" ON public.company_products;
DROP POLICY IF EXISTS "Enable update for authenticated users on company_products" ON public.company_products;
DROP POLICY IF EXISTS "Enable delete for authenticated users on company_products" ON public.company_products;

CREATE POLICY "Enable read access for all authenticated users on company_products"
    ON public.company_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for admins on company_products"
    ON public.company_products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enable update for admins on company_products"
    ON public.company_products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Enable delete for admins on company_products"
    ON public.company_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- Fix company_sales policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users on company_sales" ON public.company_sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users on company_sales" ON public.company_sales;
DROP POLICY IF EXISTS "Enable update for authenticated users on company_sales" ON public.company_sales;
DROP POLICY IF EXISTS "Enable delete for authenticated users on company_sales" ON public.company_sales;

CREATE POLICY "Enable read access for admins or seller on company_sales"
    ON public.company_sales FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());

CREATE POLICY "Enable insert for admins or seller on company_sales"
    ON public.company_sales FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());

CREATE POLICY "Enable update for admins or seller on company_sales"
    ON public.company_sales FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());

CREATE POLICY "Enable delete for admins or seller on company_sales"
    ON public.company_sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR seller_id = auth.uid());


-- Fix storage policies
DROP POLICY IF EXISTS "Authenticated users can upload objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;

CREATE POLICY "Admins can upload objects to company-assets" 
    ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update objects in company-assets" 
    ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete objects from company-assets" 
    ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));