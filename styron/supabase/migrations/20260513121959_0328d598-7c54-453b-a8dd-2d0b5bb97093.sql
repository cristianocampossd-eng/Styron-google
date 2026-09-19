ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_projects_is_template ON public.projects(is_template);