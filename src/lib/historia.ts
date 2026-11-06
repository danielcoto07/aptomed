// La respuesta del candidato no se cambia: las correcciones del médico se guardan aparte.

export type Valor = string | number | boolean | null | Valor[] | { [k: string]: Valor };

export type Correccion = { valor: string; corregido_en: string };
export type Correcciones = Record<string, Correccion>;

// Devuelve la historia vigente, sin modificar la respuesta original.
export function aplicarCorrecciones<T>(antecedentes: T, correcciones: Correcciones = {}): T {
  const historia = structuredClone(antecedentes) as Record<string, Valor>;

  for (const [ruta, { valor }] of Object.entries(correcciones)) {
    const partes = ruta.split(".");
    const ultima = partes.pop()!;
    let lugar: Valor = historia;
    for (const parte of partes) {
      lugar = (lugar as Record<string, Valor> | null)?.[parte] ?? null;
    }
    if (lugar !== null && typeof lugar === "object") (lugar as Record<string, Valor>)[ultima] = valor;
  }

  return historia as T;
}
