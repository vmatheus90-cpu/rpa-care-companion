// Simple selected-patient store persisted in sessionStorage so the
// Aldrete / Sinais Vitais / Medicações pages know which patient to show.
import { useEffect, useState } from "react";

const KEY = "rpa.selectedPatientId";

export function getSelectedPatientId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function setSelectedPatientId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) sessionStorage.setItem(KEY, id);
  else sessionStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("rpa:selectedPatientChanged"));
}

export function useSelectedPatientId(): string | null {
  const [id, setId] = useState<string | null>(() => getSelectedPatientId());
  useEffect(() => {
    const h = () => setId(getSelectedPatientId());
    window.addEventListener("rpa:selectedPatientChanged", h);
    return () => window.removeEventListener("rpa:selectedPatientChanged", h);
  }, []);
  return id;
}
