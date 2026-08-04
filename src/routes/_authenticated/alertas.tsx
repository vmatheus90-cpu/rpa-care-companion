import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTime } from "@/lib/rpa-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alertas")({
  component: AlertasPage,
});

const TIPO_CONFIG = {
  reavaliacao_vencida: { color: "danger", label: "Reavaliação vencida" },
  proxima_avaliacao: { color: "warning", label: "Próxima avaliação" },
  aldrete_baixo: { color: "warning", label: "Aldrete baixo" },
  permanencia_prolongada: { color: "info", label: "Permanência prolongada" },
  apto_alta: { color: "success", label: "Apto para alta" },
} as const;

function AlertasPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("todos");

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts-list", filter],
    queryFn: async () => {
      let q = supabase.from("alerts").select("*, patients(nome)").order("created_at", { ascending: false }).limit(100);
      if (filter === "nao_lidos") q = q.eq("lido", false);
      if (filter === "lidos") q = q.eq("lido", true);
      const { data } = await q;
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" },
        () => { qc.invalidateQueries({ queryKey: ["alerts-list"] }); qc.invalidateQueries({ queryKey: ["unread-alerts"] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  async function markRead(id: string) {
    await supabase.from("alerts").update({ lido: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["alerts-list"] });
    qc.invalidateQueries({ queryKey: ["unread-alerts"] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Alertas e notificações</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="nao_lidos">Não lidos</SelectItem>
            <SelectItem value="lidos">Lidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">Sem alertas.</div>
        )}
        {alerts.map((a) => {
          const cfg = TIPO_CONFIG[a.tipo as keyof typeof TIPO_CONFIG] ?? { color: "info", label: a.tipo };
          const bg = {
            danger: "bg-[color:var(--danger-soft)] border-danger/20",
            warning: "bg-[color:var(--warning-soft)] border-warning/20",
            info: "bg-info/5 border-info/20",
            success: "bg-[color:var(--success-soft)] border-success/20",
          }[cfg.color];
          const iconColor = {
            danger: "text-danger",
            warning: "text-warning",
            info: "text-info",
            success: "text-[color:var(--success)]",
          }[cfg.color];
          const patientName = (a as { patients?: { nome?: string } }).patients?.nome ?? "Paciente";
          return (
            <div key={a.id} className={cn("border rounded-lg p-4 flex items-center gap-4", bg)}>
              <Bell className={cn("h-6 w-6 shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{patientName}</div>
                <div className="text-sm text-muted-foreground">{a.mensagem}</div>
              </div>
              <div className="text-sm text-muted-foreground shrink-0">{formatTime(a.created_at)}</div>
              {a.lido ? (
                <span className="text-xs px-3 py-1 rounded-md bg-[color:var(--success-soft)] text-[color:var(--success)] font-medium shrink-0">Lido</span>
              ) : (
                <button
                  onClick={() => markRead(a.id)}
                  className="text-xs px-3 py-1 rounded-md bg-[color:var(--danger-soft)] text-danger font-medium shrink-0 hover:opacity-80"
                >
                  Não lido
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
