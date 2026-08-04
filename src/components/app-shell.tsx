import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home, Users, ClipboardCheck, HeartPulse, Pill, Bell,
  FileText, Settings, LogOut, Menu, Activity, User,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";

type NavItem = { to: string; label: string; icon: React.ElementType };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/avaliacoes", label: "Avaliações", icon: ClipboardCheck },
  { to: "/sinais-vitais", label: "Sinais Vitais", icon: HeartPulse },
  { to: "/medicacoes", label: "Medicações", icon: Pill },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pacientes": "Pacientes",
  "/avaliacoes": "Avaliação Aldrete",
  "/sinais-vitais": "Sinais Vitais",
  "/medicacoes": "Medicações",
  "/alertas": "Alertas",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
};

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const title = Object.keys(TITLES).find((k) => pathname.startsWith(k));
  const pageTitle = title ? TITLES[title] : "RPA Monitor";

  const { data: profile } = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return { ...p, roles: roles?.map((r) => r.role) ?? [] };
    },
    staleTime: 5 * 60_000,
  });

  const { data: unreadAlerts = 0 } = useQuery({
    queryKey: ["unread-alerts"],
    queryFn: async () => {
      const { count } = await supabase.from("alerts").select("*", { count: "exact", head: true }).eq("lido", false);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  // Realtime updates for unread alert badge (replaces polling)
  useEffect(() => {
    const ch = supabase.channel("shell-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" },
        () => { qc.invalidateQueries({ queryKey: ["unread-alerts"] }); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const roleLabel = (() => {
    const r = profile?.roles?.[0];
    if (r === "admin") return "Administrador";
    if (r === "anestesista") return "Anestesista";
    if (r === "tecnico") return "Técnico";
    return "Enfermagem";
  })();

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static z-40 h-screen bg-card border-r border-border flex flex-col transition-all",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "left-0" : "-left-full lg:left-0",
        )}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-2.5 min-w-0">
            <Activity className="h-6 w-6 shrink-0" />
            {!collapsed && <span className="font-semibold text-base truncate">RPA Monitor</span>}
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium mb-0.5 transition-colors",
                  active
                    ? "bg-sidebar-active text-sidebar-active-foreground"
                    : "text-sidebar-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-2">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-muted"
          >
            <LogOut className="h-[18px] w-[18px]" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
              aria-label="Recolher menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base md:text-lg font-semibold text-foreground">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/alertas" className="relative p-2 rounded-md hover:bg-muted" aria-label="Alertas">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-danger text-danger-foreground text-[10px] font-semibold flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline">{roleLabel}</span>
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <PageTransition variant="slide-up">{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
