import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Eye, FlaskConical, Play, Loader2 } from "lucide-react";
import { addDemoPatient } from "@/lib/demo-patient";
import { formatTime, statusLabel, nowBrasiliaLocalInput, nextEvalFrom } from "@/lib/rpa-utils";
import { setSelectedPatientId } from "@/lib/patient-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pacientes")({
  component: PacientesPage,
});

type PatientForm = {
  nome: string; idade: string; sexo: "M" | "F"; prontuario: string;
  procedimento: string; cirurgiao: string; anestesista: string;
  entrada_rpa: string; status: string;
};

const emptyForm: PatientForm = {
  nome: "", idade: "", sexo: "M", prontuario: "",
  procedimento: "", cirurgiao: "", anestesista: "",
  entrada_rpa: nowBrasiliaLocalInput(true),
  status: "em_avaliacao",
};

function PacientesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list", search],
    queryFn: async () => {
      let q = supabase.from("patients").select("*").order("entrada_rpa", { ascending: false });
      if (search) {
        // Escape PostgREST reserved chars in or() filter to avoid injection / parse errors
        const safe = search.replace(/[,()*"\\]/g, " ").trim();
        if (safe) q = q.or(`nome.ilike.%${safe}%,prontuario.ilike.%${safe}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    placeholderData: (prev) => prev,
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: typeof patients[number]) {
    setEditing(p.id);
    setForm({
      nome: p.nome, idade: String(p.idade), sexo: p.sexo, prontuario: p.prontuario,
      procedimento: p.procedimento ?? "", cirurgiao: p.cirurgiao ?? "", anestesista: p.anestesista ?? "",
      entrada_rpa: new Date(p.entrada_rpa).toISOString().slice(0, 16),
      status: p.status,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nome || !form.prontuario || !form.idade) {
      toast.error("Preencha nome, idade e prontuário.");
      return;
    }
    const payload = {
      nome: form.nome, idade: Number(form.idade), sexo: form.sexo, prontuario: form.prontuario,
      procedimento: form.procedimento || null, cirurgiao: form.cirurgiao || null, anestesista: form.anestesista || null,
      entrada_rpa: new Date(form.entrada_rpa).toISOString(),
      status: form.status as "em_avaliacao",
    };
    if (editing) {
      const { error } = await supabase.from("patients").update(payload).eq("id", editing);
      if (error) { toast.error(error.message); return; }
      toast.success("Paciente atualizado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["patients-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-patients"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    } else {
      const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "Falha ao cadastrar"); return; }
      toast.success("Paciente cadastrado — registre Aldrete e sinais vitais");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["patients-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-patients"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      setSelectedPatientId(data.id);
      navigate({ to: "/avaliacoes", search: { next: "sinais-vitais" } as never });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("patients").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); }
    else { toast.success("Paciente excluído"); qc.invalidateQueries({ queryKey: ["patients-list"] }); }
    setDeleteId(null);
  }

  async function handleAddDemo() {
    setDemoLoading(true);
    try {
      const { id, created } = await addDemoPatient();
      toast.success(
        created
          ? "Paciente fictício adicionado à RPA (com avaliações, sinais vitais e medicações)"
          : "Paciente fictício já existia — abrindo o registro",
      );
      qc.invalidateQueries({ queryKey: ["patients-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-patients"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      qc.invalidateQueries({ queryKey: ["active-patients"] });
      setSelectedPatientId(id);
      navigate({ to: "/avaliacoes" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao adicionar paciente fictício");
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleStartEvaluation(p: { id: string; nome: string; status: string }) {
    setStartingId(p.id);
    try {
      if (p.status === "em_avaliacao") {
        toast.info(`${p.nome} já está em avaliação — abrindo o registro.`);
        setSelectedPatientId(p.id);
        navigate({ to: "/avaliacoes" });
        return;
      }

      // Inicia o timer de 15 minutos já persistido no banco (sobrevive a reload/troca de tela)
      const proxima = nextEvalFrom(new Date().toISOString(), 15);
      const { error } = await supabase
        .from("patients")
        .update({ status: "em_avaliacao", proxima_avaliacao: proxima })
        .eq("id", p.id);
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(`${p.nome} em avaliação — timer de 15 min iniciado`);
      qc.invalidateQueries({ queryKey: ["patients-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard-patients"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      qc.invalidateQueries({ queryKey: ["active-patients"] });

      // Leva direto para o preenchimento do Aldrete (e daí para os sinais vitais)
      setSelectedPatientId(p.id);
      navigate({ to: "/avaliacoes" });
    } finally {
      setStartingId(null);
    }
  }

  function openPatient(id: string) {
    setSelectedPatientId(id);
    navigate({ to: "/avaliacoes" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Pacientes</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome ou prontuário"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 md:w-72"
            />
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />Novo paciente
          </Button>
          <Button variant="outline" onClick={handleAddDemo} disabled={demoLoading} className="gap-2">
            <FlaskConical className="h-4 w-4" />
            {demoLoading ? "Adicionando..." : "Paciente demo"}
          </Button>
        </div>
      </div>

      <section className="surface-card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2.5 font-medium">Nome</th>
                <th className="py-2.5 font-medium">Prontuário</th>
                <th className="py-2.5 font-medium">Idade/Sexo</th>
                <th className="py-2.5 font-medium">Procedimento</th>
                <th className="py-2.5 font-medium">Entrada</th>
                <th className="py-2.5 font-medium">Status</th>
                <th className="py-2.5 font-medium text-right pr-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum paciente cadastrado.</td></tr>
              )}
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-3 font-semibold text-foreground">{p.nome}</td>
                  <td className="py-3 text-muted-foreground">{p.prontuario}</td>
                  <td className="py-3 text-muted-foreground">{p.idade} • {p.sexo}</td>
                  <td className="py-3 text-muted-foreground">{p.procedimento ?? "—"}</td>
                  <td className="py-3 text-muted-foreground">{formatTime(p.entrada_rpa)}</td>
                  <td className="py-3">{statusLabel(p.status)}</td>
                  <td className="py-3 pr-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleStartEvaluation(p)}
                        disabled={startingId === p.id}
                        className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                        aria-label="Colocar em avaliação"
                        title={p.status === "em_avaliacao" ? "Paciente já está em avaliação" : "Colocar em avaliação"}
                      >
                        {startingId === p.id
                          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          : <Play className={cn("h-4 w-4", p.status === "em_avaliacao" ? "text-primary fill-primary" : "text-muted-foreground")} />}
                      </button>
                      <button onClick={() => openPatient(p.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" aria-label="Ver"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" aria-label="Editar"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded hover:bg-muted text-danger" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar paciente" : "Cadastrar paciente"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
            <Field label="Prontuário"><Input value={form.prontuario} onChange={(e) => setForm({ ...form, prontuario: e.target.value })} /></Field>
            <Field label="Idade"><Input type="number" value={form.idade} onChange={(e) => setForm({ ...form, idade: e.target.value })} /></Field>
            <Field label="Sexo">
              <Select value={form.sexo} onValueChange={(v) => setForm({ ...form, sexo: v as "M" | "F" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Procedimento"><Input value={form.procedimento} onChange={(e) => setForm({ ...form, procedimento: e.target.value })} /></Field>
            <Field label="Cirurgião"><Input value={form.cirurgiao} onChange={(e) => setForm({ ...form, cirurgiao: e.target.value })} /></Field>
            <Field label="Anestesista"><Input value={form.anestesista} onChange={(e) => setForm({ ...form, anestesista: e.target.value })} /></Field>
            <Field label="Entrada na RPA"><Input type="datetime-local" value={form.entrada_rpa} onChange={(e) => setForm({ ...form, entrada_rpa: e.target.value })} /></Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_avaliacao">Em avaliação</SelectItem>
                  <SelectItem value="aguardando_avaliacao">Aguardando avaliação</SelectItem>
                  <SelectItem value="pronto_para_alta">Pronto para alta</SelectItem>
                  <SelectItem value="alta">Alta realizada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação apagará também todos os registros vinculados (avaliações, sinais vitais, medicações, alertas). Apenas administradores podem excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger text-danger-foreground hover:bg-danger/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
