import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivePatient = {
  id: string;
  nome: string;
  idade: number | null;
  sexo: string | null;
  prontuario: string | null;
  procedimento: string | null;
  cirurgiao: string | null;
  anestesista: string | null;
  entrada_rpa: string | null;
  proxima_avaliacao: string | null;
  status: string;
};

/**
 * Lista compartilhada de pacientes ativos (não recebeu alta).
 * Query key único → dedup entre páginas (sinais vitais, medicações, avaliações).
 */
export function useActivePatients() {
  return useQuery<ActivePatient[]>({
    queryKey: ["active-patients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, nome, idade, sexo, prontuario, procedimento, cirurgiao, anestesista, entrada_rpa, proxima_avaliacao, status")
        .neq("status", "alta")
        .order("entrada_rpa");
      return data ?? [];
    },
  });
}
