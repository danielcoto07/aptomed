"use server";

import { TOKEN_VALIDO, armarAntecedentes, errorRespuestas, fechaConsentimiento, type RespuestasCandidato } from "@/lib/candidato";
import { crearClienteAdmin } from "@/lib/supabase/admin";

export type ResultadoEnvio = { ok: boolean; error: string | null };

export async function enviarHistoria(
  token: string,
  consentimientoEn: string,
  respuestas: RespuestasCandidato,
  declaraVeracidad: boolean,
): Promise<ResultadoEnvio> {
  if (!TOKEN_VALIDO.test(token)) return { ok: false, error: "Este enlace no es válido." };
  if (!consentimientoEn) return { ok: false, error: "Debe aceptar el consentimiento informado." };
  if (declaraVeracidad !== true) return { ok: false, error: "Debe aceptar la declaración de veracidad." };
  const invalido = errorRespuestas(respuestas);
  if (invalido) return { ok: false, error: invalido };

  const admin = crearClienteAdmin();

  // Gastar el token primero: si llegan dos envíos, solo uno lo consigue.
  const { data: orden, error: errorToken } = await admin
    .from("preempleos")
    .update({ token_usado_en: new Date().toISOString(), estado: "listo_para_consulta" })
    .eq("token_candidato", token)
    .eq("estado", "pendiente_candidato")
    .is("token_usado_en", null)
    .select("id")
    .maybeSingle();

  if (errorToken) return { ok: false, error: "No se pudo enviar. Intente de nuevo." };
  if (!orden) return { ok: false, error: "Este enlace ya fue utilizado." };

  const { error } = await admin.from("historias").insert({
    preempleo_id: orden.id,
    consentimiento_aceptado_en: fechaConsentimiento(consentimientoEn),
    antecedentes: armarAntecedentes(respuestas),
  });

  if (error) {
    // Devolver el enlace para que pueda reintentar sin perder el acceso.
    await admin
      .from("preempleos")
      .update({ token_usado_en: null, estado: "pendiente_candidato" })
      .eq("id", orden.id);
    return { ok: false, error: "No se pudo enviar. Intente de nuevo." };
  }

  return { ok: true, error: null };
}
