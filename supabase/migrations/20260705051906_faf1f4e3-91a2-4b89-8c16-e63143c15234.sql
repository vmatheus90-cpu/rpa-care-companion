
-- Update signup trigger to honor role choice from user_metadata (safe values only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requested_role text;
  final_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  requested_role := NEW.raw_user_meta_data->>'role';
  IF requested_role IN ('admin','anestesista','enfermeiro','tecnico') THEN
    final_role := requested_role::public.app_role;
  ELSE
    final_role := 'enfermeiro'::public.app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, final_role);
  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant full autonomy (incl. DELETE) to admin AND anestesista
DROP POLICY IF EXISTS "patients delete admin" ON public.patients;
CREATE POLICY "patients delete admin or anestesista" ON public.patients
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'anestesista'));

DROP POLICY IF EXISTS "aldrete delete admin" ON public.aldrete_evaluations;
CREATE POLICY "aldrete delete admin or anestesista" ON public.aldrete_evaluations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'anestesista'));

DROP POLICY IF EXISTS "vitals delete admin" ON public.vital_signs;
CREATE POLICY "vitals delete admin or anestesista" ON public.vital_signs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'anestesista'));
