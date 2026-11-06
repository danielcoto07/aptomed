// Convierte lo que envía el candidato en la historia que lee el médico (historia.tsx).
// Solo pasan los campos conocidos, con largo limitado.

export const OPCIONES = {
  sexo: ["Masculino", "Femenino", "Otro"],
  estado_civil: ["Soltero(a)", "Casado(a)", "Unión libre", "Divorciado(a)", "Viudo(a)"],
  escolaridad: [
    "Primaria incompleta",
    "Primaria completa",
    "Secundaria incompleta",
    "Secundaria completa",
    "Técnico",
    "Universitaria",
  ],
  lateralidad: ["Diestro", "Zurdo", "Ambidiestro"],
} as const;

const NINGUNO = "Ninguno";
const ESTADO_VACUNA = ["Al día", "No recuerda", "No vacunado"];

export type CampoPregunta = Exclude<keyof RespuestasCandidato, "empleos" | "ha_trabajado" | "edad" | "sexo" | "estado_civil" | "escolaridad" | "lateralidad">;
export type Pregunta = { campo: CampoPregunta; titulo: string; ayuda?: string; opciones: string[]; libre: string };

// Menú con lo más común; "libre" abre un campo para escribir lo que no esté en la lista.
export const PREGUNTAS_SALUD: Pregunta[] = [
  { campo: "patologicos", titulo: "Enfermedades", opciones: [NINGUNO, "Presión alta", "Diabetes", "Asma"], libre: "Otra, escribir" },
  { campo: "quirurgicos", titulo: "Cirugías", opciones: [NINGUNO], libre: "Sí, escribir cuál" },
  { campo: "traumaticos", titulo: "Golpes o fracturas importantes", opciones: [NINGUNO], libre: "Sí, escribir cuál" },
  { campo: "alergias", titulo: "Alergias", opciones: [NINGUNO], libre: "Sí, escribir cuál" },
  { campo: "medicamentos", titulo: "Medicamentos que toma", opciones: [NINGUNO], libre: "Sí, escribir cuál" },
  { campo: "hospitalizaciones", titulo: "Hospitalizaciones", opciones: [NINGUNO], libre: "Sí, escribir motivo" },
  { campo: "familiares", titulo: "Enfermedades en su familia", ayuda: "Padres o hermanos.", opciones: [NINGUNO, "Presión alta", "Diabetes", "No sabe"], libre: "Otra, escribir" },
];

export const PREGUNTAS_HABITOS: Pregunta[] = [
  { campo: "tabaco", titulo: "¿Fuma?", opciones: ["No fuma", "Dejó de fumar", "Ocasionalmente", "Todos los días"], libre: "Otro, escribir" },
  { campo: "alcohol", titulo: "¿Consume alcohol?", opciones: ["No consume", "Ocasionalmente", "Cada semana", "Todos los días"], libre: "Otro, escribir" },
  { campo: "actividad_fisica", titulo: "Actividad física", opciones: ["No realiza", "1 o 2 veces por semana", "3 o más veces por semana"], libre: "Otro, escribir" },
  { campo: "sueno", titulo: "Horas de sueño por noche", opciones: ["Menos de 6 horas", "De 6 a 8 horas", "Más de 8 horas"], libre: "Otro, escribir" },
  { campo: "vertigo_o_mareos", titulo: "Vértigo o mareos", opciones: [NINGUNO, "Ocasionales", "Frecuentes"], libre: "Otro, escribir" },
  { campo: "dolor_de_espalda", titulo: "Dolor de espalda", opciones: [NINGUNO, "Ocasional", "Frecuente"], libre: "Otro, escribir" },
  { campo: "vision", titulo: "Problemas de visión", opciones: [NINGUNO, "Usa anteojos o lentes de contacto"], libre: "Otro, escribir" },
  { campo: "audicion", titulo: "Problemas de audición", opciones: [NINGUNO, "Usa audífono"], libre: "Otro, escribir" },
  { campo: "otros", titulo: "Otros síntomas", opciones: [NINGUNO], libre: "Sí, escribir cuál" },
  { campo: "tetanos", titulo: "Vacuna de tétanos", opciones: ESTADO_VACUNA, libre: "Escribir el año" },
  { campo: "hepatitis_b", titulo: "Vacuna de hepatitis B", opciones: ESTADO_VACUNA, libre: "Escribir el año" },
];

export const OPCIONES_EMPLEO = {
  riesgos: { opciones: [NINGUNO, "Ruido", "Cargas pesadas", "Alturas", "Químicos"], libre: "Otro, escribir" },
  accidentes: { opciones: [NINGUNO], libre: "Sí, escribir cuál" },
};

export type EmpleoCandidato = {
  empresa: string;
  puesto: string;
  tiempo: string;
  riesgos: string;
  accidentes: string;
};

export type RespuestasCandidato = {
  edad: string;
  sexo: string;
  estado_civil: string;
  escolaridad: string;
  lateralidad: string;
  patologicos: string;
  quirurgicos: string;
  traumaticos: string;
  alergias: string;
  medicamentos: string;
  hospitalizaciones: string;
  familiares: string;
  ha_trabajado: string;
  empleos: EmpleoCandidato[];
  tabaco: string;
  alcohol: string;
  actividad_fisica: string;
  sueno: string;
  vertigo_o_mareos: string;
  dolor_de_espalda: string;
  vision: string;
  audicion: string;
  otros: string;
  tetanos: string;
  hepatitis_b: string;
};

const MAX_TEXTO = 600;
const MAX_EMPLEOS = 6;

const NEGATIVO = /^(n\/?a|no aplica|nada|no tengo|no|ningun[oa]?s?( conocid[oa]s?| de uso habitual)?)\.?$/i;

// "ninguna", "N/A" y "nada" significan lo mismo: el médico siempre lee "Ninguno".
export const esNegativo = (v: string) => NEGATIVO.test(v.trim());

const limpiar = (v: unknown) => {
  const texto = typeof v === "string" ? v.trim().slice(0, MAX_TEXTO) : "";
  if (!texto) return "";
  return esNegativo(texto) ? NINGUNO : texto[0].toUpperCase() + texto.slice(1);
};
const oNinguno = (v: unknown) => limpiar(v) || NINGUNO;
const oSinDato = (v: unknown) => limpiar(v) || "No indica";

export const TOKEN_VALIDO = /^[0-9a-f]{64}$/;

export function errorDatosGenerales(r: Partial<RespuestasCandidato>): string | null {
  const edad = Number(r.edad);
  if (!Number.isInteger(edad) || edad < 15 || edad > 90) return "Escriba su edad en años.";
  for (const campo of ["sexo", "estado_civil", "escolaridad", "lateralidad"] as const) {
    if (!(OPCIONES[campo] as readonly string[]).includes(r[campo] ?? "")) {
      return "Complete todos los datos generales.";
    }
  }
  return null;
}

const faltante = (r: Partial<RespuestasCandidato>, preguntas: Pregunta[]) => {
  const p = preguntas.find(({ campo }) => !limpiar(r[campo]));
  return p ? `Falta responder: ${p.titulo}` : null;
};

// Cada paso se valida en el celular y otra vez en el servidor.
export function errorPaso(r: Partial<RespuestasCandidato>, paso: number): string | null {
  if (paso === 0) return errorDatosGenerales(r);
  if (paso === 1) return faltante(r, PREGUNTAS_SALUD);
  if (paso === 3) return faltante(r, PREGUNTAS_HABITOS);

  if (r.ha_trabajado === "No") return null;
  if (r.ha_trabajado !== "Sí") return "Indique si ha trabajado antes.";
  const empleos = Array.isArray(r.empleos) ? r.empleos : [];
  const completos = empleos.length > 0 && empleos.every((e) => Object.keys(e ?? {}).length === 5 && Object.values(e).every(limpiar));
  return completos ? null : "Complete todos los datos de cada trabajo.";
}

export function errorRespuestas(r: Partial<RespuestasCandidato>): string | null {
  for (const paso of [0, 1, 2, 3]) {
    const error = errorPaso(r, paso);
    if (error) return error;
  }
  return null;
}

export function armarAntecedentes(r: Partial<RespuestasCandidato>) {
  const empleos = (r.ha_trabajado !== "No" && Array.isArray(r.empleos) ? r.empleos : [])
    .slice(0, MAX_EMPLEOS)
    .filter((e) => limpiar(e?.empresa) || limpiar(e?.puesto))
    .map((e) => ({
      empresa: oSinDato(e.empresa),
      puesto: oSinDato(e.puesto),
      tiempo: oSinDato(e.tiempo),
      riesgos: oSinDato(e.riesgos),
      accidentes: oNinguno(e.accidentes),
    }));

  return {
    datos_generales: {
      edad: Number(r.edad),
      sexo: limpiar(r.sexo),
      estado_civil: limpiar(r.estado_civil),
      escolaridad: limpiar(r.escolaridad),
      lateralidad: limpiar(r.lateralidad),
    },
    antecedentes_personales: {
      patologicos: [oNinguno(r.patologicos)],
      quirurgicos: [oNinguno(r.quirurgicos)],
      traumaticos: [oNinguno(r.traumaticos)],
      alergias: [oNinguno(r.alergias)],
      medicamentos: [oNinguno(r.medicamentos)],
      hospitalizaciones: [oNinguno(r.hospitalizaciones)],
    },
    antecedentes_familiares: [oNinguno(r.familiares)],
    antecedentes_laborales: empleos.length ? empleos : ["Sin experiencia laboral previa"],
    habitos: {
      tabaco: oSinDato(r.tabaco),
      alcohol: oSinDato(r.alcohol),
      actividad_fisica: oSinDato(r.actividad_fisica),
      sueno: oSinDato(r.sueno),
    },
    sintomas_actuales: {
      vertigo_o_mareos: oNinguno(r.vertigo_o_mareos),
      dolor_de_espalda: oNinguno(r.dolor_de_espalda),
      vision: oSinDato(r.vision),
      audicion: oSinDato(r.audicion),
      otros: oNinguno(r.otros),
    },
    vacunas: { tetanos: oSinDato(r.tetanos), hepatitis_b: oSinDato(r.hepatitis_b) },
  };
}

// La hora la marca el navegador al aceptar; si no es creíble, se usa la del servidor.
export function fechaConsentimiento(valor: unknown, ahora = new Date()) {
  const fecha = new Date(typeof valor === "string" ? valor : NaN);
  const diferencia = ahora.getTime() - fecha.getTime();
  const creible = diferencia >= 0 && diferencia < 24 * 60 * 60 * 1000;
  return (creible ? fecha : ahora).toISOString();
}
