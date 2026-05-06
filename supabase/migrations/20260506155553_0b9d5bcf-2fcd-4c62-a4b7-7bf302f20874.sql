
CREATE TYPE public.case_status AS ENUM ('open','active','cold','closed');
CREATE TYPE public.person_role AS ENUM ('suspect','victim','witness','officer','associate','unknown');

CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  status case_status NOT NULL DEFAULT 'open',
  priority int NOT NULL DEFAULT 3,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  alias text,
  phone text,
  role person_role NOT NULL DEFAULT 'unknown',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL,
  make text,
  model text,
  color text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.case_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'related',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_links_source ON public.case_links(source_type, source_id);
CREATE INDEX idx_case_links_target ON public.case_links(target_type, target_id);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_links ENABLE ROW LEVEL SECURITY;

-- Helper: investigator OR admin
CREATE OR REPLACE FUNCTION public.is_investigator_or_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'investigator') OR public.has_role(_user_id, 'admin')
$$;

-- Policies (same shape for all 4 tables)
CREATE POLICY "Investigators view cases" ON public.cases FOR SELECT TO authenticated USING (public.is_investigator_or_admin(auth.uid()));
CREATE POLICY "Investigators write cases" ON public.cases FOR INSERT TO authenticated WITH CHECK (public.is_investigator_or_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Investigators update cases" ON public.cases FOR UPDATE TO authenticated USING (public.is_investigator_or_admin(auth.uid()));
CREATE POLICY "Investigators delete cases" ON public.cases FOR DELETE TO authenticated USING (public.is_investigator_or_admin(auth.uid()));

CREATE POLICY "Investigators view persons" ON public.persons FOR SELECT TO authenticated USING (public.is_investigator_or_admin(auth.uid()));
CREATE POLICY "Investigators write persons" ON public.persons FOR INSERT TO authenticated WITH CHECK (public.is_investigator_or_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Investigators update persons" ON public.persons FOR UPDATE TO authenticated USING (public.is_investigator_or_admin(auth.uid()));
CREATE POLICY "Investigators delete persons" ON public.persons FOR DELETE TO authenticated USING (public.is_investigator_or_admin(auth.uid()));

CREATE POLICY "Investigators view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.is_investigator_or_admin(auth.uid()));
CREATE POLICY "Investigators write vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.is_investigator_or_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Investigators update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.is_investigator_or_admin(auth.uid()));
CREATE POLICY "Investigators delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.is_investigator_or_admin(auth.uid()));

CREATE POLICY "Investigators view links" ON public.case_links FOR SELECT TO authenticated USING (public.is_investigator_or_admin(auth.uid()));
CREATE POLICY "Investigators write links" ON public.case_links FOR INSERT TO authenticated WITH CHECK (public.is_investigator_or_admin(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Investigators delete links" ON public.case_links FOR DELETE TO authenticated USING (public.is_investigator_or_admin(auth.uid()));

CREATE TRIGGER cases_touch BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER persons_touch BEFORE UPDATE ON public.persons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER vehicles_touch BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
