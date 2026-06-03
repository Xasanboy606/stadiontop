CREATE POLICY "Owners view booking customer profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.stadiums s ON s.id = b.stadium_id
    WHERE b.user_id = profiles.id AND s.owner_id = auth.uid()
  )
);