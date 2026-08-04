import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PatientHeaderCard } from "@/components/patient-header-card";
import { useSelectedPatientId, setSelectedPatientId } from "@/lib/patient-context";
import { formatTime, nextEvalFrom } from "@/lib/rpa-utils";
import { useActivePatients } from "@/hooks/use-active-patients";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/medicacoes")({
  component: MedicacoesPage,
});

const RESTART_TIMER_MEDS = ["dipirona", "tramadol", "morfina", "fentanil", "ondansetrona"];

function MedicacoesPage() {
  const qc = useQueryClient();
  const selectedId = useSelectedPatientId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ medicamento: "", dose: "", via: "EV", observacao: "", profissional: "" });

  const { data: patients = [] } = useActivePatients();
  const patient = patients.find((p) => p.id === selectedId) ?? patients[0];

  const { data: meds = [] } = useQuery({
    queryKey: ["meds", patient?.id],
    enabled: !!patient?.id,
    queryFn: async () => {
      const { data } = await supabase.from("medications")
        .select("*").eq("patient_id", patient!.id)
        .order("horario", { ascending: false });
      return data ?? [];
    },
  });

  async function handleAdd() {
    if (!patient || !form.medicamento || !form.dose) { toast.error("Preencha medicamento e dose"); return; }
    const now = new Date().toISOString();
    const { error } = await supabase.from("medications").insert({
      patient_id: patient.id,
      medicamento: form.medicamento,
      dose: form.dose,
      via: form.via,
      observacao: form.observacao || null,
      profissional: form.profissional || null,
      horario: now,
    });
    if (error) { toast.error(error.message); return; }

    // Restart evaluation timer for known analgesics/antiemetics
    if (RESTART_TIMER_MEDS.some((k) => form.medicamento.toLowerCase().includes(k))) {
      await supabase.from("patients").update({ proxima_avaliacao: nextEvalFrom(now, 15) }).eq("id", patient.id);
      toast.success("Medicação registrada. Reavaliação reiniciada em 15 min.");
    } else {
      toast.success("Medicação registrada");
    }
    setOpen(false);
    setForm({ medicamento: "", dose: "", via: "EV", observacao: "", profissional: "" });
    qc.invalidateQueries({ queryKey: ["meds"] });
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Medicação removida"); qc.invalidateQueries({ queryKey: ["meds"] }); }
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

      <section className="surface-card p-5">
        <h3 className="text-primary font-semibold mb-4">Medicações administradas</h3>
        <div className="space-y-3">
          {meds.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">Sem medicações registradas.</div>
          )}
          {meds.map((m) => (
            <div key={m.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-foreground">{m.medicamento} {m.dose} {m.via}</div>
                {m.observacao && <div className="text-sm text-muted-foreground">{m.observacao}</div>}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(m.horario)}</span>
                </div>
                <button onClick={() => handleDelete(m.id)} className="text-danger p-1.5 rounded hover:bg-muted" aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Button onClick={() => setOpen(true)} disabled={!patient} className="gap-2 px-6">
            <Plus className="h-4 w-4" />ADICIONAR MEDICAÇÃO
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova medicação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Medicamento</Label><Input value={form.medicamento} onChange={(e) => setForm({ ...form, medicamento: e.target.value })} placeholder="Ex: Dipirona" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Dose</Label><Input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="1g" /></div>
              <div><Label>Via</Label>
                <Select value={form.via} onValueChange={(v) => setForm({ ...form, via: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EV">EV</SelectItem>
                    <SelectItem value="IM">IM</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="VO">VO</SelectItem>
                    <SelectItem value="Inalatória">Inalatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Observação</Label><Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Ex: Dor moderada" /></div>
            <div><Label>Profissional</Label><Input value={form.profissional} onChange={(e) => setForm({ ...form, profissional: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
