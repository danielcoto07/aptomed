import { NextResponse } from "next/server";
import { ErrorIA, MODELOS_REDACCION, generarJson } from "@/lib/ia/gemini";
import { ESQUEMA_DICTAMEN, PROMPT_DICTAMEN } from "@/lib/ia/prompts";
import { aplicarCorrecciones, type Correcciones } from "@/lib/historia";
import { separarProhibidas, type ValorLab } from "@/lib/laboratorio";
import { crearClienteServidor } from "@/lib/supabase/server";
import { ETIQUETA_APTITUD, type Aptitud } from "@/lib/tipos";

export const maxDuration = 120;

const falla = (error: string, status: number) => NextResponse.json({ error }, { status });

type Respuesta = {
  dictamen: string;
  aptitud_propuesta: Aptitud;
  restricciones_funcionales: string[];
  requiere_valoracion: string[];
};

// Con la historia y los laboratorios, la IA propone un borrador. Nunca firma ni elige la aptitud.
export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return falla("Su sesión expiró. Ingrese de nuevo.", 401);

  const { preempleoId, examenFisico } = await request.json();
  const examen = String(examenFisico ?? "").trim();

  const { data: p } = await supabase
    .from("preempleos")
    .select("id, puesto, estado, medico_id, historias(antecedentes, correcciones), resultados_lab(valores)")
    .eq("id", preempleoId)
    .maybeSingle<{
      id: string;
      puesto: string;
      estado: string;
      medico_id: string;
      historias: { antecedentes: unknown; correcciones: Correcciones } | null;
      resultados_lab: { valores: ValorLab[] }[];
    }>();

  if (!p || p.medico_id !== user.id) return falla("Preempleo no encontrado.", 404);
  if (p.estado !== "en_valoracion") return falla("Inicie la consulta antes de generar el borrador.", 409);

  // Doble seguro: ninguna prueba prohibida llega al prompt.
  const { permitidos } = separarProhibidas(p.resultados_lab.flatMap((r) => r.valores));

  const datos = {
    puesto: p.puesto,
    historia: p.historias
      ? aplicarCorrecciones(p.historias.antecedentes, p.historias.correcciones)
      : "El candidato no ha llenado su historia.",
    examen_fisico: examen || "El médico todavía no ha registrado el examen físico.",
    laboratorios: permitidos.length ? permitidos : "No hay laboratorios cargados.",
  };

  let r: Respuesta;
  try {
    r = await generarJson<Respuesta>({
      instrucciones: PROMPT_DICTAMEN,
      esquema: ESQUEMA_DICTAMEN,
      modelos: MODELOS_REDACCION,
      partes: [{ text: `<datos>\n${JSON.stringify(datos, null, 2)}\n</datos>` }],
    });
  } catch (error) {
    if (error instanceof ErrorIA) {
      return falla("La IA no respondió. Intente de nuevo o redacte el dictamen a mano.", 503);
    }
    throw error;
  }

  const pendientes = r.requiere_valoracion.length
    ? `\n\nRequiere valoración médica:\n${r.requiere_valoracion.map((x) => `- ${x}`).join("\n")}`
    : "";
  const texto = `${r.dictamen}${pendientes}`;
  const propuesta = ETIQUETA_APTITUD[r.aptitud_propuesta];
  const restricciones = r.restricciones_funcionales.join("\n");

  const { error } = await supabase.from("dictamenes").upsert({
    preempleo_id: p.id,
    borrador_ia: `${texto}\n\nPropuesta de la IA: ${propuesta}`,
    texto_final: texto,
    examen_fisico: examen || null,
    restricciones_funcionales: restricciones || null,
    actualizado_en: new Date().toISOString(),
  });
  if (error) return falla("No se pudo guardar el borrador. Intente de nuevo.", 500);

  return NextResponse.json({ texto, restricciones, propuesta });
}
