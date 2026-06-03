
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  lang TEXT DEFAULT 'uz',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- profile auto-create + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profiles RLS
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles RLS
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STADIUMS ============
CREATE TYPE public.stadium_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.stadiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  size TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  reviews INT DEFAULT 0,
  price_day INT NOT NULL,
  price_night INT NOT NULL,
  images TEXT[] DEFAULT '{}',
  facilities TEXT[] DEFAULT '{}',
  has_referee BOOLEAN DEFAULT false,
  has_video BOOLEAN DEFAULT false,
  has_balls BOOLEAN DEFAULT true,
  has_bibs BOOLEAN DEFAULT true,
  status stadium_status NOT NULL DEFAULT 'pending',
  lat NUMERIC,
  lng NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stadiums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views approved stadiums" ON public.stadiums
  FOR SELECT USING (status = 'approved' OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners insert own stadiums" ON public.stadiums
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners update own stadiums" ON public.stadiums
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete own stadiums" ON public.stadiums
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============ BOOKINGS ============
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.payment_kind AS ENUM ('deposit', 'full');
CREATE TYPE public.payment_provider AS ENUM ('click', 'payme', 'uzum');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stadium_id UUID NOT NULL REFERENCES public.stadiums(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  hour INT NOT NULL CHECK (hour >= 0 AND hour < 24),
  duration INT NOT NULL CHECK (duration >= 1 AND duration <= 3),
  base_price INT NOT NULL,
  addons_price INT NOT NULL DEFAULT 0,
  service_fee INT NOT NULL DEFAULT 0,
  total INT NOT NULL,
  paid_amount INT NOT NULL,
  payment_kind payment_kind NOT NULL,
  payment_provider payment_provider NOT NULL,
  addons TEXT[] DEFAULT '{}',
  short_code TEXT NOT NULL UNIQUE,
  qr_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status booking_status NOT NULL DEFAULT 'confirmed',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX bookings_slot_idx ON public.bookings (stadium_id, booking_date, hour);

CREATE POLICY "Users view own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Users create own bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners update bookings on their stadiums" ON public.bookings
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.stadiums s WHERE s.id = stadium_id AND s.owner_id = auth.uid())
  );

-- Overlap-prevention trigger
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.stadium_id = NEW.stadium_id
      AND b.booking_date = NEW.booking_date
      AND b.status = 'confirmed'
      AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NEW.hour < b.hour + b.duration
      AND b.hour < NEW.hour + NEW.duration
  ) THEN
    RAISE EXCEPTION 'Slot overlaps with existing booking';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_overlap_check
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_overlap();

-- ============ TRANSACTIONS ============
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  provider payment_provider NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" ON public.transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own transactions" ON public.transactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER stadiums_updated BEFORE UPDATE ON public.stadiums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
