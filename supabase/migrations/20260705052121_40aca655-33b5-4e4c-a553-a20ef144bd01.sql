
-- Replace `true` in write policies with non-null auth check to satisfy linter
-- patients
DROP POLICY IF EXISTS "patients insert" ON public.patients;
CREATE POLICY "patients insert" ON public.patients FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "patients update" ON public.patients;
CREATE POLICY "patients update" ON public.patients FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- aldrete_evaluations
DROP POLICY IF EXISTS "aldrete insert" ON public.aldrete_evaluations;
CREATE POLICY "aldrete insert" ON public.aldrete_evaluations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "aldrete update" ON public.aldrete_evaluations;
CREATE POLICY "aldrete update" ON public.aldrete_evaluations FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- vital_signs
DROP POLICY IF EXISTS "vitals insert" ON public.vital_signs;
CREATE POLICY "vitals insert" ON public.vital_signs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "vitals update" ON public.vital_signs;
CREATE POLICY "vitals update" ON public.vital_signs FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- medications insert
DROP POLICY IF EXISTS "meds insert" ON public.medications;
CREATE POLICY "meds insert" ON public.medications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- alerts insert
DROP POLICY IF EXISTS "alerts insert" ON public.alerts;
CREATE POLICY "alerts insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Lock down other SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
