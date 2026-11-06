import { NextResponse } from "next/server";
import { ErrorIA, MODELOS_LECTURA, generarJson } from "@/lib/ia/gemini";
import { ESQUEMA_LABORATORIO, PROMPT_LABORATORIO } from "@/lib/ia/prompts";
import { separarProhibidas, type ValorLab } from "@/lib/laboratorio";
import { crearClienteServidor } from "@/lib/supabase/server";

export const maxDuration = 120;

const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAXIMO = 4 * 1024 * 1024; // Vercel rechaza peticiones de más de 4,5 MB

const falla = (error: string, status: number) => NextResponse.json({ error }, { status });

// Recibe la foto o PDF, la IA extrae los valores y se guardan sin pruebas prohibidas.
export async function POST(request: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return falla("Su sesión expiró. Ingrese de nuevo.", 401);

  const form = await request.formData();
  const preempleoId = String(form.get("preempleoId") ?? "");
  const archivo = form.get("archivo");

  if (!(archivo instanceof File)) return falla("No se recibió ningún archivo.", 400);
  if (!TIPOS.includes(archivo.type)) return falla("Suba una foto (JPG, PNG, WEBP) o un PDF.", 400);
  if (archivo.size > MAXIMO) return falla("El archivo pesa más de 4 MB. Suba uno más liviano.", 400);

  // RLS: si no es el médico asignado, esta consulta no devuelve nada.
  const { data: preempleo } = await supabase
    .from("preempleos")
    .select("id, estado, medico_id")
    .eq("id", preempleoId)
    .maybeSingle();

  if (!preempleo || preempleo.medico_id !== user.id) return falla("Preempleo no encontrado.", 404);
  if (preempleo.estado !== "en_valoracion") return falla("Inicie la consulta antes de subir laboratorios.", 409);

  const bytes = Buffer.from(await archivo.arrayBuffer());

  let extraido: { valores: ValorLab[]; pruebas_prohibidas: string[] };
  try {
    extraido = await generarJson({
      instrucciones: PROMPT_LABORATORIO,
      esquema: ESQUEMA_LABORATORIO,
      modelos: MODELOS_LECTURA,
      partes: [
        { inlineData: { mimeType: archivo.type, data: bytes.toString("base64") } },
        { text: "Transcribe este resultado de laboratorio." },
      ],
    });
  } catch (error) {
    if (error instanceof ErrorIA) {
      return falla("La IA no respondió. Intente de nuevo o ingrese los valores a mano.", 503);
    }
    throw error;
  }

  const { permitidos, descartadas } = separarProhibidas(extraido.valores, extraido.pruebas_prohibidas);

  // Si el documento trae una prueba prohibida, el archivo no se conserva.
  let archivoPath: string | null = null;
  if (descartadas.length === 0) {
    const extension = archivo.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
    archivoPath = `${preempleoId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from("laboratorios")
      .upload(archivoPath, bytes, { contentType: archivo.type });
    if (error) {
      console.error("No se pudo guardar el archivo:", error.message);
      archivoPath = null;
    }
  }

  // Subir un archivo nuevo reemplaza el resultado anterior.
  await supabase.from("resultados_lab").delete().eq("preempleo_id", preempleoId);
  const { error } = await supabase.from("resultados_lab").insert({
    preempleo_id: preempleoId,
    archivo_path: archivoPath,
    valores: permitidos,
    pruebas_descartadas: descartadas,
  });
  if (error) return falla("No se pudieron guardar los valores. Intente de nuevo.", 500);

  return NextResponse.json({ valores: permitidos, descartadas });
}
