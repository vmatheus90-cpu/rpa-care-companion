-- ============================================================================
-- Seed de demonstração — paciente fictício completo na RPA
-- ----------------------------------------------------------------------------
-- Idempotente: o prontuário `RPA-2026-0001` é a chave lógica do paciente, e
-- cada bloco de registros vinculados (Aldrete, sinais vitais, medicações,
-- alertas) só é inserido se aquele paciente ainda não tiver nenhum registro do
-- tipo. Pode rodar quantas vezes quiser sem duplicar nada.
--
-- Como rodar:
--   1) Supabase Dashboard → SQL Editor → cole este arquivo → Run
--      (executa como owner da tabela, portanto ignora RLS)
--   2) ou via psql:  psql "$DATABASE_URL" -f supabase/seed.sql
--
-- Observação: não use este arquivo como migration de produção.
--
-- O que é criado:
--   • 1 paciente  — Maria Aparecida Souza (RPA-2026-0001), em avaliação
--   • 2 Aldrete   — 9/10 (há 25 min) e 10/10 (há 8 min)
--   • 2 vitais    — PA, FC, FR, SatO2, Temp, EVA
--   • 2 medicações— Ondansetrona 4 mg IV e Dipirona 1 g IV
--   • 1 alerta    — próxima avaliação prevista
-- ============================================================================

-- 1) Paciente ----------------------------------------------------------------
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
  now() - interval '25 minutes',
  now() + interval '10 minutes',
  'em_avaliacao'::public.patient_status
where not exists (
  select 1 from public.patients p where p.prontuario = 'RPA-2026-0001'
);

-- 2) Avaliações de Aldrete ---------------------------------------------------
insert into public.aldrete_evaluations (
  patient_id,
  atividade,
  respiracao,
  circulacao,
  consciencia,
  saturacao,
  total,
  evaluated_at
)
select
  p.id,
  v.atividade,
  v.respiracao,
  v.circulacao,
  v.consciencia,
  v.saturacao,
  v.atividade + v.respiracao + v.circulacao + v.consciencia + v.saturacao,
  now() - (v.offset_min * interval '1 minute')
from public.patients p
cross join (values
  (2::smallint, 2::smallint, 1::smallint, 2::smallint, 2::smallint, 25),
  (2::smallint, 2::smallint, 2::smallint, 2::smallint, 2::smallint, 8)
) as v (atividade, respiracao, circulacao, consciencia, saturacao, offset_min)
where p.prontuario = 'RPA-2026-0001'
  and not exists (
    select 1 from public.aldrete_evaluations e where e.patient_id = p.id
  );

-- 3) Sinais vitais -----------------------------------------------------------
insert into public.vital_signs (
  patient_id,
  pa_sistolica,
  pa_diastolica,
  fc,
  fr,
  saturacao,
  temperatura,
  eva,
  recorded_at
)
select
  p.id,
  v.pa_s,
  v.pa_d,
  v.fc,
  v.fr,
  v.sat,
  v.temp,
  v.eva,
  now() - (v.offset_min * interval '1 minute')
from public.patients p
cross join (values
  (128::int, 78::int, 88::int, 16::int, 96::int, 36.4::numeric, 3::smallint, 20),
  (124::int, 76::int, 82::int, 15::int, 97::int, 36.2::numeric, 2::smallint, 5)
) as v (pa_s, pa_d, fc, fr, sat, temp, eva, offset_min)
where p.prontuario = 'RPA-2026-0001'
  and not exists (
    select 1 from public.vital_signs vs where vs.patient_id = p.id
  );

-- 4) Medicações administradas ------------------------------------------------
insert into public.medications (
  patient_id,
  medicamento,
  dose,
  via,
  horario,
  observacao,
  profissional
)
select
  p.id,
  v.medicamento,
  v.dose,
  v.via,
  now() - (v.offset_min * interval '1 minute'),
  v.obs,
  'Enf. Juliana Castro'
from public.patients p
cross join (values
  ('Ondansetrona', '4 mg', 'IV', 18, 'Profilaxia de náusea pós-operatória'),
  ('Dipirona', '1 g', 'IV', 6, 'Analgesia')
) as v (medicamento, dose, via, offset_min, obs)
where p.prontuario = 'RPA-2026-0001'
  and not exists (
    select 1 from public.medications m where m.patient_id = p.id
  );

-- 5) Alerta de próxima avaliação --------------------------------------------
insert into public.alerts (patient_id, tipo, prioridade, mensagem)
select
  p.id,
  'proxima_avaliacao'::public.alert_type,
  'media'::public.alert_priority,
  'Reavaliação de Aldrete prevista para '
    || to_char(
         (now() + interval '10 minutes') at time zone 'America/Sao_Paulo',
         'HH24:MI'
       )
    || '.'
from public.patients p
where p.prontuario = 'RPA-2026-0001'
  and not exists (
    select 1 from public.alerts a where a.patient_id = p.id
  );

-- 6) Limpeza do demo (opcional) ----------------------------------------------
-- Remove o paciente fictício e, por ON DELETE CASCADE, Aldrete, sinais vitais,
-- medicações e alertas vinculados:
-- delete from public.patients where prontuario = 'RPA-2026-0001';
