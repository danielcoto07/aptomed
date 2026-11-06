import type { EstadoPreempleo } from "./tipos.ts";

// Sin mayúsculas ni tildes: "jose" encuentra a "José".
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function coincideTexto(busqueda: string, ...campos: (string | null | undefined)[]) {
  const q = normalizar(busqueda);
  return !q || campos.some((c) => normalizar(c ?? "").includes(q));
}

export const ESTADOS_FILTRO: EstadoPreempleo[] = [
  "listo_para_consulta",
  "en_valoracion",
  "pendiente_candidato",
  "firmado",
];

export const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
