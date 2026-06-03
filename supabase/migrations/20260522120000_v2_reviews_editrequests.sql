-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stadium_id  UUID NOT NULL REFERENCES public.stadiums(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  rating      INT  NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, stadium_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads reviews"        ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users insert own reviews"    ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own reviews"    ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own reviews"    ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin manages reviews"       ON public.reviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ EDIT REQUESTS ============
CREATE TABLE IF NOT EXISTS public.edit_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stadium_id       UUID NOT NULL REFERENCES public.stadiums(id) ON DELETE CASCADE,
  field_name       TEXT NOT NULL,
  old_value        TEXT,
  new_value        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_response   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ
);
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and admins view edit_requests" ON public.edit_requests
  FOR SELECT TO authenticated
  USING (supervisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors insert edit_requests" ON public.edit_requests
  FOR INSERT TO authenticated
  WITH CHECK (supervisor_id = auth.uid() AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admin updates edit_requests" ON public.edit_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES: is_blocked ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- ============ BOOKINGS: cancellation ============
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_amount         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_reason   TEXT;

-- ============ TRANSACTIONS: escrow & commission ============
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS escrow_status      TEXT NOT NULL DEFAULT 'held'
    CHECK (escrow_status IN ('held', 'released', 'refunded')),
  ADD COLUMN IF NOT EXISTS released_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_amount  INT NOT NULL DEFAULT 0;
