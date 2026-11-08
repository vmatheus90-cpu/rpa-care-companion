-- ============================================================================
-- Seed de demonstração — paciente fictício na RPA
-- ----------------------------------------------------------------------------
-- Idempotente: usa o prontuário como chave lógica e só insere se ainda não
-- existir, então pode rodar quantas vezes quiser sem duplicar registros.
--
-- Como rodar:
--   1) Supabase Dashboard → SQL Editor → cole este arquivo → Run
--      (executa como owner, portanto ignora RLS)
--   2) ou via psql:  psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Observação: não use este arquivo como migration de produção.
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

-- Remove o seed (paciente fictício + registros vinculados via ON DELETE CASCADE):
-- delete from public.patients where prontuario = 'RPA-2026-0001';
