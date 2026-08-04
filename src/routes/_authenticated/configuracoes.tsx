import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfigPage,
});

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  anestesista: "Anestesista",
  enfermeiro: "Enfermeiro",
  tecnico: "Técnico",
};

const PERMS: Array<{ role: string; perms: string[] }> = [
  { role: "admin", perms: ["Gerenciar usuários e papéis", "Excluir pacientes e registros", "Todos os acessos clínicos"] },
  { role: "anestesista", perms: ["Registrar/editar avaliações Aldrete", "Prescrever e registrar medicações", "Registrar sinais vitais"] },
  { role: "enfermeiro", perms: ["Registrar avaliações Aldrete", "Registrar sinais vitais", "Registrar medicações administradas"] },
  { role: "tecnico", perms: ["Registrar sinais vitais", "Visualizar dados clínicos"] },
];

function ConfigPage() {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["current-profile-config"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return { ...p, email: u.user.email, roles: roles?.map((r) => r.role) ?? [] };
    },
  });

  useEffect(() => { if (profile?.full_name) setFullName(profile.full_name); }, [profile?.full_name]);

  async function handleSave() {
    if (!profile?.id) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
    if (error) toast.error(error.message);
    else { toast.success("Perfil atualizado"); qc.invalidateQueries({ queryKey: ["current-profile"] }); }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <section className="surface-card p-5">
        <h3 className="text-primary font-semibold mb-4">Meu perfil</h3>
        <div className="space-y-3">
          <div><Label>E-mail</Label><Input value={profile?.email ?? ""} disabled /></div>
          <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><Label>Papel</Label>
            <Input value={profile?.roles?.map((r: string) => ROLE_LABELS[r] ?? r).join(", ") || "Enfermeiro"} disabled />
            <p className="text-xs text-muted-foreground mt-1">Alterações de papel devem ser feitas por um administrador.</p>
          </div>
          <div><Button onClick={handleSave}>Salvar</Button></div>
        </div>
      </section>

      <section className="surface-card p-5">
        <h3 className="text-primary font-semibold mb-4">Perfis e permissões</h3>
        <div className="space-y-4">
          {PERMS.map((r) => (
            <div key={r.role} className="border border-border rounded-lg p-4">
              <div className="font-semibold text-foreground mb-2">{ROLE_LABELS[r.role]}</div>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                {r.perms.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
