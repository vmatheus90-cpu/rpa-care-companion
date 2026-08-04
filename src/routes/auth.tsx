import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

type Role = "admin" | "anestesista" | "enfermeiro" | "tecnico";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "anestesista", label: "Anestesista" },
  { value: "enfermeiro", label: "Enfermeiro(a)" },
  { value: "tecnico", label: "Técnico(a) de Enfermagem" },
  { value: "admin", label: "Administrador" },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("enfermeiro");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, role },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Bem-vindo(a) à equipe.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md surface-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">RPA Monitor</h1>
            <p className="text-xs text-muted-foreground">Monitorização da Sala de Recuperação Pós-Anestésica</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-1">
          {mode === "signin" ? "Bem-vindo(a) de volta" : "Cadastro da equipe clínica"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin"
            ? "Entre para acompanhar seus pacientes em tempo real."
            : "Crie sua conta profissional. O acesso é liberado após verificação da equipe."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          {mode === "signup" && (
            <div>
              <Label htmlFor="role">Cargo</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="email">E-mail institucional</Label>
            <Input id="email" type="email" placeholder="nome@hospital.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Validando..." : mode === "signin" ? "Entrar no plantão" : "Criar acesso"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          {mode === "signin" ? "Novo por aqui?" : "Já tem uma conta?"}{" "}
          <button
            type="button"
            className="text-primary font-medium hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
