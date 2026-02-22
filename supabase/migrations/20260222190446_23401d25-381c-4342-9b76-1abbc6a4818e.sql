
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: admins can read all roles, users can read own
CREATE POLICY "Admins can read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

-- 3. Site visits table for analytics
CREATE TABLE public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  page TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT DEFAULT 'desktop',
  country TEXT,
  city TEXT,
  session_id TEXT
);
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visits (public tracking)
CREATE POLICY "Anyone can insert visits" ON public.site_visits
  FOR INSERT WITH CHECK (true);

-- Only admins can read visits
CREATE POLICY "Admins can read visits" ON public.site_visits
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Pricing plans table
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'сум / месяц',
  computers TEXT NOT NULL,
  sla TEXT NOT NULL DEFAULT 'SLA 8h',
  tickets TEXT NOT NULL DEFAULT '0',
  refills TEXT NOT NULL DEFAULT '0',
  extra_features JSONB NOT NULL DEFAULT '[]',
  service_desk_basic BOOLEAN NOT NULL DEFAULT false,
  service_desk_mobile BOOLEAN NOT NULL DEFAULT false,
  highlight BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  cta_key TEXT NOT NULL DEFAULT 'plan.start_work',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Public can read active plans
CREATE POLICY "Anyone can read active plans" ON public.pricing_plans
  FOR SELECT USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage plans" ON public.pricing_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Services table for tariff builder
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  category_icon TEXT NOT NULL DEFAULT 'Wrench',
  name_ru TEXT NOT NULL,
  name_uz TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  description_ru TEXT,
  description_uz TEXT,
  description_en TEXT,
  price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  unit TEXT NOT NULL DEFAULT 'шт.',
  default_qty INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Public can read active services
CREATE POLICY "Anyone can read active services" ON public.services
  FOR SELECT USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage services" ON public.services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Category labels table for tariff builder
CREATE TABLE public.service_categories (
  id TEXT PRIMARY KEY,
  label_ru TEXT NOT NULL,
  label_uz TEXT NOT NULL DEFAULT '',
  label_en TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Wrench',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active categories" ON public.service_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.service_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
