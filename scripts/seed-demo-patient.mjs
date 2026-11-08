#!/usr/bin/env node
/**
 * Seed do paciente fictício de demonstração da RPA.
 *
 * Uso (terminal, na raiz do projeto):
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<chave server-side> \
 *   npm run demo:paciente
 *
 * Por que service role: as policies de RLS das tabelas clínicas exigem
 * `auth.uid() IS NOT NULL`, e este script roda sem sessão de usuário.
 * Este arquivo é server-side/CLI — NUNCA exponha a service role no frontend
 * nem no bundle do Vite (variáveis VITE_* vão para o cliente).
 *
 * Idempotente: a chave lógica é o prontuário `RPA-2026-0001`. Rodar de novo
 * não duplica o paciente nem os registros vinculados.
 *
 * Segurança operacional: o script imprime apenas o project ref (não é segredo)
 * e aborta se o ambiente apontar para um projeto diferente do esperado.
 * Para desativar a checagem: SUPABASE_EXPECTED_PROJECT_REF=any
 */
import { createClient } from "@supabase/supabase-js";

// .env opcional (Node >= 20.12). Nunca commite o .env.
try {
  process.loadEnvFile?.(".env");
} catch {
  // sem .env: segue com o ambiente atual
}

const DEMO_PRONTUARIO = "RPA-2026-0001";
const DEFAULT_EXPECTED_REF = "qqoyxithrfdacvjqvqod";

const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
const minutesAhead = (m) => new Date(Date.now() + m * 60_000).toISOString();

function abort(message, hint) {
  console.error(`\n\u2716 ${message}`);
  if (hint) console.error(`  ${hint}`);
  console.error("");
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

if (!url) {
  abort(
    "SUPABASE_URL (ou VITE_SUPABASE_URL) não definida.",
    "Ex.: SUPABASE_URL=https://<ref>.supabase.co npm run demo:paciente",
  );
}
if (!/^https?:\/\//.test(url)) abort(`SUPABASE_URL inválida: "${url}"`);
if (!key) {
  abort(
    "SUPABASE_SERVICE_ROLE_KEY não definida.",
    "As policies de RLS exigem auth.uid(); use a service role key apenas localmente/servidor.",
  );
}

let projectRef = "<desconhecido>";
try {
  projectRef = new URL(url).hostname.split(".")[0];
} catch {
  abort("Não foi possível extrair o project ref da URL informada.");
}

const expectedRef = process.env.SUPABASE_EXPECTED_PROJECT_REF ?? DEFAULT_EXPECTED_REF;
if (expectedRef !== "any" && projectRef !== expectedRef) {
  abort(
    `Project ref divergente: o ambiente aponta para "${projectRef}", esperado "${expectedRef}".`,
    "Confira VITE_SUPABASE_URL / SUPABASE_URL deste ambiente. Para pular a checagem: SUPABASE_EXPECTED_PROJECT_REF=any",
  );
}

console.log(`\u2192 Projeto Supabase: ${projectRef}`);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensurePatient() {
  const { data, error } = await supabase
    .from("patients")
    .select("id")
    .eq("prontuario", DEMO_PRONTUARIO)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`consulta patients: ${error.message}`);
  if (data?.[0]?.id) return { id: data[0].id, created: false };

  const { data: inserted, error: insertError } = await supabase
    .from("patients")
    .insert({
      nome: "Maria Aparecida Souza",
      idade: 42,
      sexo: "F",
      prontuario: DEMO_PRONTUARIO,
      procedimento: "Colecistectomia videolaparoscópica",
      cirurgiao: "Dr. Ricardo Almeida",
      anestesista: "Dra. Helena Prado",
      entrada_rpa: minutesAgo(25),
      proxima_avaliacao: minutesAhead(10),
      status: "em_avaliacao",
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`insert patients: ${insertError?.message ?? "sem retorno"}`);
  }
  return { id: inserted.id, created: true };
}

async function seedRows(table, patientId, rows) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId);
  if (error) throw new Error(`consulta ${table}: ${error.message}`);
  if ((count ?? 0) > 0) {
    console.log(`  \u2022 ${table}: ${count} registro(s) já existente(s) — ignorado`);
    return;
  }
  const { error: insertError } = await supabase.from(table).insert(rows);
  if (insertError) throw new Error(`insert ${table}: ${insertError.message}`);
  console.log(`  \u2022 ${table}: ${rows.length} registro(s) criado(s)`);
}

async function main() {
  const { id, created } = await ensurePatient();
  console.log(
    created
      ? `\u2714 Paciente "${DEMO_PRONTUARIO}" criado (${id})`
      : `\u2022 Paciente "${DEMO_PRONTUARIO}" já existia (${id})`,
  );

  await seedRows("aldrete_evaluations", id, [
    {
      patient_id: id,
      atividade: 2,
      respiracao: 2,
      circulacao: 1,
      consciencia: 2,
      saturacao: 2,
      total: 9,
      evaluated_at: minutesAgo(25),
    },
    {
      patient_id: id,
      atividade: 2,
      respiracao: 2,
      circulacao: 2,
      consciencia: 2,
      saturacao: 2,
      total: 10,
      evaluated_at: minutesAgo(8),
    },
  ]);

  await seedRows("vital_signs", id, [
    {
      patient_id: id,
      pa_sistolica: 128,
      pa_diastolica: 78,
      fc: 88,
      fr: 16,
      saturacao: 96,
      temperatura: 36.4,
      eva: 3,
      recorded_at: minutesAgo(20),
    },
    {
      patient_id: id,
      pa_sistolica: 124,
      pa_diastolica: 76,
      fc: 82,
      fr: 15,
      saturacao: 97,
      temperatura: 36.2,
      eva: 2,
      recorded_at: minutesAgo(5),
    },
  ]);

  await seedRows("medications", id, [
    {
      patient_id: id,
      medicamento: "Ondansetrona",
      dose: "4 mg",
      via: "IV",
      horario: minutesAgo(18),
      observacao: "Profilaxia de náusea pós-operatória",
      profissional: "Enf. Juliana Castro",
    },
    {
      patient_id: id,
      medicamento: "Dipirona",
      dose: "1 g",
      via: "IV",
      horario: minutesAgo(6),
      observacao: "Analgesia",
      profissional: "Enf. Juliana Castro",
    },
  ]);

  await seedRows("alerts", id, [
    {
      patient_id: id,
      tipo: "proxima_avaliacao",
      prioridade: "media",
      mensagem: "Reavaliação de Aldrete prevista em 10 minutos.",
    },
  ]);

  console.log(`\n\u2714 Pronto. Recarregue /pacientes no RPA Monitor (projeto ${projectRef}).`);
}

main().catch((err) => abort(err instanceof Error ? err.message : String(err)));
