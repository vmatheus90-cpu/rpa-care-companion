import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ClipboardCopy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatTime, formatDate, minutesBetween } from "@/lib/rpa-utils";
import { toast } from "sonner";

const MIN_RPA_MINUTES = 30; // tempo mínimo em RPA para permitir alta

type Patient = {
  id: string;
  nome: string;
  idade: number | null;
  sexo: string | null;
  prontuario: string | null;
  procedimento: string | null;
  cirurgiao: string | null;
  anestesista: string | null;
  entrada_rpa: string | null;
  status: string;
  updated_at?: string | null;
};

export function DischargePanel({ patient }: { patient: Patient | null | undefined }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: latestAldrete } = useQuery({
    queryKey: ["discharge-aldrete", patient?.id],
    enabled: !!patient?.id,
    queryFn: async () => {
      const { data } = await supabase.from("aldrete_evaluations")
        .select("*").eq("patient_id", patient!.id)
        .order("evaluated_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ["discharge-vitals", patient?.id],
    enabled: !!patient?.id && open,
    queryFn: async () => {
      const { data } = await supabase.from("vital_signs")
        .select("*").eq("patient_id", patient!.id)
        .order("recorded_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: meds = [] } = useQuery({
    queryKey: ["discharge-meds", patient?.id],
    enabled: !!patient?.id && open,
    queryFn: async () => {
      const { data } = await supabase.from("medications")
        .select("*").eq("patient_id", patient!.id)
        .order("horario", { ascending: true });
      return data ?? [];
    },
  });

  const { data: aldretes = [] } = useQuery({
    queryKey: ["discharge-aldrete-all", patient?.id],
    enabled: !!patient?.id && open,
    queryFn: async () => {
      const { data } = await supabase.from("aldrete_evaluations")
        .select("*").eq("patient_id", patient!.id)
        .order("evaluated_at", { ascending: true });
      return data ?? [];
    },
  });

  const minutesInRpa = useMemo(() => {
    if (!patient?.entrada_rpa) return 0;
    return minutesBetween(new Date(patient.entrada_rpa), new Date());
  }, [patient?.entrada_rpa]);

  if (!patient) return null;

  const alreadyDischarged = patient.status === "alta";
  const eligible = (latestAldrete?.total ?? 0) >= 9 && minutesInRpa >= MIN_RPA_MINUTES;

  if (!eligible && !alreadyDischarged) return null;

  async function confirmDischarge() {
    if (!patient) return;
    const { error } = await supabase.from("patients")
      .update({ status: "alta" }).eq("id", patient.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${patient.nome} recebeu alta da RPA`);
    qc.invalidateQueries({ queryKey: ["active-patients"] });
    qc.invalidateQueries({ queryKey: ["patients-list"] });
    qc.invalidateQueries({ queryKey: ["dashboard-patients"] });
    qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
  }

  const report = buildReport({ patient, aldretes, vitals, meds, minutesInRpa });

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Relatório copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  }

  return (
    <>
      <section className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-[color:var(--success)]/30 bg-[color:var(--success-soft)]">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-[color:var(--success)] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold text-foreground">
              {alreadyDischarged ? "Alta realizada" : "Paciente apto para alta"}
            </div>
            <div className="text-sm text-muted-foreground">
              Tempo na RPA: {formatMinutes(minutesInRpa)} · Aldrete atual: {latestAldrete?.total ?? "—"}/10
            </div>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 shrink-0">
          <LogOut className="h-4 w-4" />
          {alreadyDischarged ? "Ver relatório de alta" : "Dar alta"}
        </Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Relatório de alta da RPA</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Revise o resumo abaixo e copie para o prontuário.
            </p>
            <textarea
              readOnly
              value={report}
              className="w-full h-80 rounded-md border border-border bg-muted/30 p-3 text-sm font-mono text-foreground resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={copyReport} className="gap-2">
              <ClipboardCopy className="h-4 w-4" /> Copiar
            </Button>
            {!alreadyDischarged && (
              <Button
                onClick={async () => { await confirmDischarge(); setOpen(false); }}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Confirmar alta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h${String(r).padStart(2, "0")}`;
}

function fmtVital(v: {
  pa_sistolica: number | null; pa_diastolica: number | null;
  fc: number | null; fr: number | null; saturacao: number | null;
  temperatura: number | string | null; eva: number | null;
}): string {
  const parts: string[] = [];
  if (v.pa_sistolica != null && v.pa_diastolica != null) parts.push(`PA ${v.pa_sistolica}/${v.pa_diastolica} mmHg`);
  if (v.fc != null) parts.push(`FC ${v.fc} bpm`);
  if (v.fr != null) parts.push(`FR ${v.fr} irpm`);
  if (v.saturacao != null) parts.push(`SatO₂ ${v.saturacao}%`);
  if (v.temperatura != null) parts.push(`T ${v.temperatura}°C`);
  if (v.eva != null) parts.push(`EVA ${v.eva}/10`);
  return parts.join(" · ") || "—";
}

function buildReport(args: {
  patient: Patient;
  aldretes: Array<{ evaluated_at: string; atividade: number; respiracao: number; circulacao: number; consciencia: number; saturacao: number; total: number }>;
  vitals: Array<Parameters<typeof fmtVital>[0] & { recorded_at: string }>;
  meds: Array<{ horario: string; medicamento: string; dose: string; via: string; observacao: string | null }>;
  minutesInRpa: number;
}): string {
  const { patient, aldretes, vitals, meds, minutesInRpa } = args;
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push("RELATÓRIO DE ALTA — SALA DE RECUPERAÇÃO PÓS-ANESTÉSICA");
  lines.push("");
  lines.push(`Paciente: ${patient.nome}`);
  lines.push(`Prontuário: ${patient.prontuario ?? "—"} · Idade: ${patient.idade ?? "—"} · Sexo: ${patient.sexo ?? "—"}`);
  if (patient.procedimento) lines.push(`Procedimento: ${patient.procedimento}`);
  if (patient.cirurgiao) lines.push(`Cirurgião: ${patient.cirurgiao}`);
  if (patient.anestesista) lines.push(`Anestesista: ${patient.anestesista}`);
  lines.push("");
  lines.push(`Entrada na RPA: ${formatDate(patient.entrada_rpa)} ${formatTime(patient.entrada_rpa)}`);
  lines.push(`Alta da RPA: ${formatDate(now)} ${formatTime(now)}`);
  lines.push(`Tempo de permanência: ${formatMinutes(minutesInRpa)}`);
  lines.push("");

  lines.push("SINAIS VITAIS REGISTRADOS:");
  if (vitals.length === 0) {
    lines.push("  — sem registros —");
  } else {
    for (const v of vitals) lines.push(`  ${formatTime(v.recorded_at)} — ${fmtVital(v)}`);
  }
  lines.push("");

  lines.push("ESCORE DE ALDRETE:");
  if (aldretes.length === 0) {
    lines.push("  — sem avaliações —");
  } else {
    for (const a of aldretes) {
      lines.push(`  ${formatTime(a.evaluated_at)} — Ativ ${a.atividade} · Resp ${a.respiracao} · Circ ${a.circulacao} · Consc ${a.consciencia} · SatO₂ ${a.saturacao} = ${a.total}/10`);
    }
  }
  lines.push("");

  lines.push("MEDICAÇÕES ADMINISTRADAS:");
  if (meds.length === 0) {
    lines.push("  — nenhuma —");
  } else {
    for (const m of meds) {
      const obs = m.observacao ? ` (${m.observacao})` : "";
      lines.push(`  ${formatTime(m.horario)} — ${m.medicamento} ${m.dose} ${m.via}${obs}`);
    }
  }
  lines.push("");

  const last = aldretes[aldretes.length - 1];
  lines.push("CONCLUSÃO:");
  lines.push(
    last
      ? `  Paciente com Aldrete final ${last.total}/10, hemodinamicamente estável, encaminhado à unidade de destino.`
      : `  Paciente encaminhado à unidade de destino.`,
  );

  return lines.join("\n");
}
