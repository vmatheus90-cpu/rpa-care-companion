
-- Permitir que qualquer profissional autenticado (técnico/enfermeiro/anestesista/admin)
-- também atualize alertas e medicações
DROP POLICY IF EXISTS "alerts update" ON public.alerts;
CREATE POLICY "alerts update" ON public.alerts
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "meds update" ON public.medications;
CREATE POLICY "meds update" ON public.medications
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
