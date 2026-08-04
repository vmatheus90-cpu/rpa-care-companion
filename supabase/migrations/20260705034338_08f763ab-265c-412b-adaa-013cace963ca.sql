
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'anestesista', 'enfermeiro', 'tecnico');
CREATE TYPE public.patient_status AS ENUM ('em_avaliacao', 'aguardando_avaliacao', 'pronto_para_alta', 'alta');
CREATE TYPE public.patient_sex AS ENUM ('M', 'F');
CREATE TYPE public.alert_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.alert_type AS ENUM ('reavaliacao_vencida', 'proxima_avaliacao', 'aldrete_baixo', 'permanencia_prolongada', 'apto_alta');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Handle new user trigger: create profile + default role 'enfermeiro'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'enfermeiro');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PATIENTS ============
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  idade INT NOT NULL,
  sexo patient_sex NOT NULL,
  prontuario TEXT NOT NULL,
  procedimento TEXT,
  cirurgiao TEXT,
  anestesista TEXT,
  entrada_rpa TIMESTAMPTZ NOT NULL DEFAULT now(),
  status patient_status NOT NULL DEFAULT 'em_avaliacao',
  proxima_avaliacao TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients readable" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "patients insert" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "patients update" ON public.patients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "patients delete admin" ON public.patients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ALDRETE ============
CREATE TABLE public.aldrete_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  atividade SMALLINT NOT NULL CHECK (atividade BETWEEN 0 AND 2),
  respiracao SMALLINT NOT NULL CHECK (respiracao BETWEEN 0 AND 2),
  circulacao SMALLINT NOT NULL CHECK (circulacao BETWEEN 0 AND 2),
  consciencia SMALLINT NOT NULL CHECK (consciencia BETWEEN 0 AND 2),
  saturacao SMALLINT NOT NULL CHECK (saturacao BETWEEN 0 AND 2),
  total SMALLINT NOT NULL,
  evaluated_by UUID REFERENCES auth.users(id),
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aldrete_evaluations TO authenticated;
GRANT ALL ON public.aldrete_evaluations TO service_role;
ALTER TABLE public.aldrete_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aldrete readable" ON public.aldrete_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "aldrete insert" ON public.aldrete_evaluations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "aldrete update" ON public.aldrete_evaluations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "aldrete delete admin" ON public.aldrete_evaluations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_aldrete_patient ON public.aldrete_evaluations(patient_id, evaluated_at DESC);

-- ============ VITAL SIGNS ============
CREATE TABLE public.vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  pa_sistolica INT,
  pa_diastolica INT,
  fc INT,
  fr INT,
  saturacao INT,
  temperatura NUMERIC(4,1),
  eva SMALLINT CHECK (eva BETWEEN 0 AND 10),
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vital_signs TO authenticated;
GRANT ALL ON public.vital_signs TO service_role;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitals readable" ON public.vital_signs FOR SELECT TO authenticated USING (true);
CREATE POLICY "vitals insert" ON public.vital_signs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vitals update" ON public.vital_signs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "vitals delete admin" ON public.vital_signs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_vitals_patient ON public.vital_signs(patient_id, recorded_at DESC);

-- ============ MEDICATIONS ============
CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medicamento TEXT NOT NULL,
  dose TEXT NOT NULL,
  via TEXT NOT NULL,
  horario TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacao TEXT,
  profissional TEXT,
  administered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meds readable" ON public.medications FOR SELECT TO authenticated USING (true);
CREATE POLICY "meds insert" ON public.medications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "meds update" ON public.medications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "meds delete" ON public.medications FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_meds_patient ON public.medications(patient_id, horario DESC);

-- ============ ALERTS ============
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tipo alert_type NOT NULL,
  prioridade alert_priority NOT NULL DEFAULT 'media',
  mensagem TEXT NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts readable" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "alerts update" ON public.alerts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "alerts delete" ON public.alerts FOR DELETE TO authenticated USING (true);
CREATE INDEX idx_alerts_created ON public.alerts(created_at DESC);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aldrete_evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vital_signs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medications;
