-- ============================================================================
-- (Opcional) Migration com o mesmo seed, para quem prefere que o paciente
-- fictício de demonstração seja aplicado automaticamente no deploy.
--
-- ATENÇÃO: dados de demonstração em migration vão para TODOS os ambientes
-- que aplicarem as migrations. Se não for o caso, use supabase/seed.sql.
-- Idempotente: não duplica o paciente se o prontuário já existir.
-- ============================================================================

insert into public.patients (
  nome,
  idade,
  sexo,
  prontuario,
  procedimento,
  cirurgiao,
  anestesista,
  entrada_rpa,
  proxima_avaliacao,
  status
)
select
  'Maria Aparecida Souza',
  42,
  'F'::public.patient_sex,
  'RPA-2026-0001',
  'Colecistectomia videolaparoscópica',
  'Dr. Ricardo Almeida',
  'Dra. Helena Prado',
  now(),
  now() + interval '15 minutes',
  'em_avaliacao'::public.patient_status
where not exists (
  select 1 from public.patients p where p.prontuario = 'RPA-2026-0001'
);
