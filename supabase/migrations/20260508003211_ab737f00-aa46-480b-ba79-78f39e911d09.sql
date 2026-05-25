
-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- PROFILES
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- USER ROLES
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planning',
  progress INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  responsible_id UUID REFERENCES auth.users(id),
  archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view projects"
  ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects"
  ON public.projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete projects"
  ON public.projects FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate project_code
CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(project_code FROM 5) AS INTEGER)), 0) + 1
    INTO next_num FROM public.projects;
  NEW.project_code := 'Proj' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER before_insert_project_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  WHEN (NEW.project_code IS NULL OR NEW.project_code = '')
  EXECUTE FUNCTION public.generate_project_code();

-- ============================================
-- PROJECT STAGES
-- ============================================

CREATE TABLE public.project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  responsible_id UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD stages"
  ON public.project_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- TASKS
-- ============================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES public.project_stages(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  responsible_id UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  progress INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD tasks"
  ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TASK MESSAGES
-- ============================================

CREATE TABLE public.task_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task messages"
  ON public.task_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert task messages"
  ON public.task_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- FINANCIAL ACCOUNTS
-- ============================================

CREATE TABLE public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD financial accounts"
  ON public.financial_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER update_financial_accounts_updated_at
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FINANCIAL CATEGORIES
-- ============================================

CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD financial categories"
  ON public.financial_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- FINANCIAL TRANSACTIONS
-- ============================================

CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'expense',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  value NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD financial transactions"
  ON public.financial_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- FINANCIAL ENTRIES (receivables/payables)
-- ============================================

CREATE TABLE public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'payable',
  description TEXT NOT NULL DEFAULT '',
  recurrence TEXT DEFAULT 'once',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  value NUMERIC(15,2) NOT NULL DEFAULT 0,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD financial entries"
  ON public.financial_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- SERVICE ORDERS
-- ============================================

CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_code TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'sent',
  title TEXT NOT NULL DEFAULT '',
  observation TEXT DEFAULT '',
  completed_by_executor BOOLEAN NOT NULL DEFAULT false,
  approved_by_creator BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own OS or admin sees all"
  ON public.service_orders FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated can create OS"
  ON public.service_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Involved users can update OS"
  ON public.service_orders FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Creator or admin can delete OS"
  ON public.service_orders FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate os_code
CREATE OR REPLACE FUNCTION public.generate_os_code()
RETURNS TRIGGER AS $$
DECLARE
  proj_code TEXT;
  next_num INTEGER;
BEGIN
  SELECT project_code INTO proj_code FROM public.projects WHERE id = NEW.project_id;
  SELECT COALESCE(COUNT(*), 0) + 1 INTO next_num
    FROM public.service_orders WHERE project_id = NEW.project_id;
  NEW.os_code := proj_code || ' OS' || LPAD(next_num::TEXT, 2, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER before_insert_os_code
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW
  WHEN (NEW.os_code IS NULL OR NEW.os_code = '')
  EXECUTE FUNCTION public.generate_os_code();

-- ============================================
-- SERVICE ORDER ATTACHMENTS
-- ============================================

CREATE TABLE public.service_order_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of their OS"
  ON public.service_order_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
      AND (so.created_by = auth.uid() OR so.assigned_to = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Authenticated users can insert attachments"
  ON public.service_order_attachments FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  link TEXT DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Anyone can view attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can delete own attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;
