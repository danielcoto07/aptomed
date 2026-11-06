// Tipos y etiquetas en español compartidos por toda la app.
// Deben coincidir con los enum de supabase/01_tablas.sql, salvo "aplazado":
// sigue en la base pero la app no lo usa, porque no existe en el formato de la Dra.

export type Rol = "medico" | "rrhh";

export type EstadoPreempleo = "pendiente_candidato" | "listo_para_consulta" | "en_valoracion" | "firmado";

export type Aptitud = "apto" | "apto_con_restricciones" | "no_apto";

export const ETIQUETA_ESTADO: Record<EstadoPreempleo, string> = {
  pendiente_candidato: "Esperando al candidato",
  listo_para_consulta: "Listo para consulta",
  en_valoracion: "En valoración",
  firmado: "Firmado",
};

// Etiquetas del "Informe final a la empresa" real. En la base siguen los valores del enum.
export const ETIQUETA_APTITUD: Record<Aptitud, string> = {
  apto: "Compatible",
  apto_con_restricciones: "Compatible con seguimiento médico",
  no_apto: "No compatible",
};

// Texto del "Informe Final a la Empresa" real. No lleva datos clínicos.
export const INTRO_INFORME =
  "De acuerdo a la información brindada por el candidato, el examen físico realizado y las pruebas especiales, se ha encontrado que:";

export const ORDEN_INFORME: Aptitud[] = ["apto", "apto_con_restricciones", "no_apto"];

export const OPCIONES_INFORME: Record<Aptitud, { letra: string; titulo: string; texto: string; cierre?: string }> = {
  apto: {
    letra: "A",
    titulo: "Es compatible para el puesto de trabajo",
    texto: "Desde el punto de vista médico el candidato no presenta problemas para el desempeño del puesto solicitado.",
  },
  apto_con_restricciones: {
    letra: "B",
    titulo: "Compatible con seguimiento médico",
    texto: "Su condición actual es estable, pero debe tener un control médico estricto, siguiendo las recomendaciones siguientes:",
    cierre: "La contratación queda a criterio de la empresa.",
  },
  no_apto: {
    letra: "C",
    titulo: "No compatible",
    texto: "Para desempeñar el trabajo por las siguientes razones:",
  },
};

// Plantilla de la nota de preempleo de la Dra. El médico la carga y ajusta lo encontrado.
export const PLANTILLA_EXAMEN_FISICO = [
  "Buen estado general, signos vitales estables.",
  "AV 20/20.",
  "ORL: oídos normal, orofaringe sana.",
  "Mucosa oral normal.",
  "Ruidos cardiacos rítmicos sin soplos agregados.",
  "Campos pulmonares limpios, MV conservado.",
  "Fuerza y tono muscular conservados.",
  "Marcha estable y coordinación sin dismetría.",
].join("\n");

// Formato de fecha y hora de Costa Rica.
export function formatearFecha(iso: string | null, conHora = true) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    ...(conHora ? { timeStyle: "short" } : {}),
    timeZone: "America/Costa_Rica",
  }).format(new Date(iso));
}

// Fecha completa del certificado, por ejemplo "martes, 3 de noviembre de 2026".
export function formatearFechaLarga(iso: string) {
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "full", timeZone: "America/Costa_Rica" }).format(new Date(iso));
}

export function formatearDuracion(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
