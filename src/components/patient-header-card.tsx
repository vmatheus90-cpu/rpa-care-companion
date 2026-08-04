import { User } from "lucide-react";

type Patient = {
  nome: string;
  idade: number | null;
  sexo: string | null;
  prontuario: string | null;
  entrada_rpa: string | null;
};

export function PatientHeaderCard({ patient }: { patient: Patient | null | undefined }) {
  if (!patient) {
    return (
      <div className="surface-card p-4 text-sm text-muted-foreground">
        Nenhum paciente selecionado. Escolha um leito em <span className="font-medium text-foreground">Pacientes</span> ou no <span className="font-medium text-foreground">Dashboard</span> para iniciar o registro.
      </div>
    );
  }
  const entrada = patient.entrada_rpa
    ? new Date(patient.entrada_rpa).toLocaleTimeString("pt-BR", {
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      })
    : "--:--";
  return (
    <div className="surface-card p-4 flex items-center gap-3 sm:gap-4">
      <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-muted flex items-center justify-center shrink-0">
        <User className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground truncate">{patient.nome}</div>
        <div className="text-xs sm:text-sm text-muted-foreground truncate">
          {patient.idade ?? "—"} anos • {patient.sexo ?? "—"} • {patient.prontuario ?? "—"}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">Entrada na RPA: {entrada}</div>
      </div>
    </div>
  );
}
