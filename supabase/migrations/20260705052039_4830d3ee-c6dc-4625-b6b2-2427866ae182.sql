
-- Profiles: restrict SELECT to own row (+ admins)
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles select own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Alerts: restrict DELETE/UPDATE to admin or anestesista
DROP POLICY IF EXISTS "alerts delete" ON public.alerts;
CREATE POLICY "alerts delete" ON public.alerts
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'anestesista'));

DROP POLICY IF EXISTS "alerts update" ON public.alerts;
CREATE POLICY "alerts update" ON public.alerts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'anestesista'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'anestesista'));

-- Medications: restrict DELETE/UPDATE
DROP POLICY IF EXISTS "meds delete" ON public.medications;
CREATE POLICY "meds delete" ON public.medications
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'anestesista') OR administered_by = auth.uid());

DROP POLICY IF EXISTS "meds update" ON public.medications;
CREATE POLICY "meds update" ON public.medications
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'anestesista') OR administered_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'anestesista') OR administered_by = auth.uid());

-- Lock down SECURITY DEFINER function EXECUTE to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
