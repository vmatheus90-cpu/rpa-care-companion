import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, statusLabel } from "@/lib/rpa-utils";
import { setSelectedPatientId } from "@/lib/patient-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

type MonitoringRow = {
  id: string;
  nome: string;
  entrada_rpa: string;
  status: string;
  proxima_avaliacao: string | null;
  last_time: string | null;
  last_score: number | null;
};

function DashboardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: patients = [] } = useQuery({
    queryKey: ["dashboard-patients"],
    queryFn: async () => {
      const { data: pts, error } = await supabase
        .from("patients")
        .select("id, nome, entrada_rpa, status, proxima_avaliacao")
        .neq("status", "alta")
        .order("entrada_rpa", { ascending: true });
      if (error) throw error;
      const ids = (pts ?? []).map((p) => p.id);
      if (ids.length === 0) return [];

      // Single batched query for latest evaluations (was N+1)
      const { data: evals } = await supabase
        .from("aldrete_evaluations")
        .select("patient_id, total, evaluated_at")
        .in("patient_id", ids)
        .order("evaluated_at", { ascending: false });

      const lastByPatient = new Map<string, { total: number; evaluated_at: string }>();
      for (const e of evals ?? []) {
        if (!lastByPatient.has(e.patient_id)) {
          lastByPatient.set(e.patient_id, { total: e.total, evaluated_at: e.evaluated_at });
        }
      }
      return (pts ?? []).map<MonitoringRow>((p) => {
        const last = lastByPatient.get(p.id);
        return { ...p, last_time: last?.evaluated_at ?? null, last_score: last?.total ?? null };
      });
    },
    staleTime: 5000,
  });

  const { data: kpis } = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [inRpa, waiting, evals, discharges] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }).neq("status", "alta"),
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "aguardando_avaliacao"),
        supabase.from("aldrete_evaluations").select("*", { count: "exact", head: true }).gte("evaluated_at", start),
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("status", "alta").gte("updated_at", start),
      ]);
      return {
        inRpa: inRpa.count ?? 0,
        waiting: waiting.count ?? 0,
        evals: evals.count ?? 0,
        discharges: discharges.count ?? 0,
      };
    },
    staleTime: 10000,
  });

  useEffect(() => {
    const ch = supabase.channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" },
        () => { qc.invalidateQueries({ queryKey: ["dashboard-patients"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpis"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "aldrete_evaluations" },
        () => { qc.invalidateQueries({ queryKey: ["dashboard-patients"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpis"] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  function openPatient(id: string) {
    setSelectedPatientId(id);
    navigate({ to: "/avaliacoes" });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Visão geral</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Pacientes na RPA" value={kpis?.inRpa ?? 0} sub="Em monitoramento" color="text-foreground" />
        <KpiCard label="Aguardando avaliação" value={kpis?.waiting ?? 0} sub="Precisam de atenção" color="text-danger" />
        <KpiCard label="Avaliações hoje" value={kpis?.evals ?? 0} sub="Realizadas" color="text-primary" />
        <KpiCard label="Altas hoje" value={kpis?.discharges ?? 0} sub="Concluídas" color="text-primary" />
      </div>

      <section className="surface-card p-5 md:p-6">
        <h3 className="text-primary font-semibold mb-4">Pacientes em monitoramento</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2.5 font-medium">Paciente</th>
                <th className="py-2.5 font-medium">Entrada</th>
                <th className="py-2.5 font-medium">Última avaliação</th>
                <th className="py-2.5 font-medium">Escore Aldrete</th>
                <th className="py-2.5 font-medium">Próxima avaliação</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium text-right pr-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum paciente em monitoramento.</td></tr>
              )}
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-3.5 font-semibold text-foreground">{p.nome}</td>
                  <td className="py-3.5 text-muted-foreground">{formatTime(p.entrada_rpa)}</td>
                  <td className="py-3.5 text-muted-foreground">{formatTime(p.last_time)}</td>
                  <td className={cn("py-3.5 font-semibold",
                    p.last_score === null ? "text-muted-foreground"
                      : p.last_score >= 9 ? "text-primary"
                      : p.last_score <= 6 ? "text-danger" : "text-foreground")}>
                    {p.last_score !== null ? `${p.last_score} / 10` : "—"}
                  </td>
                  <td className="py-3.5 text-muted-foreground">{formatTime(p.proxima_avaliacao)}</td>
                  <td className={cn("py-3.5",
                    p.status === "pronto_para_alta" ? "text-primary font-medium" : "text-foreground")}>
                    {statusLabel(p.status)}
                  </td>
                  {/* Ações da linha: SOMENTE visualizar.
                      O botão de "reiniciar contagem regressiva" não existe no dashboard —
                      o próximo horário de avaliação é definido ao salvar o escore Aldrete. */}
                  <td className="py-3.5 text-right pr-2">
                    <button
                      type="button"
                      onClick={() => openPatient(p.id)}
                      className="p-1.5 rounded text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Visualizar paciente"
                      title="Visualizar paciente"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="kpi-card">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("text-4xl font-bold mt-2 mb-1", color)}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
