export const BRASILIA_TZ = "America/Sao_Paulo";

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BRASILIA_TZ,
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: BRASILIA_TZ });
}

/** Current time as ISO string (UTC — server stores UTC, display uses BRT). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** "HH:MM" in Brasília, for <input type="datetime-local"> defaults. */
export function nowBrasiliaLocalInput(withDate = false): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: BRASILIA_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date()).replace(" ", "T");
  return withDate ? parts : parts.slice(11, 16);
}

export function statusLabel(s: string): string {
  switch (s) {
    case "em_avaliacao": return "Em avaliação";
    case "aguardando_avaliacao": return "Aguardando";
    case "pronto_para_alta": return "Pronto para alta";
    case "alta": return "Alta realizada";
    default: return s;
  }
}

export function statusColor(s: string): string {
  switch (s) {
    case "pronto_para_alta": return "text-[color:var(--success)]";
    case "alta": return "text-muted-foreground";
    default: return "text-foreground";
  }
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

// Next evaluation default: 15 minutes after last evaluation
export function nextEvalFrom(iso: string, minutes = 15): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}
