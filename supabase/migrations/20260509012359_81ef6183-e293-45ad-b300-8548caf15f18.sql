
-- Add new role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operational';

-- Profiles new fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;

-- Projects: initial investment
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS initial_investment NUMERIC NOT NULL DEFAULT 0;

-- Company settings (single row)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'STYRON',
  logo_url TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.company_settings (name) 
SELECT 'STYRON' WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can read company settings" ON public.company_settings;
CREATE POLICY "All authenticated can read company settings"
  ON public.company_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
CREATE POLICY "Admins can update company settings"
  ON public.company_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert company settings" ON public.company_settings;
CREATE POLICY "Admins can insert company settings"
  ON public.company_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User permissions per module
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own permissions" ON public.user_permissions;
CREATE POLICY "Users read own permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage permissions" ON public.user_permissions;
CREATE POLICY "Admins manage permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- can_access_module helper
CREATE OR REPLACE FUNCTION public.can_access_module(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id AND module = _module AND granted = true
    );
$$;

-- Update handle_new_user_role: default to 'operational', or 'admin' for specific users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    IF NEW.email = 'styronoficial@gmail.com' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operational');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Tighten projects RLS: only admins write
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Admins create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update projects" ON public.projects
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete projects" ON public.projects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Financial tables: admin only
DROP POLICY IF EXISTS "Authenticated users can CRUD financial accounts" ON public.financial_accounts;
CREATE POLICY "Admins CRUD financial accounts" ON public.financial_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can CRUD financial categories" ON public.financial_categories;
CREATE POLICY "Admins CRUD financial categories" ON public.financial_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can CRUD financial transactions" ON public.financial_transactions;
CREATE POLICY "Admins CRUD financial transactions" ON public.financial_transactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can CRUD financial entries" ON public.financial_entries;
CREATE POLICY "Admins CRUD financial entries" ON public.financial_entries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles: allow admin to update any profile (for blocking)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: company-assets
DROP POLICY IF EXISTS "Public read company assets" ON storage.objects;
CREATE POLICY "Public read company assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Admins write company assets" ON storage.objects;
CREATE POLICY "Admins write company assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update company assets" ON storage.objects;
CREATE POLICY "Admins update company assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: avatars
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Cleanup mock financial accounts (keep ones with transactions)
DELETE FROM public.financial_accounts
WHERE id NOT IN (SELECT DISTINCT account_id FROM public.financial_transactions WHERE account_id IS NOT NULL);
