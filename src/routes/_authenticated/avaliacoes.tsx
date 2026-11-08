import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientHeaderCard } from "@/components/patient-header-card";
import { DischargePanel } from "@/components/discharge-panel";
import { useSelectedPatientId, setSelectedPatientId } from "@/lib/patient-context";
import { formatTime, nextEvalFrom } from "@/lib/rpa-utils";
import { useActivePatients } from "@/hooks/use-active-patients";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/avaliacoes")({
  component: AvaliacoesPage,
});

const CATS = [
  { key: "atividade", label: "Atividade" },
  { key: "respiracao", label: "Respiração" },
  { key: "circulacao", label: "Circulação" },
  { key: "consciencia", label: "Consciência" },
  { key: "saturacao", label: "Saturação O₂" },
] as const;

type Cat = (typeof CATS)[number]["key"];
type Scores = Record<Cat, number>;

function AvaliacoesPage() {
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const selectedId = useSelectedPatientId();
  const [scores, setScores] = useState<Scores>({
    atividade: 2, respiracao: 2, circulacao: 1, consciencia: 2, saturacao: 2,
  });
  const [countdown, setCountdown] = useState<string>("--:--");
  const [saving, setSaving] = useState(false);

  const { data: patients = [] } = useActivePatients();

  const patient = patients.find((p) => p.id === selectedId) ?? patients[0];

  useEffect(() => {
    if (!selectedId && patients[0]) setSelectedPatientId(patients[0].id);
  }, [selectedId, patients]);

  const { data: history = [] } = useQuery({
    queryKey: ["aldrete-history", patient?.id],
    enabled: !!patient?.id,
    queryFn: async () => {
      const { data } = await supabase.from("aldrete_evaluations")
        .select("*").eq("patient_id", patient!.id)
        .order("evaluated_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);

  // Countdown to next evaluation
  useEffect(() => {
    if (!patient?.proxima_avaliacao) { setCountdown("--:--"); return; }
    const target = new Date(patient.proxima_avaliacao).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setCountdown("00:00"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [patient?.proxima_avaliacao]);

  async function handleSave() {
    if (!patient || saving) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const next = nextEvalFrom(nowIso, 15);
      const status = total >= 9 ? "pronto_para_alta" : "em_avaliacao";

      const { error: e1 } = await supabase.from("aldrete_evaluations").insert({
        patient_id: patient.id, ...scores, total, evaluated_at: nowIso,
      });
      if (e1) throw new Error(e1.message);

      const { error: e2 } = await supabase
        .from("patients")
        .update({ proxima_avaliacao: next, status })
        .eq("id", patient.id);
      if (e2) throw new Error(e2.message);

      // Alertas são complementares: nunca bloqueiam a conclusão da avaliação.
      if (total >= 9) {
        await supabase.from("alerts").insert({
          patient_id: patient.id, tipo: "apto_alta", prioridade: "alta",
          mensagem: `${patient.nome} apto para alta (Aldrete ${total}/10).`,
        });
      } else if (total <= 6) {
        await supabase.from("alerts").insert({
          patient_id: patient.id, tipo: "aldrete_baixo", prioridade: "critica",
          mensagem: `${patient.nome}: Aldrete ${total}/10. Atenção.`,
        });
      }

      toast.success(`Avaliação salva — Aldrete ${total}/10`);

      // Volta para o Dashboard na hora: o refresh das listas roda em background,
      // sem segurar a navegação enquanto os refetch terminam.
      navigate({ to: "/dashboard" });
      void Promise.all([
        qc.invalidateQueries({ queryKey: ["aldrete-history"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-patients"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
        qc.invalidateQueries({ queryKey: ["active-patients"] }),
        qc.invalidateQueries({ queryKey: ["unread-alerts"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a avaliação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Patient selector when several available */}
      {patients.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Paciente:</span>
          <Select value={patient?.id ?? ""} onValueChange={(v) => setSelectedPatientId(v)}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PatientHeaderCard patient={patient ?? null} />

        <div className="surface-card p-4 flex items-center justify-between bg-[color:var(--success-soft)] border-[color:var(--success)]/20">
          <div className="flex items-center gap-3">
            <Clock className="h-9 w-9 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">Próxima avaliação em:</div>
              <div className="text-3xl font-bold text-primary tabular-nums">{countdown}</div>
            </div>
          </div>
          <Bell className="h-6 w-6 text-primary" />
        </div>
      </div>

      <DischargePanel patient={patient ?? null} />



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scoring */}
        <section className="surface-card p-5">
          <h3 className="text-primary font-semibold mb-4">Escore de Aldrete</h3>
          <div className="space-y-3">
            {CATS.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{c.label}</span>
                <div className="flex gap-2">
                  {[0, 1, 2].map((n) => (
                    <button
                      key={n}
                      onClick={() => setScores({ ...scores, [c.key]: n })}
                      className={cn(
                        "h-9 w-11 rounded-md text-sm font-semibold border transition-colors",
                        scores[c.key] === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:bg-muted",
                      )}
                    >{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
            <span className="font-semibold text-foreground">TOTAL</span>
            <span className={cn("text-2xl font-bold", total >= 9 ? "text-primary" : total <= 6 ? "text-danger" : "text-foreground")}>
              {total} / 10
            </span>
          </div>
          {total >= 9 && (
            <div className="mt-3 p-3 rounded-md bg-[color:var(--success-soft)] text-[color:var(--success)] text-sm font-medium flex items-center gap-2">
              🟢 Paciente apto para alta.
            </div>
          )}
        </section>

        {/* History */}
        <section className="surface-card p-5">
          <h3 className="text-primary font-semibold mb-4">Histórico de avaliações</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 font-medium">Horário</th>
                  <th className="py-2 font-medium">Ativ.</th>
                  <th className="py-2 font-medium">Resp.</th>
                  <th className="py-2 font-medium">Circ.</th>
                  <th className="py-2 font-medium">Consc.</th>
                  <th className="py-2 font-medium">SatO₂</th>
                  <th className="py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Sem avaliações.</td></tr>
                )}
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-muted-foreground">{formatTime(h.evaluated_at)}</td>
                    <td className="py-2.5">{h.atividade}</td>
                    <td className="py-2.5">{h.respiracao}</td>
                    <td className="py-2.5">{h.circulacao}</td>
                    <td className="py-2.5">{h.consciencia}</td>
                    <td className="py-2.5">{h.saturacao}</td>
                    <td className="py-2.5 font-semibold">{h.total}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setScores({ atividade: 0, respiracao: 0, circulacao: 0, consciencia: 0, saturacao: 0 })}>
          CANCELAR
        </Button>
        <Button type="button" onClick={handleSave} disabled={!patient || saving}>
          {saving ? "SALVANDO..." : "SALVAR E CONCLUIR"}
        </Button>
      </div>
    </div>
  );
}
