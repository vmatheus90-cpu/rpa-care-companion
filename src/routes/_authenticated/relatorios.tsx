import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
      const [patients, evals, discharges] = await Promise.all([
        supabase.from("patients").select("id, entrada_rpa, updated_at, status").gte("entrada_rpa", start.toISOString()),
        supabase.from("aldrete_evaluations").select("id, evaluated_at").gte("evaluated_at", start.toISOString()),
        supabase.from("patients").select("id, entrada_rpa, updated_at").eq("status", "alta").gte("updated_at", start.toISOString()),
      ]);

      // Time series (last 7 days)
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        return { day: d.toLocaleDateString("pt-BR", { weekday: "short" }), key, pacientes: 0, avaliacoes: 0, altas: 0 };
      });

      patients.data?.forEach((p) => {
        const k = p.entrada_rpa.slice(0, 10);
        const row = days.find((r) => r.key === k); if (row) row.pacientes++;
      });
      evals.data?.forEach((e) => {
        const k = e.evaluated_at.slice(0, 10);
        const row = days.find((r) => r.key === k); if (row) row.avaliacoes++;
      });
      discharges.data?.forEach((d) => {
        const k = (d.updated_at ?? d.entrada_rpa).slice(0, 10);
        const row = days.find((r) => r.key === k); if (row) row.altas++;
      });

      // Average time RPA (entry -> discharge/updated_at when status=alta)
      const times = (discharges.data ?? []).map((d) =>
        (new Date(d.updated_at).getTime() - new Date(d.entrada_rpa).getTime()) / 60000
      );
      const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

      return {
        chart: days,
        total: patients.data?.length ?? 0,
        avgTime,
        evals: evals.data?.length ?? 0,
        discharges: discharges.data?.length ?? 0,
      };
    },
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-foreground">Relatórios — últimos 7 dias</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Pacientes" value={data?.total ?? 0} />
        <Kpi label="Avaliações realizadas" value={data?.evals ?? 0} />
        <Kpi label="Altas" value={data?.discharges ?? 0} />
        <Kpi label="Tempo médio na RPA" value={data ? `${data.avgTime} min` : "—"} />
      </div>

      <section className="surface-card p-5">
        <h3 className="text-primary font-semibold mb-4">Indicadores diários</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="pacientes" fill="oklch(0.38 0.07 175)" name="Pacientes" />
              <Bar dataKey="avaliacoes" fill="oklch(0.6 0.14 240)" name="Avaliações" />
              <Bar dataKey="altas" fill="oklch(0.55 0.15 155)" name="Altas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="kpi-card">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-3xl font-bold mt-2 text-foreground">{value}</div>
    </div>
  );
}
