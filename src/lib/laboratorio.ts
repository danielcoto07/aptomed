// Reglas de los valores de laboratorio. Se usan en el servidor y en el navegador.

export type ValorLab = {
  nombre: string;
  valor: string | null;
  unidad: string | null;
  rango_referencia: string | null;
  fuera_de_rango: boolean;
  ilegible: boolean;
};

export type Evaluacion = "alto" | "bajo" | "normal" | "alterado" | null;

// Pruebas prohibidas. VIH: Ley 9797 y Código de Trabajo art. 70 inc. j.
// Embarazo: Código de Trabajo art. 70 inc. k (Ley 10211).
const PROHIBIDAS: { patron: RegExp; etiqueta: string; cita: string }[] = [
  {
    patron: /(^|[^a-z])(vih|hiv)(?![a-z])|\b(sida|aids|retrovirus)\b|inmunodeficiencia|\bp[\s-]?24\b/,
    etiqueta: "Prueba de VIH",
    cita: "Ley 9797; Código de Trabajo, art. 70 inc. j",
  },
  {
    patron:
      /embaraz|gestacion|gravindex|gravidez|prenez|gonadotrop|\b(beta[\s-]*|b[\s-]+)?hcg\b|\bbhcg\b|\bhgc\b|(subunidad|fraccion)\s+beta/,
    etiqueta: "Prueba de embarazo",
    cita: "Código de Trabajo, art. 70 inc. k, Ley 10211",
  },
];

// Cita legal de cada prueba descartada, para el aviso al médico.
export function citasLegales(descartadas: string[]) {
  const citas = PROHIBIDAS.filter((p) => descartadas.includes(p.etiqueta)).map((p) => p.cita);
  return (citas.length ? citas : PROHIBIDAS.map((p) => p.cita)).join(" · ");
}

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function pruebaProhibida(nombre: string): string | null {
  const limpio = normalizar(nombre);
  return PROHIBIDAS.find((p) => p.patron.test(limpio))?.etiqueta ?? null;
}

const numero = (texto: string) => {
  const m = texto.replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const SIN_HALLAZGO = /^(negativ[oa]s?|no reactiv[oa]s?|ausentes?|no detectad[oa]s?)$/;
const INTERVALO = /-?\d+(?:[.,]\d+)?\s*(?:-|–|a|hasta)\s*-?\d+(?:[.,]\d+)?/g;
const POR_SEXO = /\b(h|m|hombres?|mujer(es)?|masculino|femenino|varon(es)?)\b/;
const MILES = /\d\.\d{3}\b/;

// Compara el valor con su rango. Devuelve null si el rango no se puede interpretar:
// entonces se usa la marca que leyó la IA del documento.
export function evaluar(valor: string | null, rango: string | null): Evaluacion {
  if (!valor || !rango) return null;
  const r = rango.trim();
  const esNumero = /^[<>≤≥=\s]*-?\d/.test(valor.trim());

  if (!esNumero) {
    if (/\d/.test(r)) return null;
    const v = normalizar(valor).trim();
    const ref = normalizar(r).trim();
    return v === ref || (SIN_HALLAZGO.test(v) && SIN_HALLAZGO.test(ref)) ? "normal" : "alterado";
  }

  // Rangos distintos por sexo: el código no sabe cuál aplica.
  if ((r.match(INTERVALO) ?? []).length > 1 || POR_SEXO.test(normalizar(r))) return null;

  // "7200" contra "4.500 - 11.000": un punto de miles en un solo lado cambiaría la escala.
  if (MILES.test(valor) !== MILES.test(r)) return null;

  const v = numero(valor);
  if (v === null) return null;

  const entre = r.replace(/,/g, ".").match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|a|hasta)\s*(-?\d+(?:\.\d+)?)/);
  if (entre) {
    if (v < Number(entre[1])) return "bajo";
    if (v > Number(entre[2])) return "alto";
    return "normal";
  }

  const limite = numero(r);
  if (limite === null) return null;
  if (/^(<|≤|menor)/i.test(r)) return v <= limite ? "normal" : "alto";
  if (/^(>|≥|mayor)/i.test(r)) return v >= limite ? "normal" : "bajo";
  return null;
}

// Prueba que solo se registra como Positivo o Negativo (por ejemplo doping o heces).
export function esPositivoNegativo(v: ValorLab) {
  const valor = (v.valor ?? "").trim();
  return /^negativo$/i.test((v.rango_referencia ?? "").trim()) && (!valor || /^(positivo|negativo)$/i.test(valor));
}

// El rango se calcula con código cuando se puede: es más confiable que la opinión de la IA.
export function conRangoRevisado(v: ValorLab): ValorLab {
  const e = evaluar(v.valor, v.rango_referencia);
  return { ...v, fuera_de_rango: e === null ? v.fuera_de_rango : e !== "normal" };
}

// Separa las pruebas prohibidas. Del descarte solo queda la etiqueta, nunca el resultado.
export function separarProhibidas(valores: ValorLab[], detectadas: string[] = []) {
  const descartadas = new Set<string>();
  for (const nombre of detectadas) descartadas.add(pruebaProhibida(nombre) ?? "Prueba no permitida");

  const permitidos = valores.filter((v) => {
    const etiqueta = pruebaProhibida(v.nombre);
    if (etiqueta) descartadas.add(etiqueta);
    return !etiqueta;
  });

  return { permitidos: permitidos.map(conRangoRevisado), descartadas: [...descartadas] };
}
