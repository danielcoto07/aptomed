"use server";

import { revalidatePath } from "next/cache";
import type { Correcciones } from "@/lib/historia";
import { separarProhibidas, type ValorLab } from "@/lib/laboratorio";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Aptitud } from "@/lib/tipos";

// Arranca el cronómetro y pasa el preempleo a "en valoración".
// RLS garantiza que solo el médico asignado pueda hacerlo.
export async function iniciarConsulta(preempleoId: string) {
  const supabase = await crearClienteServidor();
  await supabase
    .from("preempleos")
    .update({ estado: "en_valoracion", inicio_consulta: new Date().toISOString() })
    .eq("id", preempleoId)
    .eq("estado", "listo_para_consulta");
  revalidatePath(`/medico/preempleo/${preempleoId}`);
}

// Corrige un dato de la historia. La base guarda la respuesta original, la fecha y al médico.
export async function corregirHistoria(preempleoId: string, ruta: string, valor: string) {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("corregir_historia", {
    p_preempleo_id: preempleoId,
    p_ruta: ruta,
    p_valor: valor,
  });
  if (error) return { error: error.message };
  return { correcciones: data as Correcciones };
}

// Guarda las correcciones del médico. Tampoco a mano se pueden registrar pruebas prohibidas.
export async function guardarValores(preempleoId: string, valores: ValorLab[]) {
  const supabase = await crearClienteServidor();
  const { permitidos, descartadas } = separarProhibidas(
    valores.filter((v) => v.nombre.trim()).map((v) => ({ ...v, ilegible: v.ilegible && !v.valor })),
  );

  const { data: actual } = await supabase
    .from("resultados_lab")
    .select("id, pruebas_descartadas, archivo_path")
    .eq("preempleo_id", preempleoId)
    .maybeSingle();

  const todasDescartadas = [...new Set([...(actual?.pruebas_descartadas ?? []), ...descartadas])];

  const { error } = actual
    ? await supabase
        .from("resultados_lab")
        .update({ valores: permitidos, pruebas_descartadas: todasDescartadas })
        .eq("id", actual.id)
    : await supabase
        .from("resultados_lab")
        .insert({ preempleo_id: preempleoId, valores: permitidos, pruebas_descartadas: todasDescartadas });

  if (error) return { error: "No se pudieron guardar los cambios." };

  // Si aparece una prueba prohibida, tampoco se conserva el documento original.
  // La fila ya pasó por RLS; borrar del bucket requiere la clave del servidor.
  if (descartadas.length > 0 && actual?.archivo_path) {
    await crearClienteAdmin().storage.from("laboratorios").remove([actual.archivo_path]);
    await supabase.from("resultados_lab").update({ archivo_path: null }).eq("id", actual.id);
  }

  return { valores: permitidos, descartadas: todasDescartadas };
}

type DatosDictamen = { texto: string; restricciones: string; examen: string };

// Guarda lo que el médico va escribiendo (sin firmar).
export async function guardarDictamen(preempleoId: string, { texto, restricciones, examen }: DatosDictamen) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("dictamenes").upsert({
    preempleo_id: preempleoId,
    texto_final: texto,
    examen_fisico: examen.trim() || null,
    restricciones_funcionales: restricciones.trim() || null,
    actualizado_en: new Date().toISOString(),
  });
  return { error: error ? "No se pudo guardar el dictamen." : null };
}

// La firma ocurre en la base de datos (firmar_dictamen): valida al médico, emite el certificado y detiene el cronómetro.
export async function firmar(
  preempleoId: string,
  datos: DatosDictamen & { aptitud: Aptitud; faltanLaboratorios: boolean },
) {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("firmar_dictamen", {
    p_preempleo_id: preempleoId,
    p_texto_final: datos.texto,
    p_examen_fisico: datos.examen,
    p_aptitud: datos.aptitud,
    p_restricciones:
      datos.aptitud === "apto_con_restricciones" || datos.aptitud === "no_apto" ? datos.restricciones : null,
    p_faltan_laboratorios: datos.aptitud === "apto" && datos.faltanLaboratorios,
  });
  if (error) return { error: error.message };

  revalidatePath(`/medico/preempleo/${preempleoId}`);
  revalidatePath("/medico");
  return { error: null };
}
