import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Droplet, HeartPulse, Wind, Activity, Thermometer, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientHeaderCard } from "@/components/patient-header-card";
import { useSelectedPatientId, setSelectedPatientId } from "@/lib/patient-context";
import { formatTime, nowBrasiliaLocalInput } from "@/lib/rpa-utils";
import { useActivePatients } from "@/hooks/use-active-patients";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sinais-vitais")({
  component: SinaisPage,
});

const emptyVitals = { pa_s: "", pa_d: "", fc: "", spo2: "", fr: "", temp: "", eva: "" };

function SinaisPage() {
  const qc = useQueryClient();
  const selectedId = useSelectedPatientId();
  const [form, setForm] = useState(emptyVitals);
  const [horario, setHorario] = useState(nowBrasiliaLocalInput());

  const { data: patients = [] } = useActivePatients();
  const patient = patients.find((p) => p.id === selectedId) ?? patients[0];

  const { data: history = [] } = useQuery({
    queryKey: ["vitals-history", patient?.id],
    enabled: !!patient?.id,
    queryFn: async () => {
      const { data } = await supabase.from("vital_signs")
        .select("*").eq("patient_id", patient!.id)
        .order("recorded_at", { ascending: true }).limit(20);
      return data ?? [];
    },
  });

  const chartData = history.map((h) => ({
    time: formatTime(h.recorded_at),
    "PA Sistólica": h.pa_sistolica,
    "FC": h.fc,
    "SpO₂": h.saturacao,
  }));

  async function handleSave() {
    if (!patient) { toast.error("Selecione um paciente"); return; }
    const now = new Date();
    const [hh, mm] = horario.split(":");
    now.setHours(Number(hh), Number(mm), 0, 0);
    const { error } = await supabase.from("vital_signs").insert({
      patient_id: patient.id,
      pa_sistolica: form.pa_s ? Number(form.pa_s) : null,
      pa_diastolica: form.pa_d ? Number(form.pa_d) : null,
      fc: form.fc ? Number(form.fc) : null,
      fr: form.fr ? Number(form.fr) : null,
      saturacao: form.spo2 ? Number(form.spo2) : null,
      temperatura: form.temp ? Number(form.temp) : null,
      eva: form.eva ? Number(form.eva) : null,
      recorded_at: now.toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Sinais vitais registrados");
    setForm(emptyVitals);
    qc.invalidateQueries({ queryKey: ["vitals-history"] });
  }

  return (
    <div className="space-y-5">
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

      <PatientHeaderCard patient={patient ?? null} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="surface-card p-5 space-y-3">
          <FieldRow icon={Droplet} label="Pressão Arterial (mmHg)">
            <div className="flex items-center gap-2">
              <Input value={form.pa_s} onChange={(e) => setForm({ ...form, pa_s: e.target.value })} placeholder="120" className="w-20" />
              <span className="text-muted-foreground">/</span>
              <Input value={form.pa_d} onChange={(e) => setForm({ ...form, pa_d: e.target.value })} placeholder="80" className="w-20" />
            </div>
          </FieldRow>
          <FieldRow icon={HeartPulse} label="Frequência Cardíaca (bpm)">
            <Input value={form.fc} onChange={(e) => setForm({ ...form, fc: e.target.value })} placeholder="78" className="w-28" />
          </FieldRow>
          <FieldRow icon={Activity} label="Saturação O₂ (%)">
            <Input value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} placeholder="98" className="w-28" />
          </FieldRow>
          <FieldRow icon={Wind} label="Frequência Respiratória (irpm)">
            <Input value={form.fr} onChange={(e) => setForm({ ...form, fr: e.target.value })} placeholder="16" className="w-28" />
          </FieldRow>
          <FieldRow icon={Thermometer} label="Temperatura (°C)">
            <Input value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} placeholder="36,6" className="w-28" />
          </FieldRow>
          <FieldRow icon={Activity} label="EVA (0–10)">
            <Input value={form.eva} onChange={(e) => setForm({ ...form, eva: e.target.value })} placeholder="0" className="w-28" />
          </FieldRow>
          <FieldRow icon={Clock} label="Horário da avaliação">
            <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="w-32" />
          </FieldRow>
        </section>

        <section className="surface-card p-5">
          <h3 className="text-primary font-semibold mb-3">Evolução</h3>
          <div className="h-72">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem registros para plotar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="PA Sistólica" stroke="#e11d48" strokeWidth={2} />
                  <Line type="monotone" dataKey="FC" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="SpO₂" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setForm(emptyVitals)}>LIMPAR</Button>
        <Button onClick={handleSave} disabled={!patient}>SALVAR</Button>
      </div>
    </div>
  );
}

function FieldRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
