import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

/**
 * Paciente fictício de demonstração da RPA.
 *
 * A chave lógica é o `prontuario` — repetir a chamada NÃO duplica o paciente
 * nem os registros vinculados (cada bloco só é inserido se ainda não existir).
 *
 * Usa o cliente autenticado, portanto as policies de RLS se aplicam
 * (INSERT exige `auth.uid() IS NOT NULL`). Não usa service role.
 */
export const DEMO_PRONTUARIO = "RPA-2026-0001";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const minutesAhead = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

type CountedTable = "aldrete_evaluations" | "vital_signs" | "medications" | "alerts";

async function hasRows(table: CountedTable, patientId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId);
  if (error) throw new Error(`Falha ao consultar ${table}: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function addDemoPatient(): Promise<{ id: string; created: boolean }> {
  const { data: existing, error: findError } = await supabase
    .from("patients")
    .select("id")
    .eq("prontuario", DEMO_PRONTUARIO)
    .order("created_at", { ascending: true })
    .limit(1);
  if (findError) throw new Error(`Falha ao consultar pacientes: ${findError.message}`);

  let patientId = existing?.[0]?.id;
  let created = false;

  if (!patientId) {
    const patient: TablesInsert<"patients"> = {
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
    };

    const { data, error } = await supabase.from("patients").insert(patient).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Falha ao cadastrar paciente fictício");

    patientId = data.id;
    created = true;
  }

  const id: string = patientId;

  if (!(await hasRows("aldrete_evaluations", id))) {
    const series = [
      { atividade: 2, respiracao: 2, circulacao: 1, consciencia: 2, saturacao: 2, offset: 25 },
      { atividade: 2, respiracao: 2, circulacao: 2, consciencia: 2, saturacao: 2, offset: 8 },
    ];
    const rows: TablesInsert<"aldrete_evaluations">[] = series.map((s) => ({
      patient_id: id,
      atividade: s.atividade,
      respiracao: s.respiracao,
      circulacao: s.circulacao,
      consciencia: s.consciencia,
      saturacao: s.saturacao,
      total: s.atividade + s.respiracao + s.circulacao + s.consciencia + s.saturacao,
      evaluated_at: minutesAgo(s.offset),
    }));
    const { error } = await supabase.from("aldrete_evaluations").insert(rows);
    if (error) throw new Error(`Falha ao inserir avaliações de Aldrete: ${error.message}`);
  }

  if (!(await hasRows("vital_signs", id))) {
    const rows: TablesInsert<"vital_signs">[] = [
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
    ];
    const { error } = await supabase.from("vital_signs").insert(rows);
    if (error) throw new Error(`Falha ao inserir sinais vitais: ${error.message}`);
  }

  if (!(await hasRows("medications", id))) {
    const rows: TablesInsert<"medications">[] = [
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
    ];
    const { error } = await supabase.from("medications").insert(rows);
    if (error) throw new Error(`Falha ao inserir medicações: ${error.message}`);
  }

  if (!(await hasRows("alerts", id))) {
    const alert: TablesInsert<"alerts"> = {
      patient_id: id,
      tipo: "proxima_avaliacao",
      prioridade: "media",
      mensagem: "Reavaliação de Aldrete prevista em 10 minutos.",
    };
    const { error } = await supabase.from("alerts").insert(alert);
    if (error) throw new Error(`Falha ao inserir alerta: ${error.message}`);
  }

  return { id, created };
}
