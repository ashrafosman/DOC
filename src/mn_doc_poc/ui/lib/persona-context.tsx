import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type PersonaId =
  | "consumer"
  | "super_viewer"
  | "engineer"
  | "domain_advisor"
  | "analyst";

const STORAGE_KEY = "doc_poc_persona";

interface PersonaContextValue {
  persona: PersonaId;
  setPersona: (p: PersonaId) => void;
}

const PersonaContext = createContext<PersonaContextValue>({
  persona: "consumer",
  setPersona: () => {},
});

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<PersonaId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as PersonaId) ?? "consumer";
  });

  const setPersona = (p: PersonaId) => {
    localStorage.setItem(STORAGE_KEY, p);
    setPersonaState(p);
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setPersonaState(stored as PersonaId);
  }, []);

  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  return useContext(PersonaContext);
}
